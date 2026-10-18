/** Explicit, consistent copies only. Never overwrites, renames or resets a source. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { applyMigrations, validateSchema, MIGRATIONS } from './schema';
import { createHash } from 'node:crypto';
function source(file: string): DatabaseSync {
    if (!path.isAbsolute(file) || !fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink())
        throw Error('Source refused');
    return new DatabaseSync(file, { readOnly: true });
}
function destination(file: string): void {
    if (!path.isAbsolute(file) || fs.existsSync(file) || fs.realpathSync(path.dirname(file)) !== path.resolve(path.dirname(file)))
        throw Error('New destination required');
    const fd = fs.openSync(file, 'wx', 0o600);
    fs.closeSync(fd);
}
function report(db: DatabaseSync): Record<string, unknown> {
    return { schema: 'movies-workflow/migration-receipt/v1', schemaVersion: MIGRATIONS.length, cycles: db.prepare('SELECT id,project_id,status,state_version FROM cycles ORDER BY id').all(), legacyRows: db.prepare("SELECT 1 FROM sqlite_schema WHERE name='project_state'").get() ? Number((db.prepare('SELECT count(*) n FROM project_state').get() as any).n) : 0, activeDatabaseChanged: false, automaticHistoryIngestion: false };
}
/** Back up a validated workflow through SQLite, including committed WAL content. */
export async function backupWorkflow(from: string, to: string): Promise<Record<string, unknown>> {
    const original = source(from);
    try {
        validateSchema(original);
        destination(to);
        await backup(original, to);
    }
    finally {
        original.close();
    }
    return finalReport(to);
}
/** Restore into another new file, keeping both the source and prior database intact. */
export async function restoreWorkflow(from: string, to: string): Promise<Record<string, unknown>> { return backupWorkflow(from, to); }
/** Stage the known UI snapshot schema as history, then add empty domain tables. */
export async function stageSnapshotMigration(from: string, to: string): Promise<Record<string, unknown>> {
    const original = source(from);
    try {
        const names = original.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r: any) => r.name);
        const columns = (table: string) => original.prepare(`PRAGMA table_info(${table})`).all().map((r: any) => r.name).join();
        if (names.join() !== 'meta,project_state' || columns('meta') !== 'key,value' || columns('project_state') !== 'project,schema_version,payload,updated_at' || (original.prepare("SELECT value FROM meta WHERE key='schemaVersion'").get() as any)?.value !== '1')
            throw Error('Unsupported legacy schema');
        if (Object.values(original.prepare('PRAGMA integrity_check').get()!)[0] !== 'ok')
            throw Error('Legacy integrity failure');
        destination(to);
        await backup(original, to);
    }
    finally {
        original.close();
    }
    const copy = new DatabaseSync(to);
    try {
        copy.exec('PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL');
        applyMigrations(copy);
        validateSchema(copy);
    }
    finally {
        copy.close();
    }
    return finalReport(to);
}
function finalReport(file: string): Record<string, unknown> {
    const db = source(file);
    let result: Record<string, unknown>;
    try {
        validateSchema(db);
        result = report(db);
    }
    finally {
        db.close();
    }
    return { ...result, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
