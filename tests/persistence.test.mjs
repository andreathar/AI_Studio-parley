import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initStateStore, loadProjectState, persistState, getPersistenceWarning, closeStateStore } from '../src/server/stateStore.ts';

function snapshot(marker) {
  return {
    lanes: [{ id: 'lane-persistencia-teste', ownedIssues: ['#999'] }],
    issues: [{ id: '#999', title: marker, status: 'in_progress', assignee: 'lane-persistencia-teste' }],
    reservations: [], messages: [], plans: [], budget: { tokenCap: 100, tokensUsed: 1 }, problems: [], events: [],
  };
}
function tmpDb(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-parley-persistence-'));
  const dbPath = path.join(dir, 'agent-parley-test.sqlite3');
  process.env.AGENT_PARLEY_DB_PATH = dbPath;
  t.after(() => { try { closeStateStore(); } catch {} fs.rmSync(dir, { recursive: true, force: true }); });
  return dbPath;
}

test('seed -> mutation -> reload confers, and switch ida/volta keeps both projects', (t) => {
  const dbPath = tmpDb(t);
  assert.equal(fs.existsSync(dbPath), false);
  initStateStore();
  assert.equal(fs.existsSync(dbPath), true);
  assert.equal(loadProjectState('movies_projects'), null);
  persistState('movies_projects', snapshot('filme A'));
  persistState('default', snapshot('default seed'));
  // switch back: reload movies
  const loaded = loadProjectState('movies_projects');
  assert.equal(loaded.issues[0].title, 'filme A');
  assert.equal(loaded.issues[0].assignee, 'lane-persistencia-teste');
  assert.equal(loadProjectState('default').issues[0].title, 'default seed');
  closeStateStore();
  // reload from disk (simulated restart)
  initStateStore();
  assert.equal(loadProjectState('movies_projects').issues[0].status, 'in_progress');
  assert.equal(getPersistenceWarning(), null);
});

test('missing file is recreated without warning', (t) => {
  const dbPath = tmpDb(t);
  initStateStore(); closeStateStore();
  fs.rmSync(dbPath, { force: true });
  fs.rmSync(`${dbPath}-wal`, { force: true }); fs.rmSync(`${dbPath}-shm`, { force: true });
  initStateStore();
  assert.equal(fs.existsSync(dbPath), true);
  assert.equal(getPersistenceWarning(), null);
  assert.equal(loadProjectState('movies_projects'), null);
});

test('corrupt file is renamed to .corrupt-*, warning exposed, seed fallback works', (t) => {
  const dbPath = tmpDb(t);
  fs.writeFileSync(dbPath, 'isto-nao-e-sqlite');
  initStateStore();
  const warning = getPersistenceWarning();
  assert.ok(warning && warning.includes('.corrupt-'), warning);
  const files = fs.readdirSync(path.dirname(dbPath));
  assert.ok(files.some((f) => f.includes('.corrupt-')), files.join(','));
  assert.equal(loadProjectState('movies_projects'), null);
  persistState('movies_projects', snapshot('after corrupt'));
  assert.equal(loadProjectState('movies_projects').issues[0].title, 'after corrupt');
});
