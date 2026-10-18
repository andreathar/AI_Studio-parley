/** Approval-bound bearer proofs live only in memory and never enter URLs or logs. */
import { randomBytes, createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { ACTOR_ID, PROJECT_ID, CYCLE_ID } from './approvedCycle';
import type { VerifiedIdentity } from './identity';
const hash = (proof: string) => createHash('sha256').update(proof).digest('hex');
export const SESSION_MS = 30 * 60 * 1000;
export const SESSION_ISSUER = 'movies-local-human-approval/v1';
type Entry = {
    pairingId: string;
    proofHash: string;
    requestedAt: number;
    approvedAt?: number;
    wallExpiry?: number;
};
/** Only the trusted terminal may invoke approve; HTTP has no approval operation. */
export class TemporarySession {
    private entries = new Map<string, Entry>();
    private closed = false;
    private monotonic: () => number;
    private wall: () => number;
    constructor(private options: {
        wallNow?: () => number;
        monotonicNow?: () => number;
        onPending?: (pairingId: string) => void;
    } = {}) {
        this.monotonic = options.monotonicNow ?? (() => Number(process.hrtime.bigint() / 1000000n));
        this.wall = options.wallNow ?? Date.now;
    }
    private prune(): void { const now = this.monotonic(); for (const [k, v] of this.entries)
        if (now - (v.approvedAt ?? v.requestedAt) >= (v.approvedAt === undefined ? 300000 : SESSION_MS))
            this.entries.delete(k); }
    request(): {
        pairingId: string;
        proof: string;
    } {
        if (this.closed)
            throw Error('Session closed');
        this.prune();
        if ([...this.entries.values()].filter(v => v.approvedAt === undefined).length >= 4)
            throw Error('Pairing capacity reached');
        const proof = randomBytes(32).toString('hex'), pairingId = 'PAIR-' + randomBytes(8).toString('hex');
        this.entries.set(hash(proof), { pairingId, proofHash: hash(proof), requestedAt: this.monotonic() });
        this.options.onPending?.(pairingId);
        return { pairingId, proof };
    }
    approve(pairingId: string): boolean {
        if (this.closed)
            return false;
        this.prune();
        const found = [...this.entries.values()].find(v => v.pairingId === pairingId && v.approvedAt === undefined);
        if (!found)
            return false;
        this.entries.clear();
        found.approvedAt = this.monotonic();
        found.wallExpiry = this.wall() + SESSION_MS;
        this.entries.set(found.proofHash, found);
        return true;
    }
    resolve(request: IncomingMessage): VerifiedIdentity | null {
        if (this.closed)
            return null;
        this.prune();
        const value = request.headers.authorization;
        if (typeof value !== 'string' || !/^Bearer [a-f0-9]{64}$/.test(value))
            return null;
        const found = this.entries.get(hash(value.slice(7)));
        if (!found || found.approvedAt === undefined || !found.wallExpiry || found.wallExpiry <= this.wall())
            return null;
        return { issuer: SESSION_ISSUER, subject: 'andre:approved:' + found.pairingId, actorId: ACTOR_ID, projectId: PROJECT_ID, cycleId: CYCLE_ID, expiresAt: found.wallExpiry, capabilities: ['read', 'command'] };
    }
    revoke(request: IncomingMessage): void { const value = request.headers.authorization; if (typeof value === 'string' && /^Bearer [a-f0-9]{64}$/.test(value))
        this.entries.delete(hash(value.slice(7))); }
    close(): void { this.entries.clear(); this.closed = true; }
}
