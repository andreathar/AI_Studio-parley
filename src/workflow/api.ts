/** Inactive, local-only adapter. A trusted host must supply authenticated identity. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WorkflowStore, WorkflowError, type Command } from './store';
import type { GateName } from './cycleGates';
import { projectLegacyRead, projectHandoff } from './compatibility';
export type WorkflowPrincipal = {
    actorId: string;
    readOnly: boolean;
};
export function createWorkflowHandler(options: {
    store: WorkflowStore;
    cycleId: string;
    resolveActor?: (request: IncomingMessage) => WorkflowPrincipal | null | Promise<WorkflowPrincipal | null>;
    evaluateGate?: (receiptId: string, gate: GateName) => Promise<unknown>;
    authorizeCommand?: (command: Command) => boolean;
    verifyReview?: (packet: ReturnType<typeof projectHandoff>) => Promise<boolean>;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
    const route = `/api/workflow/v1/cycles/${options.cycleId}`;
    return async (req, res) => {
        const send = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' }); res.end(JSON.stringify(value)); };
        const host = `127.0.0.1:${req.socket.localPort}`;
        if (!['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`) || !['none', 'same-origin'].includes(String(req.headers['sec-fetch-site'] ?? 'none')))
            return send(403, { error: 'Local access required' });
        const readCompat = req.url === route + '/compat/legacy-read/v1';
        const handoffPrefix = route + '/compat/handoff/v1/';
        const receiptId = req.url?.startsWith(handoffPrefix) ? req.url.slice(handoffPrefix.length) : null;
        const gateMatch = req.url?.match(new RegExp('^' + route + '/gates/v1/([a-zA-Z0-9_.:-]+)/(handoff-check[.]py|successor-check[.]py|zero-face-gate[.]py)$'));
        const gateCompat = !!gateMatch && !!options.evaluateGate;
        const handoffCompat = !!receiptId && /^[a-zA-Z0-9_.:-]+$/.test(receiptId);
        if (req.url !== route && req.url !== route + '/commands' && !readCompat && !handoffCompat && !gateCompat)
            return send(404, { error: 'Route unavailable' });
        try {
            const principal = await options.resolveActor?.(req);
            if (!principal)
                return send(403, { error: 'Authenticated host identity required' });
            if (req.method === 'GET' && gateCompat)
                return send(200, await options.evaluateGate!(gateMatch![1], gateMatch![2] as GateName));
            if (req.method === 'GET' && readCompat)
                return send(200, projectLegacyRead(options.store.snapshot(options.cycleId)));
            if (req.method === 'GET' && handoffCompat)
                return send(200, projectHandoff(options.store.snapshot(options.cycleId), receiptId!));
            if (req.method === 'GET' && req.url === route)
                return send(200, options.store.snapshot(options.cycleId));
            if (req.method !== 'POST' || req.url !== route + '/commands')
                return send(405, { error: 'Method unavailable' });
            if (principal.readOnly)
                return send(403, { error: 'Read-only identity' });
            if (req.headers['content-type'] !== 'application/json' || req.headers['content-encoding'])
                return send(400, { error: 'JSON required' });
            let size = 0;
            const chunks: Buffer[] = [];
            for await (const part of req) {
                const bytes = Buffer.from(part);
                size += bytes.length;
                if (size > 32768) {
                    send(413, { error: 'Request too large' });
                    return;
                }
                chunks.push(bytes);
            }
            let body: Command;
            try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            }
            catch {
                return send(400, { error: 'Invalid JSON' });
            }
            if (body?.cycleId !== options.cycleId)
                return send(409, { error: 'Cycle mismatch' });
            if (options.authorizeCommand && options.authorizeCommand(body) !== true)
                return send(403, { error: 'Command outside approved session scope' });
            if (body.type === 'review' && body.data?.accept === true && options.store.snapshot(options.cycleId).handoffPolicy === 'movies/handoff/v1') {
                const snapshot = options.store.snapshot(options.cycleId);
                if (!snapshot.workers.some(w => w.id === principal.actorId && ['producer', 'reviewer'].includes(w.kind)))
                    return send(403, { error: 'Independent reviewer required' });
                const packet = projectHandoff(snapshot, body.data.receiptId);
                if (await options.verifyReview?.(packet) !== true)
                    return send(409, { error: 'Independent evidence verification required' });
            }
            const currentPrincipal=await options.resolveActor?.(req);
            if(!currentPrincipal||currentPrincipal.actorId!==principal.actorId||currentPrincipal.readOnly)return send(403,{error:'Session expired or revoked before commit'});
            return send(200, options.store.command(currentPrincipal.actorId, body));
        }
        catch (error) {
            if (error instanceof WorkflowError)
                return send(error.status, { error: error.message });
            return send(409, { error: 'Workflow command refused' });
        }
    };
}
