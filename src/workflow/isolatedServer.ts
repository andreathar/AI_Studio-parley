/** Opt-in synthetic instance: actual UI -> API -> normalized SQLite, read-only HTTP. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { WorkflowStore } from './store';
import { createWorkflowHandler } from './api';
import { createIsolatedPreview } from './preview';
export type IsolatedInstance = {
    url: string;
    cycleId: string;
    store: WorkflowStore;
    server: Server;
    close(): Promise<void>;
};
function assertFreshWorkspace(workspace: string): void {
    if (!path.isAbsolute(workspace) || fs.existsSync(workspace) || fs.realpathSync(path.dirname(workspace)) !== path.resolve(path.dirname(workspace)))
        throw Error('New non-symlink workspace required');
    const codeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    if (workspace === codeRoot || workspace.startsWith(codeRoot + path.sep))
        throw Error('Isolated state must be outside the application checkout');
    let ancestor = path.dirname(workspace);
    while (true) {
        if (ancestor !== os.homedir() && fs.existsSync(path.join(ancestor, '.git')) && ['workspace.json', 'package.json', 'pyproject.toml'].some(name => fs.existsSync(path.join(ancestor, name))))
            throw Error('Isolated state must be outside target repositories');
        const parent = path.dirname(ancestor);
        if (parent === ancestor)
            break;
        ancestor = parent;
    }
}
/** Always creates its own synthetic data; accepts no existing database or identity. */
export async function startIsolatedWorkflow(options: {
    workspace: string;
    port?: number;
}): Promise<IsolatedInstance> {
    const port = options.port ?? 0;
    if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw Error('Port refused');
    assertFreshWorkspace(options.workspace);
    const preview = await createIsolatedPreview(options.workspace);
    const cycleId = String(preview.cycleId);
    const store = new WorkflowStore(path.join(options.workspace, 'workflow-v2.sqlite3'));
    const api = createWorkflowHandler({ store, cycleId, resolveActor: () => ({ actorId: 'preview-producer', readOnly: true }) });
    const module = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'view.mjs'));
    const bootstrap = `import {createWorkflowClient,mountWorkflowView} from '/workflow-view.mjs';\nconst client=createWorkflowClient({baseUrl:${JSON.stringify('/api/workflow/v1/cycles/' + cycleId)},projectId:'movies-preview-only',cycleId:${JSON.stringify(cycleId)}});\nmountWorkflowView(document.getElementById('root'),client);`;
    const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Movies — instância isolada</title><link rel="stylesheet" href="/workflow.css"></head><body><p class="banner">INSTÂNCIA SINTÉTICA · HTTP SOMENTE LEITURA · BANCO ATIVO PRESERVADO</p><div id="root">Carregando API normalizada…</div><script type="module" src="/bootstrap.mjs"></script></body></html>';
    const assets = new Map<string, [
        string,
        string | Buffer
    ]>([['/', ['text/html; charset=utf-8', html]], ['/bootstrap.mjs', ['text/javascript', bootstrap]], ['/workflow-view.mjs', ['text/javascript', module]], ['/workflow.css', ['text/css', 'body{background:#10141c;color:#eef1fa;font:15px system-ui;margin:3vw}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #364159;padding:12px}p{color:#bdc9df}th,.banner{color:#8fbaff}button{background:#1b426c;color:white;border:1px solid #6a8ab8;padding:10px;border-radius:6px}']]]);
    const server = createServer((req, res) => {
        const host = `127.0.0.1:${req.socket.localPort}`;
        const document = req.url === '/' && req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document' && !req.headers.origin;
        if (!['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`) || !['none', 'same-origin'].includes(String(req.headers['sec-fetch-site'] ?? 'none')) && !document) {
            res.writeHead(403);
            res.end();
            return;
        }
        if (req.url?.startsWith('/api/')) {
            void api(req, res);
            return;
        }
        const asset = assets.get(req.url ?? '');
        if (req.method !== 'GET' || !asset) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': asset[0], 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin' });
        res.end(asset[1]);
    });
    server.requestTimeout = 5000;
    server.headersTimeout = 5000;
    try {
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve()); });
    }
    catch (error) {
        store.close();
        throw error;
    }
    const address = server.address();
    if (!address || typeof address === 'string') {
        store.close();
        throw Error('Local listener unavailable');
    }
    let closed = false;
    return { url: `http://127.0.0.1:${address.port}/`, cycleId, store, server, close: async () => { if (closed)
            return; closed = true; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close(); } };
}
