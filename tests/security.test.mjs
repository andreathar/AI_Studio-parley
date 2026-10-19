import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { randomUUID } from 'node:crypto';
const TOKEN = `synthetic-test-${randomUUID()}`;
const PORT = 3317;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/api/status`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not come up');
}

test('Fase 1: writes require Bearer, diagnostics closed, CORS loopback only, MCP mutating blocked without auth', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-parley-fase1-'));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server-entry.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, AGENT_PARLEY_DB_PATH: path.join(dir, 'test.sqlite3'), MCP_SHARED_SECRET: TOKEN, HOST: '127.0.0.1', PORT: String(PORT) },
    stdio: 'ignore',
  });
  t.after(() => { try { child.kill('SIGTERM'); } catch {} fs.rmSync(dir, { recursive: true, force: true }); });
  await waitUp();

  assert.equal((await fetch(`${BASE}/api/status`)).status, 200);
  assert.equal((await fetch(`${BASE}/api/lanes`)).status, 200);

  const noAuth = await fetch(`${BASE}/api/lanes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'fase1-sem-auth', provider: 'claude' }) });
  assert.equal(noAuth.status, 401);
  const lanesAfter = await (await fetch(`${BASE}/api/lanes`)).json();
  assert.equal(lanesAfter.some((l) => l.name === 'fase1-sem-auth'), false);

  const withAuth = await fetch(`${BASE}/api/lanes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ name: 'fase1-com-auth', provider: 'claude' }) });
  assert.equal(withAuth.status, 201);

  assert.equal((await fetch(`${BASE}/api/diagnostics`)).status, 401);
  const diag = await fetch(`${BASE}/api/diagnostics`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(diag.status, 200);
  const diagJson = await diag.json();
  for (const v of diagJson.variables) assert.deepEqual(Object.keys(v).sort(), ['isSet', 'name', 'status']);

  const evil = await fetch(`${BASE}/api/status`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const good = await fetch(`${BASE}/api/status`, { headers: { Origin: 'http://127.0.0.1:3000' } });
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');

  const mcpNo = await fetch(`${BASE}/api/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'claim_issue', arguments: { issue_id: '#201', lane_id: 'lane-fase1-com-auth' } } }) });
  assert.equal(mcpNo.status, 401);
  const mcpYes = await fetch(`${BASE}/api/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'claim_issue', arguments: { issue_id: '#201', lane_id: 'lane-fase1-com-auth' } } }) });
  assert.equal(mcpYes.status, 200);
  const issues = await (await fetch(`${BASE}/api/issues`)).json();
  assert.equal(issues.find((i) => i.id === '#201').assignee, 'lane-fase1-com-auth');
});
