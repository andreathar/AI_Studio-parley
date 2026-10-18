import { createHash } from 'node:crypto';
import { canonicalObservation } from '../../src/shared/moviesObservation.mjs';
const NOW = Date.parse('2026-10-18T05:00:00Z');
const sha = value => createHash('sha256').update(value).digest('hex');
export function observation(sequence = 1, now = NOW) {
    const value = {
        schema: 'movies-online-observation/v1', project: 'Movies_Projects', sequence,
        observedAt: new Date(now).toISOString(), coordinator: { state: 'unknown', version: '0.18.2' },
        participants: [{ id: 'codex', provider: 'codex', state: 'unknown', observedAt: new Date(now).toISOString(), filmRoleId: null }],
        filmRoles: ['editor', 'qc'], productionTasks: [
            { id: 'T01', status: 'completed', ownerRole: 'editor', dependsOn: [] },
            { id: 'T02', status: 'blocked', ownerRole: 'qc', dependsOn: ['T01'] },
        ], counts: { chapters: 1, assets: 2 }, digest: '0'.repeat(64),
    };
    value.digest = sha(canonicalObservation(value));
    return value;
}
