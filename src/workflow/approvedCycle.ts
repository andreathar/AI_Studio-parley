/** Explicit approved draft preparation; no legacy database or media ingestion. */
import fs from 'node:fs';
import path from 'node:path';
import { WorkflowStore, type CycleSpec, type TaskSpec } from './store';
import { backupWorkflow, restoreWorkflow } from './migration';
import type { DatabaseSelection } from './selectedServer';
export const PROJECT_ID = '768a8625-61c5-4578-a952-40c0ad20e462';
export const CYCLE_ID = '45b2aea4-b477-4be0-8ada-9cdb04392bee';
export const ACTOR_ID = 'producer-andre';
export const APPROVAL_REF = 'Sentinel_6f73e0004a3881918e0313f1925a8ba3';
export const APPROVED_ROOT = '/home/athar/.local/state/movies-workflow/projects/' + PROJECT_ID;
export const MOVIES_ROOT = '/mnt/data/Projects_SSD/Movies_Projects';
const stages: [
    string,
    string,
    string,
    string[]
][] = [['C01', 'Fixar baseline e limites', 'producer', []], ['C02', 'Continuidade de Andre, roupa e mesa', 'continuity', ['C01']], ['C03', 'Rever história de Galileo', 'historian', ['C01']], ['C04', 'Definir diálogo, idioma e timing', 'dialogue-sound', ['C01']], ['C05', 'Shot list e luz do piloto', 'storyboard', ['C02', 'C03', 'C04']], ['C06', 'Montagem com assets entregues', 'editor', ['C05']], ['C07', 'QC independente e decisão de Andre', 'qc', ['C06']]];
/** Create only a fresh explicit directory; preserve partial failures for inspection. */
export async function prepareApprovedCycle(options: {
    root: string;
    baseline: CycleSpec['baseline'];
}) {
    const root = options.root;
    if (!path.isAbsolute(root) || fs.existsSync(root) || fs.realpathSync(path.dirname(root)) !== path.resolve(path.dirname(root)))
        throw Error('Fresh private state directory required');
    fs.mkdirSync(root, { mode: 0o700 });
    const dbPath = path.join(root, 'workflow.sqlite3');
    const store = new WorkflowStore(dbPath, { create: true });
    let snapshot;
    try {
        snapshot = store.createCycle({ cycleId: CYCLE_ID, projectId: PROJECT_ID, episodeId: 'andre-time-travel', producerId: ACTOR_ID, handoffPolicy: 'movies/handoff/v1', roles: ['producer', 'director', 'continuity', 'historian', 'dialogue-sound', 'storyboard', 'lighting', 'editor', 'qc', 'coordinator'], baseline: options.baseline, tasks: stages.map(([id, title, role, dependsOn]): TaskSpec => ({ id, title, role, dependsOn, scope: 'local_read_only', criteria: 'Entrega revisada, sem geração, gasto ou dispatch' })) });
    }
    finally {
        store.close();
    }
    const backups = path.join(root, 'backups');
    fs.mkdirSync(backups, { mode: 0o700 });
    await backupWorkflow(dbPath, path.join(backups, 'pre-activation.sqlite3'));
    await restoreWorkflow(path.join(backups, 'pre-activation.sqlite3'), path.join(backups, 'restore-rehearsal.sqlite3'));
    const check = new WorkflowStore(path.join(backups, 'restore-rehearsal.sqlite3'), { migrate: false });
    try {
        if (JSON.stringify(check.snapshot(CYCLE_ID)) !== JSON.stringify(snapshot))
            throw Error('Restore rehearsal differs');
    }
    finally {
        check.close();
    }
    const selection: DatabaseSelection = { schema: 'movies-workflow/selection/v1', dbPath, projectId: PROJECT_ID, cycleId: CYCLE_ID, expectedStateVersion: 0, expectedGraphRevision: 1, approvalRef: APPROVAL_REF };
    fs.writeFileSync(path.join(root, 'selection-v1.json'), JSON.stringify(selection, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { selection, snapshot, backupRestored: true };
}
/** Parse only a private, non-symlink selection file for the approved new namespace. */
export function loadApprovedSelection(file: string): DatabaseSelection {
    if ((fs.statSync(APPROVED_ROOT).mode & 0o077) !== 0 || file !== path.join(APPROVED_ROOT, 'selection-v1.json') || fs.realpathSync(file) !== file || fs.statSync(file).nlink !== 1 || (fs.statSync(file).mode & 0o077) !== 0)
        throw Error('Approved private selection required');
    const selection = JSON.parse(fs.readFileSync(file, 'utf8')) as DatabaseSelection;
    if (selection.dbPath !== path.join(APPROVED_ROOT, 'workflow.sqlite3') || selection.projectId !== PROJECT_ID || selection.cycleId !== CYCLE_ID || selection.approvalRef !== APPROVAL_REF)
        throw Error('Approved selection identity mismatch');
    return selection;
}
