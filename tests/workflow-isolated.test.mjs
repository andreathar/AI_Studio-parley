import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
let runtime;
test('opt-in isolated runtime is available', async () => { await assert.doesNotReject(async () => { runtime = await import('../src/workflow/isolatedServer.ts'); }); });
const fresh = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-host-')), 'instance');
test('one opt-in instance serves live normalized API and the actual frontend, read only', async (t) => {
    const instance = await runtime.startIsolatedWorkflow({ workspace: fresh(), port: 0 });
    t.after(() => instance.close());
    const base = instance.url;
    const root = await fetch(base);
    const html = await root.text();
    assert.match(html, /bootstrap.mjs/);
    assert.equal(root.headers.get('access-control-allow-origin'), null);
    assert.match(root.headers.get('content-security-policy'), /default-src 'self'/);
    const boot = await (await fetch(base + 'bootstrap.mjs')).text();
    assert.match(boot, /createWorkflowClient/);
    assert.match(boot, /mountWorkflowView/);
    const module = await fetch(base + 'workflow-view.mjs');
    assert.equal(module.status, 200);
    assert.match(await module.text(), /retryPending/);
    const endpoint = base + `api/workflow/v1/cycles/${instance.cycleId}`;
    const snapshot = await (await fetch(endpoint)).json();
    assert.equal(snapshot.status, 'draft');
    assert.equal(snapshot.tasks.length, 7);
    instance.store.command('preview-producer', { cycleId: instance.cycleId, expectedVersion: 0, idempotencyKey: 'fixture-only', type: 'activate', data: {} });
    const refreshed = await (await fetch(endpoint)).json();
    assert.equal(refreshed.status, 'active');
    assert.equal(refreshed.stateVersion, 1);
    assert.equal((await fetch(endpoint + '/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    for (const route of ['api/mcp', 'api/cli', '.env', 'synthetic-v1.sqlite3', 'workflow-v2.sqlite3'])
        assert.equal((await fetch(base + route)).status, 404);
    assert.equal((await fetch(endpoint, { headers: { Origin: 'https://example.invalid' } })).status, 403);
});
test('entry refuses missing or extra arguments before creating state or a listener', () => {
    for (const args of [[], ['--workspace', fresh(), '--host', '0.0.0.0'], ['--workspace', fresh(), '--port', 'bad']]) {
        const child = spawnSync(process.execPath, ['--import', 'tsx', 'workflow-isolated.ts', ...args], { cwd: path.resolve('.'), encoding: 'utf8', timeout: 5000 });
        assert.equal(child.status, 2, child.stderr);
        assert.equal(child.stderr, 'Isolated workflow start refused.\n');
        assert.equal(child.stdout, '');
    }
});
test('existing directories and repository locations cannot be used as isolated state', async () => {
    const p = fresh();
    fs.mkdirSync(p);
    await assert.rejects(runtime.startIsolatedWorkflow({ workspace: p }));
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-repo-'));
    fs.mkdirSync(path.join(repo, '.git'));
    fs.writeFileSync(path.join(repo, 'workspace.json'), '{"activeFilm":"fixture"}');
    const inside = path.join(repo, 'fixture');
    await assert.rejects(runtime.startIsolatedWorkflow({ workspace: inside }));
    assert.equal(fs.existsSync(inside), false);
});
