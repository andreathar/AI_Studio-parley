/** Numbered, checksummed workflow schema; no demo seeds or implicit legacy import. */
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
export const APPLICATION_ID = 0x4d4f5653;
export const MIGRATIONS = Object.freeze([
    { version: 1, sql: `
CREATE TABLE workflow_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL);
CREATE TABLE projects(id TEXT PRIMARY KEY, episode_id TEXT NOT NULL);
CREATE TABLE cycles(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), status TEXT NOT NULL CHECK(status IN ('draft','active','archived')), graph_revision INTEGER NOT NULL DEFAULT 1, state_version INTEGER NOT NULL DEFAULT 0, baseline TEXT NOT NULL);
CREATE UNIQUE INDEX active_cycle ON cycles(project_id) WHERE status='active';
CREATE TABLE roles(cycle_id TEXT NOT NULL REFERENCES cycles(id), id TEXT NOT NULL, PRIMARY KEY(cycle_id,id));
CREATE TABLE workers(cycle_id TEXT NOT NULL, id TEXT NOT NULL, role TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('producer','worker','reviewer')), provider TEXT NOT NULL, PRIMARY KEY(cycle_id,id), FOREIGN KEY(cycle_id,role) REFERENCES roles(cycle_id,id));
CREATE TABLE tasks(cycle_id TEXT NOT NULL REFERENCES cycles(id), id TEXT NOT NULL, title TEXT NOT NULL, role TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('local_read_only','local_edit')), criteria TEXT NOT NULL, spec_digest TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, requires_gate INTEGER NOT NULL CHECK(requires_gate IN (0,1)), state TEXT NOT NULL CHECK(state IN ('planned','assigned','in_progress','in_review','completed','blocked','cancelled')), reason TEXT NOT NULL DEFAULT '', PRIMARY KEY(cycle_id,id), FOREIGN KEY(cycle_id,role) REFERENCES roles(cycle_id,id));
CREATE TABLE dependencies(cycle_id TEXT NOT NULL, task_id TEXT NOT NULL, depends_on TEXT NOT NULL, PRIMARY KEY(cycle_id,task_id,depends_on), CHECK(task_id<>depends_on), FOREIGN KEY(cycle_id,task_id) REFERENCES tasks(cycle_id,id), FOREIGN KEY(cycle_id,depends_on) REFERENCES tasks(cycle_id,id));
CREATE TABLE assignments(id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL, task_id TEXT NOT NULL, worker_id TEXT NOT NULL, task_revision INTEGER NOT NULL, fence TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('queued','accepted','running','delivered','reviewed','stale')), FOREIGN KEY(cycle_id,task_id) REFERENCES tasks(cycle_id,id), FOREIGN KEY(cycle_id,worker_id) REFERENCES workers(cycle_id,id));
CREATE UNIQUE INDEX one_task_owner ON assignments(cycle_id,task_id) WHERE state IN ('queued','accepted','running','delivered');
CREATE UNIQUE INDEX one_worker_task ON assignments(cycle_id,worker_id) WHERE state IN ('queued','accepted','running');
CREATE TABLE gates(cycle_id TEXT NOT NULL, task_id TEXT NOT NULL, spec_digest TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('local_read_only','local_edit')), expires_at INTEGER NOT NULL, approved INTEGER NOT NULL CHECK(approved IN (0,1)), issuer TEXT NOT NULL, PRIMARY KEY(cycle_id,task_id), FOREIGN KEY(cycle_id,task_id) REFERENCES tasks(cycle_id,id), FOREIGN KEY(cycle_id,issuer) REFERENCES workers(cycle_id,id));
` },
    { version: 2, sql: `
CREATE TABLE receipts(id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES assignments(id), delivery_key TEXT NOT NULL, digest TEXT NOT NULL, summary TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('submitted','accepted','rejected')), reviewer TEXT, UNIQUE(assignment_id,delivery_key));
CREATE TABLE artifacts(receipt_id TEXT NOT NULL REFERENCES receipts(id), path TEXT NOT NULL, sha256 TEXT NOT NULL, PRIMARY KEY(receipt_id,path));
CREATE TABLE outbox(assignment_id TEXT PRIMARY KEY REFERENCES assignments(id), state TEXT NOT NULL CHECK(state IN ('queued','sent','uncertain')), native_receipt TEXT, transport_ack TEXT);
CREATE TABLE command_results(cycle_id TEXT NOT NULL REFERENCES cycles(id), actor TEXT NOT NULL, idempotency_key TEXT NOT NULL, digest TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(cycle_id,actor,idempotency_key));
CREATE TABLE events(seq INTEGER PRIMARY KEY, cycle_id TEXT NOT NULL REFERENCES cycles(id), version INTEGER NOT NULL, actor TEXT NOT NULL, operation TEXT NOT NULL, detail TEXT NOT NULL, at INTEGER NOT NULL, UNIQUE(cycle_id,version));
CREATE TABLE historical_documents(cycle_id TEXT NOT NULL REFERENCES cycles(id), source TEXT NOT NULL, sha256 TEXT NOT NULL, author_claim TEXT NOT NULL, revision TEXT NOT NULL, authority TEXT NOT NULL CHECK(authority='historical_unverified'), PRIMARY KEY(cycle_id,source,sha256));
` },
    { version: 3, sql: `
ALTER TABLE cycles ADD COLUMN handoff_policy TEXT NOT NULL DEFAULT 'none' CHECK(handoff_policy IN ('none','movies/handoff/v1'));
CREATE TABLE receipt_handoffs(receipt_id TEXT PRIMARY KEY REFERENCES receipts(id), payload TEXT NOT NULL, digest TEXT NOT NULL);
` }
]);
export const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
export function applyMigrations(db: DatabaseSync, target = MIGRATIONS.length): void {
    const version = Number((db.prepare('PRAGMA user_version').get() as any).user_version);
    if (version > MIGRATIONS.length)
        throw Error('Unsupported workflow schema');
    if (!Number.isInteger(target) || target < 1 || target > MIGRATIONS.length || version > target)
        throw Error('Unsupported migration target');
    for (const migration of MIGRATIONS.filter(m => m.version <= target)) {
        if (migration.version <= version) {
            const row = db.prepare('SELECT checksum FROM workflow_migrations WHERE version=?').get(migration.version) as any;
            if (row?.checksum !== digest(migration.sql))
                throw Error('Migration checksum mismatch');
            continue;
        }
        db.exec('BEGIN IMMEDIATE');
        try {
            db.exec(migration.sql);
            db.prepare('INSERT INTO workflow_migrations VALUES(?,?)').run(migration.version, digest(migration.sql));
            db.exec(`PRAGMA user_version=${migration.version}; PRAGMA application_id=${APPLICATION_ID}; COMMIT`);
        }
        catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }
}
function signature(db: DatabaseSync): string {
    return JSON.stringify(db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT IN ('meta','project_state') ORDER BY type,name").all());
}
export function validateSchema(db: DatabaseSync, version = MIGRATIONS.length): void {
    if (Number((db.prepare('PRAGMA application_id').get() as any).application_id) !== APPLICATION_ID)
        throw Error('Not a workflow database');
    const reference = new DatabaseSync(':memory:');
    try {
        applyMigrations(reference, version);
        if (signature(db) !== signature(reference))
            throw Error('Workflow schema mismatch');
    }
    finally {
        reference.close();
    }
    if (Number((db.prepare('SELECT count(*) n FROM workflow_migrations').get() as any).n) !== version)
        throw Error('Unknown migration row');
    for (const m of MIGRATIONS.filter(m => m.version <= version)) {
        const r = db.prepare('SELECT checksum FROM workflow_migrations WHERE version=?').get(m.version) as any;
        if (r?.checksum !== digest(m.sql))
            throw Error('Migration checksum mismatch');
    }
    if (Number((db.prepare('PRAGMA user_version').get() as any).user_version) !== version)
        throw Error('Unsupported workflow schema');
    if (Object.values(db.prepare('PRAGMA integrity_check').get()!)[0] !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length)
        throw Error('Workflow integrity failure');
}
