/** Real local session composition; starts unpaired and never activates a draft. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { startSelectedWorkflow, type DatabaseSelection } from './selectedServer';
import { TemporarySession, SESSION_ISSUER } from './temporarySession';
import type { GateContracts } from './cycleGates';
import { PROJECT_ID, CYCLE_ID, APPROVAL_REF } from './approvedCycle';
/** Start only the approved identity; injectable clocks support synthetic expiry tests. */
export async function startSessionWorkflow(options: {
    selection: DatabaseSelection;
    port?: number;
    gateContext?: {
        evidenceRoot: string;
        contracts: GateContracts;
    };
    onPending?: (id: string) => void;
    monotonicNow?: () => number;
}) {
    const selection = options.selection;
    if (selection.projectId !== PROJECT_ID || selection.cycleId !== CYCLE_ID || selection.approvalRef !== APPROVAL_REF)
        throw Error('Session selection refused');
    const authority = new TemporarySession({ onPending: options.onPending, monotonicNow: options.monotonicNow });
    const route = `/api/workflow/v1/cycles/${CYCLE_ID}`;
    const sessionRoutes = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
        const send = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer' }); res.end(JSON.stringify(value)); };
        if (req.url === route + '/session/request' && req.method === 'POST') {
            if (req.headers.origin !== `http://127.0.0.1:${req.socket.localPort}` || req.headers['content-type'] !== 'application/json' || req.headers['content-encoding']) {
                send(403, { error: 'Same-origin pairing required' });
                return true;
            }
            let size = 0, body = '';
            for await (const chunk of req) {
                size += Buffer.byteLength(chunk);
                if (size > 2) {
                    send(400, { error: 'Empty pairing object required' });
                    return true;
                }
                body += chunk.toString();
            }
            if (size !== 2 || body !== '{}') {
                send(400, { error: 'Empty pairing object required' });
                return true;
            }
            try {
                send(200, authority.request());
            }
            catch {
                send(429, { error: 'Pairing unavailable' });
            }
            return true;
        }
        if (req.url === route + '/session/status' && req.method === 'GET') {
            const grant = authority.resolve(req);
            send(grant ? 200 : 403, grant ? { paired: true, actorId: grant.actorId, projectId: grant.projectId, cycleId: grant.cycleId, expiresAt: grant.expiresAt } : { paired: false });
            return true;
        }
        if (req.url === route + '/session/revoke' && req.method === 'POST') {
            if (req.headers.origin !== `http://127.0.0.1:${req.socket.localPort}`) {
                send(403, { error: 'Same-origin required' });
                return true;
            }
            authority.revoke(req);
            send(200, { revoked: true });
            return true;
        }
        return false;
    };
    try {
        const instance = await startSelectedWorkflow({ selection, port: options.port, authorizeSelection: async () => true, trustedIssuer: SESSION_ISSUER, verifyIdentity: async (req) => authority.resolve(req), authorizeCommand: command => ['activate', 'block', 'unblock'].includes(command.type), sessionRoutes, gateContext: options.gateContext, uiMode: 'session' });
        return { ...instance, approvePairing: (id: string) => authority.approve(id), close: async () => { authority.close(); await instance.close(); } };
    }
    catch (error) {
        authority.close();
        throw error;
    }
}
