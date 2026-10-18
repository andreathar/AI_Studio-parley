import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkflowStore } from '../src/workflow/store.ts';
let api, view, preview;
test('inactive workflow API, client and preview modules exist', async () => { await assert.doesNotReject(async () => { api = await import('../src/workflow/api.ts'); view = await import('../src/workflow/view.mjs'); preview = await import('../src/workflow/preview.ts'); }); });
async function fixture(t, trusted = true) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-http-'));
    const store = new WorkflowStore(path.join(dir, 'fixture.sqlite3'), { create: true });
    const s = store.createCycle({ projectId: 'p', episodeId: 'f', producerId: 'fixture-producer', roles: ['producer', 'qc'], baseline: { head: 'h', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, tasks: [] });
    const server = createServer(api.createWorkflowHandler({ store, cycleId: s.cycleId, ...(trusted ? { resolveActor: () => ({ actorId: 'fixture-producer', readOnly: false }) } : {}) }));
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); store.close(); });
    const url = `http://127.0.0.1:${server.address().port}/api/workflow/v1/cycles/${s.cycleId}`;
    return { store, s, url, post: (body, headers = {}) => fetch(url + '/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) };
}
test('default deny, foreign origins, legacy paths and identity in body are refused', async (t) => {
    const no = await fixture(t, false);
    assert.equal((await fetch(no.url)).status, 403);
    const f = await fixture(t);
    assert.equal((await fetch(f.url, { headers: { Origin: 'https://example.invalid' } })).status, 403);
    assert.equal((await fetch(f.url.replace(/\/api\/workflow.*/, '/api/mcp'))).status, 404);
    const body = { cycleId: f.s.cycleId, expectedVersion: 0, idempotencyKey: 'one', type: 'activate', data: {}, actorId: 'producer' };
    assert.equal((await f.post(body)).status, 400);
    assert.equal(f.store.snapshot(f.s.cycleId).stateVersion, 0);
});
test('HTTP commands are revision checked and read model remains one committed version', async (t) => {
    const f = await fixture(t);
    const initial = await fetch(f.url);
    assert.match(initial.headers.get('cache-control'), /no-store/);
    assert.equal(initial.headers.get('access-control-allow-origin'), null);
    const base = { cycleId: f.s.cycleId, expectedVersion: 0, type: 'activate', data: {} };
    const replies = await Promise.all([f.post({ ...base, idempotencyKey: 'one' }), f.post({ ...base, idempotencyKey: 'two' })]);
    assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]);
    const s = await (await fetch(f.url)).json();
    assert.equal(s.stateVersion, 1);
    assert.equal(s.status, 'active');
    assert.equal(s.events.length, 1);
    assert.equal((await f.post({ ...base, expectedVersion: 1, idempotencyKey: 'bad', type: 'status', data: { status: 'invalid' } })).status, 400);
});
test('frontend reloads committed state, marks failure stale and never swaps projects from a response', async (t) => {
    const f = await fixture(t);
    const client = view.createWorkflowClient({ baseUrl: f.url, projectId: 'p', cycleId: f.s.cycleId, fetch });
    await client.refresh();
    assert.equal(client.state.snapshot.status, 'draft');
    await client.command('activate', {});
    assert.equal(client.state.snapshot.status, 'active');
    assert.equal(client.state.snapshot.stateVersion, 1);
    const wrong = view.createWorkflowClient({ baseUrl: f.url, projectId: 'p', cycleId: f.s.cycleId, fetch: async () => ({ ok: true, json: async () => ({ ...f.s, projectId: 'other' }) }) });
    await assert.rejects(wrong.refresh());
    assert.equal(wrong.state.snapshot, null);
    assert.equal(wrong.state.stale, true);
    const unavailable = view.createWorkflowClient({ baseUrl: f.url, projectId: 'p', cycleId: f.s.cycleId, fetch: async () => ({ ok: false, status: 503 }) });
    await assert.rejects(unavailable.refresh());
    assert.match(view.renderWorkflow(null, { stale: true }), /indisponível/);
});
test('view escapes text and distinguishes transport ACK from task acceptance', async (t) => {
    const f = await fixture(t);
    const s = { ...f.s, tasks: [{ id: 'X', title: '<img src=x onerror=alert(1)>', role: 'qc', status: 'planned', dependsOn: [] }], assignments: [{ task_id: 'X', state: 'queued', transport_state: 'sent', transport_ack: 'ack' }] };
    const html = view.renderWorkflow(s);
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('<img'));
    assert.match(html, /ACK de transporte/);
    assert.match(html, /queued/);
    assert.match(html, /Aceite da tarefa/);
});
test('new-cycle preview is inspectable, stays draft and refuses an existing directory', async () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-preview-parent-')), 'preview');
    const result = await preview.createIsolatedPreview(dir);
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'snapshot.json')));
    assert.equal(s.tasks.length, 7);
    assert.equal(s.status, 'draft');
    assert.equal(s.assignments.length, 0);
    assert.equal(s.gates.length, 0);
    assert.equal(result.activeDatabaseChanged, false);
    assert.ok(fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes(s.cycleId));
    await assert.rejects(preview.createIsolatedPreview(dir));
});
test('uncertain frontend response retains one envelope for an explicit idempotent retry', async (t) => {
    const f = await fixture(t);
    let dropped = false;
    const request = async (url, options) => { const response = await fetch(url, options); if (options?.method === 'POST' && !dropped) {
        dropped = true;
        throw Error('synthetic response loss after COMMIT');
    } return response; };
    const client = view.createWorkflowClient({ baseUrl: f.url, projectId: 'p', cycleId: f.s.cycleId, fetch: request });
    await client.refresh();
    await assert.rejects(client.command('activate', {}));
    assert.equal(client.state.stale, true);
    assert.equal(f.store.snapshot(f.s.cycleId).stateVersion, 1);
    await client.retryPending();
    assert.equal(client.state.snapshot.stateVersion, 1);
    assert.equal(f.store.snapshot(f.s.cycleId).events.length, 1);
});
test('oversize bodies and a read-only identity cannot mutate or reveal private errors', async (t) => {
    const f = await fixture(t);
    const huge = await fetch(f.url + '/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(32769) });
    assert.equal(huge.status, 413);
    assert.ok(!(await huge.text()).includes('sqlite'));
    const handler = api.createWorkflowHandler({ store: f.store, cycleId: f.s.cycleId, resolveActor: () => ({ actorId: 'fixture-producer', readOnly: true }) });
    const server = createServer(handler);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/workflow/v1/cycles/${f.s.cycleId}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403);
    assert.equal(f.store.snapshot(f.s.cycleId).stateVersion, 0);
});

test('client refuses remote endpoints before any request',()=>{
 let calls=0;const request=async()=>{calls++;throw Error('must not request');};assert.throws(()=>view.createWorkflowClient({baseUrl:'https://example.invalid/api/workflow/v1/cycles/c',projectId:'p',cycleId:'c',fetch:request}));assert.equal(calls,0);
});
