/** Versioned, declared receipt evidence. Independent review remains mandatory. */
import path from 'node:path';
export type HandoffEvidence = {
    schema: 'movies/handoff/v1';
    verification: string[];
    changedFiles: Array<{
        path: string;
        sha256After: string;
    }>;
    claims: Array<{
        evidence: string;
        sha256: string;
    }>;
    nextActions: Array<{
        owner: string;
        action: string;
    }>;
    stageComplete: boolean;
    stageCompleteReason: string;
    zeroFaceLogs: Array<{
        media: string;
        log: string;
        sha256: string;
    }>;
};
const media = /\.(mp4|mov|webm|png|jpg|jpeg|webp)$/i;
const isText = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 4096;
const isPath = (v: unknown): v is string => isText(v) && !path.isAbsolute(v) && !v.includes('\\') && !v.split('/').some(p => !p || p === '.' || p === '..');
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const exact = (v: any, names: string): boolean => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join() === names.split(',').sort().join();
/** Reject missing checks, successor or evidence binding before any state write. */
export function validateHandoff(value: unknown, role: string, artifacts: Array<{
    path: string;
    sha256: string;
}>): HandoffEvidence {
    const h = value as HandoffEvidence;
    const invalid = (): never => { throw Error('Complete versioned handoff evidence required'); };
    if (!exact(h, 'schema,verification,changedFiles,claims,nextActions,stageComplete,stageCompleteReason,zeroFaceLogs') || h.schema !== 'movies/handoff/v1')
        return invalid();
    if (![h.verification, h.changedFiles, h.claims, h.nextActions, h.zeroFaceLogs].every(v => Array.isArray(v) && v.length <= 32) || !h.verification.length || !h.verification.every(isText) || !h.changedFiles.length || !h.claims.length || typeof h.stageComplete !== 'boolean' || typeof h.stageCompleteReason !== 'string' || h.stageCompleteReason.length > 4096)
        return invalid();
    const bound = (p: string, s: string) => artifacts.some(a => a.path === p && a.sha256 === s);
    if (!h.changedFiles.every(e => exact(e, 'path,sha256After') && isPath(e.path) && hash(e.sha256After) && bound(e.path, e.sha256After)) || !h.claims.every(e => exact(e, 'evidence,sha256') && isPath(e.evidence) && hash(e.sha256) && bound(e.evidence, e.sha256)))
        return invalid();
    if (!h.nextActions.every(e => exact(e, 'owner,action') && isText(e.owner) && isText(e.action)) || !(h.nextActions.length || h.stageComplete && isText(h.stageCompleteReason)))
        return invalid();
    if (!h.zeroFaceLogs.every(e => exact(e, 'media,log,sha256') && isPath(e.media) && isPath(e.log) && path.basename(e.log) === 'zero-face-log.json' && hash(e.sha256) && bound(e.log, e.sha256) && h.claims.some(c => c.evidence === e.media)))
        return invalid();
    if (['qc', 'continuity'].includes(role) && h.claims.some(c => media.test(c.evidence) && !h.zeroFaceLogs.some(l => l.media === c.evidence)))
        return invalid();
    return h;
}
