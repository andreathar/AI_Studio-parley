// Agent Parley — persistence SQLite snapshot v1 (single writer: this server process).
// Only this server writes to the DB; other processes (e.g. future Python CLI) must
// read via WAL or talk HTTP/MCP. Direct multi-process writing is out of scope for v1.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ProjectSnapshot {
  lanes: any[];
  issues: any[];
  reservations: any[];
  messages: any[];
  plans: any[];
  budget: Record<string, any>;
  problems: any[];
  events: any[];
}

const SCHEMA_VERSION = 1;
let db: DatabaseSync | null = null;
let dbPath = '';
let persistenceWarning: string | null = null;

export function resolveDbPath(): string {
  const fromEnv = process.env.AGENT_PARLEY_DB_PATH;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  return path.join(root, 'data', 'agent-parley.sqlite3');
}

export function getDbPath(): string {
  return dbPath;
}

export function getPersistenceWarning(): string | null {
  return persistenceWarning;
}

function openDatabase(): void {
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL;');
  db.exec('PRAGMA synchronous=FULL;');
  db.exec('PRAGMA busy_timeout=5000;');
  const row: any = db.prepare('PRAGMA integrity_check').get();
  const result = row ? Object.values(row)[0] : 'unknown';
  if (result !== 'ok') {
    throw new Error(`integrity_check failed: ${String(result)}`);
  }
  db.exec(
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
     CREATE TABLE IF NOT EXISTS project_state (project TEXT PRIMARY KEY, schema_version INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  );
  const ver: any = db.prepare(`SELECT value FROM meta WHERE key='schemaVersion'`).get();
  if (!ver) {
    db.prepare(`INSERT INTO meta(key,value) VALUES('schemaVersion',?)`).run(String(SCHEMA_VERSION));
  } else if (ver.value !== String(SCHEMA_VERSION)) {
    throw new Error(`unknown schemaVersion: ${ver.value}`);
  }
}

function renameCorruptFiles(reason: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  try { db?.close(); } catch { /* ignore */ }
  db = null;
  const targets: Array<[string, string]> = [
    [dbPath, `${dbPath}.corrupt-${ts}`],
    [`${dbPath}-wal`, `${dbPath}-wal.corrupt-${ts}`],
    [`${dbPath}-shm`, `${dbPath}-shm.corrupt-${ts}`],
  ];
  for (const [from, to] of targets) {
    if (fs.existsSync(from)) fs.renameSync(from, to);
  }
  persistenceWarning = `Persistence database was corrupt or invalid (${reason}); renamed to .corrupt-${ts} and restarted from seed.`;
  console.error(`[persistence] corrupt database (${reason}); renamed to .corrupt-${ts}; seed fallback`);
}

function handleCorruption(reason: string): void {
  renameCorruptFiles(reason);
  openDatabase();
}

function isCorruptionError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return /integrity_check|not a database|database disk image is malformed|file is not a database|unknown schemaVersion|invalid snapshot|schema_version/i.test(msg);
}

export function initStateStore(): { activeProject: string | null; dbPath: string } {
  if (db) closeStateStore();
  persistenceWarning = null;
  dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  // D5: if we cannot create/open the DB for a non-corruption reason, fail startup explicitly.
  fs.mkdirSync(dir, { recursive: true });
  try {
    openDatabase();
  } catch (err: any) {
    if (isCorruptionError(err)) {
      handleCorruption(err.message || String(err));
    } else {
      console.error(`[persistence] failed to open database at ${dbPath}: ${err.message || err}`);
      throw err;
    }
  }
  let activeProject: string | null = null;
  try {
    const row: any = db!.prepare(`SELECT value FROM meta WHERE key='activeProject'`).get();
    if (row && typeof row.value === 'string' && row.value) activeProject = row.value;
  } catch (err: any) {
    if (isCorruptionError(err)) handleCorruption(err.message || String(err));
    else throw err;
  }
  try {
    const size = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    console.log(`[persistence] db=${dbPath} size=${size}`);
  } catch { /* ignore */ }
  return { activeProject, dbPath };
}

function validateSnapshot(parsed: any): ProjectSnapshot {
  const arrayKeys = ['lanes', 'issues', 'reservations', 'messages', 'plans', 'problems', 'events'] as const;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid snapshot: payload is not an object');
  for (const k of arrayKeys) {
    if (!Array.isArray(parsed[k])) throw new Error(`invalid snapshot: ${k} is not an array`);
  }
  if (!parsed.budget || typeof parsed.budget !== 'object' || Array.isArray(parsed.budget)) {
    throw new Error('invalid snapshot: budget is not an object');
  }
  return parsed as ProjectSnapshot;
}

export function loadProjectState(project: string): ProjectSnapshot | null {
  if (!db) throw new Error('state store not initialized');
  try {
    const row: any = db.prepare(`SELECT schema_version, payload, updated_at FROM project_state WHERE project=?`).get(project);
    if (!row) return null;
    if (Number(row.schema_version) !== SCHEMA_VERSION) {
      throw new Error(`unknown schema_version: ${row.schema_version}`);
    }
    const parsed = JSON.parse(row.payload);
    const snap = validateSnapshot(parsed);
    console.log(`[persistence] loaded snapshot project=${project} updated_at=${row.updated_at}`);
    return JSON.parse(JSON.stringify(snap));
  } catch (err: any) {
    if (isCorruptionError(err) || err instanceof SyntaxError) {
      handleCorruption(err.message || String(err));
      return null;
    }
    throw err;
  }
}

export function persistState(project: string, snapshot: ProjectSnapshot): void {
  if (!db) throw new Error('state store not initialized');
  const validated = validateSnapshot(snapshot);
  const payload = JSON.stringify(validated);
  const updatedAt = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`INSERT INTO meta(key,value) VALUES('schemaVersion',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(String(SCHEMA_VERSION));
    db.prepare(`INSERT INTO meta(key,value) VALUES('activeProject',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(project);
    db.prepare(
      `INSERT INTO project_state(project,schema_version,payload,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(project) DO UPDATE SET schema_version=excluded.schema_version, payload=excluded.payload, updated_at=excluded.updated_at`,
    ).run(project, SCHEMA_VERSION, payload, updatedAt);
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }
}

export function closeStateStore(): void {
  try { db?.close(); } catch { /* ignore */ }
  db = null;
}
