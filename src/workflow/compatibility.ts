/** Pure projections for legacy readers: no JSON files and no mutation authority. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { WorkflowSnapshot } from './store';
import { validateHandoff } from './handoff';
const pin = (s: WorkflowSnapshot) => ({ projectId: s.projectId, cycleId: s.cycleId, graphRevision: s.graphRevision, stateVersion: s.stateVersion, authority: 'sqlite-cycle' as const });
/** Old status vocabulary is conservative; exact state and identity are retained. */
export function projectLegacyRead(s: WorkflowSnapshot) {
    const states: Record<string, string> = { planned: 'pending', ready: 'ready', assigned: 'blocked', in_progress: 'in_progress', in_review: 'blocked', completed: 'completed', blocked: 'blocked', cancelled: 'cancelled' };
    return { schema: 'movies-workflow/legacy-read/v1', ...pin(s), readOnly: true, legacyHistoricalAuthority: 'unchanged', creativeApprovalsInherited: false, productionPlanAuthority: 'legacy-unmodified', tasks: s.tasks.map(t => ({ id: t.id, title: t.title, ownerRole: t.role, status: states[t.status] ?? 'blocked', workflowStatus: t.status, dependsOn: [...t.dependsOn], blocker: ['assigned', 'in_review'].includes(t.status) ? `Awaiting explicit ${t.status === 'assigned' ? 'worker start' : 'independent review'}` : t.reason, accountableActorId: t.accountableActorId, criteria: t.criteria, revision: t.revision })), history: s.history };
}
/** Match the legacy handoff fields without writing its discovery directory. */
export function projectHandoff(s: WorkflowSnapshot, receiptId: string) {
    if (s.handoffPolicy !== 'movies/handoff/v1')
        throw Error('Cycle has no Movies handoff policy');
    const r = s.receipts.find(r => r.id === receiptId);
    const a = s.assignments.find(a => a.id === r?.assignment_id);
    const task = s.tasks.find(t => t.id === a?.task_id);
    if (!r || !a || !task)
        throw Error('Receipt not found in selected cycle');
    const h = validateHandoff(r.handoff, task.role, r.artifacts as Array<{
        path: string;
        sha256: string;
    }>);
    return { schema: 'movies-workflow/hook-handoff/v1', ...pin(s), receiptId, receiptState: r.state, independentReviewer: r.reviewer ?? null, readOnly: true, document: { ...h, agentRole: task.role, taskId: task.id, summary: r.summary } };
}
/** Bounded, explicit file checks; never scans media directories or follows links. */
export function verifyHandoffFiles(root: string, document: ReturnType<typeof projectHandoff>['document']): string[] {
    const problems: string[] = [];
    if (!path.isAbsolute(root) || fs.realpathSync(root) !== path.resolve(root))
        return ['Evidence root refused'];
    const checked = new Set<string>();
    const verified = new Map<string, Buffer>();
    for (const item of [...document.changedFiles.map(e => ({ path: e.path, hash: e.sha256After })), ...document.claims.map(e => ({ path: e.evidence, hash: e.sha256 })), ...document.zeroFaceLogs.map(e => ({ path: e.log, hash: e.sha256 }))]) {
        if (checked.has(item.path))
            continue;
        checked.add(item.path);
        try {
            const file = path.resolve(root, item.path);
            if (!file.startsWith(root + path.sep) || fs.realpathSync(file) !== file)
                throw Error();
            const stat = fs.statSync(file);
            if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
                throw Error();
            const bytes = fs.readFileSync(file);
            const actual = createHash('sha256').update(bytes).digest('hex');
            if (actual !== item.hash)
                throw Error();
            verified.set(item.path, bytes);
        }
        catch {
            problems.push(`Evidence missing, changed or outside bounded read: ${item.path}`);
        }
    }
    for (const entry of document.zeroFaceLogs) {
        try {
            const bytes = verified.get(entry.log);
            if (!bytes)
                throw Error();
            const log = JSON.parse(bytes.toString('utf8'));
            if (!Array.isArray(log.files) || !log.files.some((f: any) => (typeof f === 'string' ? f : f?.path) === entry.media))
                throw Error();
        }
        catch {
            problems.push(`Zero-face coverage missing: ${entry.media}`);
        }
    }
    return problems;
}
