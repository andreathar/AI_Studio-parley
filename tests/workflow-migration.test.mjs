import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { WorkflowStore } from '../src/workflow/store.ts';
import { MIGRATIONS, APPLICATION_ID, applyMigrations, digest } from '../src/workflow/schema.ts';
let migration;
test('isolated migration and backup API exists', async () => { await assert.doesNotReject(async () => { migration = await import('../src/workflow/migration.ts'); }); });
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-migrate-'));
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function legacy(file) { const db = new DatabaseSync(file); db.exec("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE project_state(project TEXT PRIMARY KEY,schema_version INTEGER NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL); PRAGMA journal_mode=WAL;"); db.prepare('INSERT INTO meta VALUES(?,?)').run('schemaVersion', '1'); db.prepare('INSERT INTO project_state VALUES(?,?,?,?)').run('legacy', 1, JSON.stringify({ tasks: [{ id: 'OLD', status: 'completed' }], approval: true }), 'old'); return db; }
test('consistent WAL copy preserves v1 history without ingesting tasks or approvals', async (t) => {
    const dir = temp(), source = path.join(dir, 'old.sqlite3'), target = path.join(dir, 'new.sqlite3');
    const old = legacy(source);
    t.after(() => old.close());
    const result = await migration.stageSnapshotMigration(source, target);
    assert.equal(result.legacyRows, 1);
    assert.equal(result.sha256, hash(target));
    const check = new DatabaseSync(target, { readOnly: true });
    assert.equal(check.prepare('SELECT count(*) n FROM project_state').get().n, 1);
    assert.equal(check.prepare('SELECT count(*) n FROM tasks').get().n, 0);
    assert.equal(check.prepare('SELECT count(*) n FROM gates').get().n, 0);
    check.close();
    const store = new WorkflowStore(target);
    t.after(() => store.close());
    assert.equal(old.prepare('PRAGMA user_version').get().user_version, 0);
    assert.equal(old.prepare("SELECT count(*) n FROM sqlite_schema WHERE name='tasks'").get().n, 0);
});
test('backup and restore to a new file preserve restart state and refuse overwrite', async (t) => {
    const dir = temp(), p = path.join(dir, 'a.sqlite3'), backup = path.join(dir, 'backup.sqlite3'), restored = path.join(dir, 'restored.sqlite3');
    const store = new WorkflowStore(p, { create: true });
    const s = store.createCycle({ projectId: 'p', episodeId: 'f', producerId: 'operator', roles: ['producer', 'qc'], baseline: { head: 'h', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, tasks: [] });
    store.command('operator', { cycleId: s.cycleId, expectedVersion: 0, idempotencyKey: 'activate', type: 'activate', data: {} });
    const expected = store.snapshot(s.cycleId);
    await migration.backupWorkflow(p, backup);
    await migration.restoreWorkflow(backup, restored);
    store.close();
    const copy = new WorkflowStore(restored);
    t.after(() => copy.close());
    assert.deepEqual(copy.snapshot(s.cycleId), expected);
    await assert.rejects(migration.restoreWorkflow(backup, restored));
});
test('unknown versions, malformed schema and checksum drift fail closed without recreating seeds', t => {
    for (const sql of ['PRAGMA user_version=999', "UPDATE workflow_migrations SET checksum='wrong' WHERE version=1", 'ALTER TABLE tasks ADD COLUMN surprise TEXT']) {
        const file = path.join(temp(), 'db.sqlite3');
        const s = new WorkflowStore(file, { create: true });
        s.close();
        const db = new DatabaseSync(file);
        db.exec(sql);
        db.close();
        const before = hash(file);
        assert.throws(() => new WorkflowStore(file));
        assert.equal(hash(file), before);
    }
    const corrupt = path.join(temp(), 'corrupt.sqlite3');
    fs.writeFileSync(corrupt, 'not a database');
    const before = hash(corrupt);
    assert.throws(() => new WorkflowStore(corrupt));
    assert.equal(hash(corrupt), before);
    assert.equal(fs.readdirSync(path.dirname(corrupt)).some(n => n.includes('.corrupt')), false);
});
test('a numbered migration failure rolls back that entire migration', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(MIGRATIONS[0].sql);
    db.prepare('INSERT INTO workflow_migrations VALUES(?,?)').run(1, digest(MIGRATIONS[0].sql));
    db.exec(`PRAGMA user_version=1; PRAGMA application_id=${APPLICATION_ID};CREATE TABLE receipts(unexpected TEXT);`);
    const before = db.prepare('SELECT name FROM sqlite_schema ORDER BY name').all();
    assert.throws(() => applyMigrations(db));
    assert.deepEqual(db.prepare('SELECT name FROM sqlite_schema ORDER BY name').all(), before);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    db.close();
});
test('legacy migration refuses unknown source schema before creating a destination', async () => {
    const d = temp(), source = path.join(d, 'source.sqlite3'), target = path.join(d, 'target.sqlite3');
    const db = legacy(source);
    db.prepare("UPDATE meta SET value='999' WHERE key='schemaVersion'").run();
    db.close();
    await assert.rejects(migration.stageSnapshotMigration(source, target));
    assert.equal(fs.existsSync(target), false);
});
test('malformed older workflow schema is refused before any migration writes', () => {
    const file = path.join(temp(), 'old-workflow.sqlite3');
    const db = new DatabaseSync(file);
    db.exec(MIGRATIONS[0].sql);
    db.prepare('INSERT INTO workflow_migrations VALUES(?,?)').run(1, digest(MIGRATIONS[0].sql));
    db.exec(`PRAGMA user_version=1;PRAGMA application_id=${APPLICATION_ID};ALTER TABLE tasks ADD COLUMN surprise TEXT;`);
    db.close();
    const before = hash(file);
    assert.throws(() => new WorkflowStore(file));
    assert.equal(hash(file), before);
});
test('unknown migration rows and hardlink aliases are refused', () => {
    const file = path.join(temp(), 'workflow.sqlite3');
    const store = new WorkflowStore(file, { create: true });
    store.close();
    const db = new DatabaseSync(file);
    db.prepare('INSERT INTO workflow_migrations VALUES(?,?)').run(99, 'unknown');
    db.close();
    assert.throws(() => new WorkflowStore(file));
    const valid = path.join(temp(), 'valid.sqlite3');
    const s = new WorkflowStore(valid, { create: true });
    s.close();
    const alias = valid + '.alias';
    fs.linkSync(valid, alias);
    assert.throws(() => new WorkflowStore(alias));
});
test('an exited writer retains its ownership guard and recovery restores to a new path', async (t) => {
    const { spawnSync } = await import('node:child_process');
    const dir = temp(), file = path.join(dir, 'crashed.sqlite3'), restored = path.join(dir, 'recovered.sqlite3');
    const code = `import {WorkflowStore} from ${JSON.stringify(new URL('../src/workflow/store.ts', import.meta.url).href)};const store=new WorkflowStore(${JSON.stringify(file)},{create:true});const s=store.createCycle({projectId:'p',episodeId:'f',producerId:'operator',roles:['producer','qc'],baseline:{head:'h',registryDigest:'a'.repeat(64),policyDigest:'b'.repeat(64)},tasks:[]});store.command('operator',{cycleId:s.cycleId,expectedVersion:0,idempotencyKey:'one',type:'activate',data:{}});(await import('node:fs')).writeSync(1,JSON.stringify(store.snapshot(s.cycleId)));process.exit(0);`;
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: path.resolve('.'), encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 0, child.stderr);
    const expected = JSON.parse(child.stdout);
    assert.throws(() => new WorkflowStore(file));
    assert.equal(fs.existsSync(file + '.writer'), true);
    await migration.restoreWorkflow(file, restored);
    const store = new WorkflowStore(restored);
    t.after(() => store.close());
    assert.deepEqual(JSON.parse(JSON.stringify(store.snapshot(expected.cycleId))), expected);
    assert.equal(fs.existsSync(file + '.writer'), true);
});

test('valid schema 1 upgrades once and transaction failure cannot publish partial state',t=>{
 const file=path.join(temp(),'upgrade.sqlite3');const db=new DatabaseSync(file);applyMigrations(db,1);db.close();const store=new WorkflowStore(file);t.after(()=>store.close());const c=store.createCycle({projectId:'p',episodeId:'f',producerId:'p',roles:['producer','qc'],baseline:{head:'h',registryDigest:'a'.repeat(64),policyDigest:'b'.repeat(64)},tasks:[]});const raw=new DatabaseSync(file);assert.equal(raw.prepare('PRAGMA user_version').get().user_version,MIGRATIONS.length);raw.exec("CREATE TRIGGER fixture_failure BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END;");raw.close();const before=JSON.parse(JSON.stringify(store.snapshot(c.cycleId)));assert.throws(()=>store.command('p',{cycleId:c.cycleId,expectedVersion:0,idempotencyKey:'failure',type:'activate',data:{}}));assert.deepEqual(JSON.parse(JSON.stringify(store.snapshot(c.cycleId))),before);
});
