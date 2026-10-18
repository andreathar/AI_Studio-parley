/** Authentication is supplied by a verified host; local UID/lane labels grant nothing. */
import type { IncomingMessage } from 'node:http';
import type { WorkflowStore } from './store';
import type { WorkflowPrincipal } from './api';
export type VerifiedIdentity = {
    issuer: string;
    subject: string;
    actorId: string;
    projectId: string;
    cycleId: string;
    expiresAt: number;
    capabilities: Array<'read' | 'command'>;
};
export type IdentityVerifier = (request: IncomingMessage) => Promise<VerifiedIdentity | null>;
/** Fail closed unless a trusted verifier binds an existing cycle actor and scope. */
export function createVerifiedResolver(options: {
    store: WorkflowStore;
    projectId: string;
    cycleId: string;
    trustedIssuer: string;
    verify?: IdentityVerifier;
    now?: () => number;
}): (request: IncomingMessage) => Promise<WorkflowPrincipal | null> {
    return async (request) => {
        try {
            const v = await options.verify?.(request);
            if (!v || !options.trustedIssuer || v.issuer !== options.trustedIssuer || typeof v.subject !== 'string' || !v.subject.trim() || v.subject.length > 256 || v.projectId !== options.projectId || v.cycleId !== options.cycleId || !Number.isSafeInteger(v.expiresAt) || v.expiresAt <= (options.now ?? Date.now)() || !Array.isArray(v.capabilities) || !v.capabilities.includes('read') || v.capabilities.some(x => !['read', 'command'].includes(x)))
                return null;
            const s = options.store.snapshot(options.cycleId);
            if (s.projectId !== options.projectId || !s.workers.some(w => w.id === v.actorId))
                return null;
            return { actorId: v.actorId, readOnly: !v.capabilities.includes('command') };
        }
        catch {
            return null;
        }
    };
}
