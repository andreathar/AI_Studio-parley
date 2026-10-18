const reject = () => { throw new Error('Observation refused'); };
const object = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,38}$/.test(value);
const taskId = value => typeof value === 'string' && /^T[0-9]{2,3}$/.test(value);
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const unique = values => new Set(values).size === values.length;
export const MAX_OBSERVATION_BYTES = 32768;
/** Return a closed copy of the minimal wire schema; reject every extra field. */
export function validateObservation(input) {
    try {
        if (!object(input, ['schema', 'project', 'observedAt', 'sequence', 'coordinator', 'participants', 'filmRoles', 'productionTasks', 'counts', 'digest']) ||
            input.schema !== 'movies-online-observation/v1' || input.project !== 'Movies_Projects' ||
            !timestamp(input.observedAt) || !integer(input.sequence, 15) || input.sequence < 1 ||
            typeof input.digest !== 'string' || !/^[a-f0-9]{64}$/.test(input.digest))
            reject();
        const c = input.coordinator;
        if (!object(c, ['state', 'version']) || !['ready', 'not_running', 'unknown'].includes(c.state) ||
            !(c.version === null || (typeof c.version === 'string' && /^\d+\.\d+\.\d+$/.test(c.version))))
            reject();
        if (!Array.isArray(input.filmRoles) || input.filmRoles.length > 32 || !input.filmRoles.every(identifier) || !unique(input.filmRoles))
            reject();
        if (!Array.isArray(input.participants) || input.participants.length > 32)
            reject();
        for (const p of input.participants) {
            if (!object(p, ['id', 'provider', 'state', 'observedAt', 'filmRoleId']) || !identifier(p.id) ||
                !['claude', 'codex', 'gemini', 'opencode', 'copilot', 'amp', 'unknown'].includes(p.provider) ||
                !['working', 'idle', 'stopped', 'unknown'].includes(p.state) || !timestamp(p.observedAt) ||
                Date.parse(p.observedAt) > Date.parse(input.observedAt) ||
                !(p.filmRoleId === null || input.filmRoles.includes(p.filmRoleId)))
                reject();
        }
        if (!unique(input.participants.map(p => p.id)) || !Array.isArray(input.productionTasks) || input.productionTasks.length > 100)
            reject();
        const tasks = input.productionTasks;
        if (!unique(tasks.map(t => t.id)))
            reject();
        for (const t of tasks) {
            if (!object(t, ['id', 'status', 'ownerRole', 'dependsOn']) || !taskId(t.id) ||
                !['completed', 'in_progress', 'blocked', 'pending', 'todo'].includes(t.status) || !input.filmRoles.includes(t.ownerRole) ||
                !Array.isArray(t.dependsOn) || t.dependsOn.length > 100 || !unique(t.dependsOn) ||
                t.dependsOn.some(id => id === t.id || !tasks.some(other => other.id === id)))
                reject();
        }
        if (!object(input.counts, ['chapters', 'assets']) || !integer(input.counts.chapters, 100) || !integer(input.counts.assets, 1000000))
            reject();
        if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_OBSERVATION_BYTES)
            reject();
        return JSON.parse(JSON.stringify(input));
    }
    catch {
        return reject();
    }
}
function sorted(value) {
    if (Array.isArray(value))
        return value.map(sorted);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted(value[k])]));
    return value;
}
/** Canonical bytes exclude the checksum; this checksum is not a signature. */
export function canonicalObservation(input) {
    const { digest, ...unsigned } = input;
    return JSON.stringify(sorted(unsigned));
}
