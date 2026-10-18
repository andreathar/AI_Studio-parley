/** Inactive host factory for one explicitly authorized normalized database. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { evaluateCycleGate, type GateContracts } from './cycleGates';
import type { Command } from './store';
import { DatabaseSync } from 'node:sqlite';
import { validateSchema } from './schema';
import { WorkflowStore } from './store';
import { createWorkflowHandler } from './api';
import { createVerifiedResolver, type IdentityVerifier } from './identity';
import type { projectHandoff } from './compatibility';
import type { IsolatedInstance } from './isolatedServer';
export type DatabaseSelection = {
    schema: 'movies-workflow/selection/v1';
    dbPath: string;
    projectId: string;
    cycleId: string;
    expectedStateVersion: number;
    expectedGraphRevision: number;
    approvalRef: string;
};
/** Never creates, seeds, migrates or guesses a database, identity or approval. */
export async function startSelectedWorkflow(options: {
    selection: DatabaseSelection;
    authorizeSelection?: (selection: Readonly<DatabaseSelection>) => Promise<boolean>;
    trustedIssuer?: string;
    verifyIdentity?: IdentityVerifier;
    verifyReview?: (packet: ReturnType<typeof projectHandoff>) => Promise<boolean>;
    gateContext?: {
        evidenceRoot: string;
        contracts: GateContracts;
    };
    authorizeCommand?: (command: Command) => boolean;
    sessionRoutes?: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
    uiMode?: 'read' | 'session';
    port?: number;
}): Promise<IsolatedInstance> {
    const s = Object.freeze({ ...options.selection });
    const keys = 'approvalRef,cycleId,dbPath,expectedGraphRevision,expectedStateVersion,projectId,schema';
    if (Object.keys(s).sort().join() !== keys || s.schema !== 'movies-workflow/selection/v1' || !s.approvalRef?.trim() || !s.projectId?.trim() || !s.cycleId?.trim() || !Number.isSafeInteger(s.expectedStateVersion) || s.expectedStateVersion < 0 || s.expectedGraphRevision !== 1 || await options.authorizeSelection?.(s) !== true)
        throw Error('Explicit database selection authorization required');
    const port = options.port ?? 0;
    if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw Error('Local port refused');
    if (!path.isAbsolute(s.dbPath) || !fs.existsSync(s.dbPath) || fs.realpathSync(s.dbPath) !== path.resolve(s.dbPath) || !fs.statSync(s.dbPath).isFile() || fs.statSync(s.dbPath).nlink !== 1)
        throw Error('Selected database path refused');
    const before = fs.statSync(s.dbPath);
    const probe = new DatabaseSync(s.dbPath, { readOnly: true });
    try {
        validateSchema(probe);
        const c = probe.prepare('SELECT * FROM cycles WHERE id=?').get(s.cycleId) as any;
        if (!c || c.project_id !== s.projectId || c.state_version !== s.expectedStateVersion || c.graph_revision !== s.expectedGraphRevision || c.handoff_policy !== 'movies/handoff/v1' || c.status === 'archived')
            throw Error('Selected cycle identity, revision or policy mismatch');
    }
    finally {
        probe.close();
    }
    const store = new WorkflowStore(s.dbPath, { migrate: false });
    let server: ReturnType<typeof createServer> | undefined;
    try {
        const current = fs.statSync(s.dbPath), snapshot = store.snapshot(s.cycleId);
        if (current.dev !== before.dev || current.ino !== before.ino || snapshot.projectId !== s.projectId || snapshot.stateVersion !== s.expectedStateVersion || snapshot.graphRevision !== s.expectedGraphRevision || snapshot.handoffPolicy !== 'movies/handoff/v1')
            throw Error('Selected database changed while opening');
        const resolveActor = createVerifiedResolver({ store, projectId: s.projectId, cycleId: s.cycleId, trustedIssuer: options.trustedIssuer ?? '', verify: options.verifyIdentity });
        const api = createWorkflowHandler({ store, cycleId: s.cycleId, resolveActor, verifyReview: options.verifyReview, authorizeCommand: options.authorizeCommand, evaluateGate: options.gateContext ? async (receiptId, gate) => evaluateCycleGate({ snapshot: store.snapshot(s.cycleId), receiptId, gate, ...options.gateContext! }) : undefined });
        const module = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'view.mjs'));
        let bootstrap = `import {createWorkflowClient,mountWorkflowView} from '/workflow-view.mjs';\nconst client=createWorkflowClient(${JSON.stringify({ baseUrl: '/api/workflow/v1/cycles/' + s.cycleId, projectId: s.projectId, cycleId: s.cycleId })});\nmountWorkflowView(document.getElementById('root'),client);`;
        if (options.uiMode === 'session')
            bootstrap = `import {mountSessionView} from '/session-view.mjs';\nmountSessionView(document.getElementById('root'),${JSON.stringify({ baseUrl: '/api/workflow/v1/cycles/' + s.cycleId, projectId: s.projectId, cycleId: s.cycleId })});`;
        const assets = new Map<string, [
            string,
            string | Buffer
        ]>([
            ['/', ['text/html; charset=utf-8', '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Movies — ciclo selecionado</title><link rel="stylesheet" href="/workflow.css"><body><p>CICLO SELECIONADO · SQLITE · IDENTIDADE VERIFICADA EXIGIDA</p><div id="root">Carregando…</div><script type="module" src="/bootstrap.mjs"></script></body></html>']],
            ['/bootstrap.mjs', ['text/javascript', bootstrap]], ['/workflow-view.mjs', ['text/javascript', module]],
            ['/workflow.css', ['text/css', 'body{background:#10141c;color:#eef1fa;font:15px system-ui;margin:3vw}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #364159;padding:12px}p{color:#bdc9df}th{color:#8fbaff}button{background:#1b426c;color:white;border:1px solid #6a8ab8;padding:10px;border-radius:6px}']]
        ]);
        if (options.uiMode === 'session')
            assets.set('/session-view.mjs', ['text/javascript', fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'session-view.mjs'))]);
        server = createServer((req, res) => {
            const host = `127.0.0.1:${req.socket.localPort}`;
            const document = req.url === '/' && req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document' && !req.headers.origin;
            if (!['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`) || !['none', 'same-origin'].includes(String(req.headers['sec-fetch-site'] ?? 'none')) && !document) {
                res.writeHead(403);
                res.end();
                return;
            }
            if (req.url?.startsWith('/api/')) {
                void (async () => { try {
                    if (req.url?.startsWith('/api/workflow/v1/cycles/' + s.cycleId + '/session/') && await options.sessionRoutes?.(req, res))
                        return;
                    await api(req, res);
                }
                catch {
                    if (!res.headersSent)
                        res.writeHead(409);
                    res.end();
                } })();
                return;
            }
            const asset = assets.get(req.url ?? '');
            if (req.method !== 'GET' || !asset) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { 'Content-Type': asset[0], 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin' });
            res.end(asset[1]);
        });
        server.requestTimeout = 5000;
        server.headersTimeout = 5000;
        await new Promise<void>((resolve, reject) => { server!.once('error', reject); server!.listen(port, '127.0.0.1', resolve); });
        const address = server.address();
        if (!address || typeof address === 'string')
            throw Error('Local listener unavailable');
        let closed = false;
        const owned = server;
        return { url: `http://127.0.0.1:${address.port}/`, cycleId: s.cycleId, server, store, close: async () => {
                if (closed)
                    return;
                closed = true;
                owned.closeAllConnections();
                await new Promise<void>(resolve => owned.close(() => resolve()));
                store.close();
            } };
    }
    catch (error) {
        server?.closeAllConnections();
        if (server?.listening)
            await new Promise<void>(resolve => server!.close(() => resolve()));
        store.close();
        throw error;
    }
}
