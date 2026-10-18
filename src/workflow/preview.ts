/** Explicit synthetic fixture preview. Importing this module starts no server. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WorkflowStore, type TaskSpec } from './store';
import { stageSnapshotMigration, backupWorkflow, restoreWorkflow } from './migration';
import { renderWorkflow } from './view.mjs';
const entries: [
    string,
    string,
    string,
    string[]
][] = [['C01', 'Fixar baseline e limites', 'producer', []], ['C02', 'Continuidade de Andre, roupa e mesa', 'continuity', ['C01']], ['C03', 'Rever história de Galileo', 'historian', ['C01']], ['C04', 'Definir diálogo, idioma e timing', 'dialogue-sound', ['C01']], ['C05', 'Shot list e luz do piloto', 'storyboard', ['C02', 'C03', 'C04']], ['C06', 'Montagem com assets entregues', 'editor', ['C05']], ['C07', 'QC independente e decisão de Andre', 'qc', ['C06']]];
/** Create a new directory only; the source database is always synthetic. */
export async function createIsolatedPreview(directory: string): Promise<Record<string, unknown>> {
    if (!path.isAbsolute(directory) || fs.existsSync(directory))
        throw Error('New absolute preview directory required');
    fs.mkdirSync(directory, { mode: 0o700 });
    const legacyPath = path.join(directory, 'synthetic-v1.sqlite3'), dbPath = path.join(directory, 'workflow-v2.sqlite3');
    const legacy = new DatabaseSync(legacyPath);
    legacy.exec("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE project_state(project TEXT PRIMARY KEY,schema_version INTEGER NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL);INSERT INTO meta VALUES('schemaVersion','1');INSERT INTO project_state VALUES('synthetic-history',1,'{\"approval\":true,\"tasks\":[{\"status\":\"completed\"}]}','synthetic');");
    legacy.close();
    const migration = await stageSnapshotMigration(legacyPath, dbPath);
    const store = new WorkflowStore(dbPath);
    let snapshot;
    try {
        snapshot = store.createCycle({ projectId: 'movies-preview-only', episodeId: 'andre-time-travel', producerId: 'preview-producer', baseline: { head: 'synthetic-not-a-production-head', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, roles: ['producer', 'director', 'continuity', 'historian', 'dialogue-sound', 'storyboard', 'lighting', 'editor', 'qc', 'coordinator'], tasks: entries.map(([id, title, role, dependsOn]): TaskSpec => ({ id, title, role, dependsOn, scope: 'local_read_only', criteria: 'Entrega revisada, sem geração ou gasto' })) });
    }
    finally {
        store.close();
    }
    await backupWorkflow(dbPath, path.join(directory, 'consistent-backup.sqlite3'));
    await restoreWorkflow(path.join(directory, 'consistent-backup.sqlite3'), path.join(directory, 'restored.sqlite3'));
    fs.writeFileSync(path.join(directory, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    const css = 'body{background:#10141c;color:#eef1fa;font:16px system-ui;margin:3vw}main{max-width:1500px;margin:auto}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #364159;padding:14px}p{color:#bdc9df}th{color:#8fbaff}';
    fs.writeFileSync(path.join(directory, 'index.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Movies — novo ciclo isolado</title><style>${css}</style>${renderWorkflow(snapshot)}<p>Somente fixture sintética. Banco ativo, agentes e mídia preservados.</p></html>`, { flag: 'wx' });
    const result = { schema: 'movies-workflow/preview-receipt/v1', activeDatabaseChanged: false, dispatchEnabled: false, migration, projectId: snapshot.projectId, cycleId: snapshot.cycleId, stateVersion: snapshot.stateVersion, status: snapshot.status };
    fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    return result;
}
