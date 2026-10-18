import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
let WorkflowStore;
test('normalized workflow implementation is available', async () => {
    await assert.doesNotReject(async () => { ({ WorkflowStore } = await import('../src/workflow/store.ts')); });
    assert.equal(typeof WorkflowStore, 'function');
});
function fixture(t, tasks = [{ id: 'A', title: 'Baseline', role: 'continuity', scope: 'local_read_only', criteria: 'report', dependsOn: [] }, { id: 'B', title: 'Review', role: 'historian', scope: 'local_read_only', criteria: 'sources', dependsOn: ['A'] }]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-'));
    let now = 1000000;
    const dbPath = path.join(dir, 'workflow.sqlite3');
    const store = new WorkflowStore(dbPath, { create: true, now: () => now });
    t.after(() => store.close());
    const first = store.createCycle({ projectId: 'project-1', episodeId: 'andre-time-travel', baseline: { head: 'fixture-head', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, roles: ['producer', 'continuity', 'historian', 'qc'], producerId: 'producer-fixture', tasks });
    const cycleId = first.cycleId;
    let seq = 0;
    const cmd = (type, data = {}, actor = 'producer-fixture', overrides = {}) => store.command(actor, { cycleId, expectedVersion: store.snapshot(cycleId).stateVersion, idempotencyKey: `op-${++seq}`, type, data, ...overrides });
    const ready = () => { cmd('activate'); cmd('register_worker', { id: 'worker-1', role: 'continuity', provider: 'synthetic', kind: 'worker' }); cmd('register_worker', { id: 'reviewer-1', role: 'qc', provider: 'synthetic', kind: 'reviewer' }); };
    const queued = () => { ready(); return cmd('queue', { taskId: 'A', workerId: 'worker-1' }); };
    const running = () => { const a = queued(); cmd('transport_sent', { assignmentId: a.assignmentId, nativeReceipt: 'fixture-mail-1' }); cmd('accept', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1'); cmd('start', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1'); return a; };
    return { store, dbPath, cycleId, cmd, ready, queued, running, advance: n => now += n };
}
test('fresh cycle has no inherited assignments, gates or acceptance; dependencies control readiness', t => {
    const f = fixture(t);
    let s = f.store.snapshot(f.cycleId);
    assert.equal(s.status, 'draft');
    assert.equal(s.assignments.length, 0);
    assert.equal(s.gates.length, 0);
    f.ready();
    s = f.store.snapshot(f.cycleId);
    assert.equal(s.tasks[0].status, 'ready');
    assert.equal(s.tasks[1].status, 'planned');
    assert.throws(() => f.cmd('queue', { taskId: 'B', workerId: 'worker-1' }));
});
test('duplicate IDs, missing edges, cycles, unknown roles and invalid states fail atomically', t => {
    const f = fixture(t);
    const base = { projectId: 'another', episodeId: 'film', baseline: { head: 'h', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, roles: ['producer', 'qc'], producerId: 'p' };
    for (const tasks of [[{ id: 'X', role: 'qc', dependsOn: ['missing'] }], [{ id: 'X', role: 'qc', dependsOn: ['Y'] }, { id: 'Y', role: 'qc', dependsOn: ['X'] }], [{ id: 'X', role: 'qc', dependsOn: [] }, { id: 'X', role: 'qc', dependsOn: [] }], [{ id: 'X', role: 'unknown', dependsOn: [] }]])
        assert.throws(() => f.store.createCycle({ ...base, tasks }));
    const before = f.store.snapshot(f.cycleId);
    assert.throws(() => f.cmd('status', { taskId: 'A', status: 'banana' }));
    assert.deepEqual(f.store.snapshot(f.cycleId), before);
    f.ready();
    assert.throws(() => f.cmd('queue', { taskId: 'A', workerId: 'ghost' }));
});
test('queued, sent, transport ACK, acceptance, start, delivery and review are distinct', t => {
    const f = fixture(t);
    const a = f.queued();
    assert.equal(f.store.snapshot(f.cycleId).assignments[0].state, 'queued');
    assert.throws(() => f.cmd('accept', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1'));
    f.cmd('transport_sent', { assignmentId: a.assignmentId, nativeReceipt: 'mail-fixture' });
    f.cmd('transport_ack', { assignmentId: a.assignmentId, nativeReceipt: 'ack-fixture' });
    assert.equal(f.store.snapshot(f.cycleId).assignments[0].state, 'queued');
    f.cmd('accept', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1');
    assert.equal(f.store.snapshot(f.cycleId).tasks[0].status, 'assigned');
    f.cmd('start', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1');
    const data = { assignmentId: a.assignmentId, fence: a.fence, deliveryKey: 'delivery-1', artifacts: [{ path: 'outputs/cycle/A/report.md', sha256: 'c'.repeat(64) }], summary: 'Synthetic report' };
    const r = f.cmd('deliver', data, 'worker-1');
    assert.equal(f.store.snapshot(f.cycleId).tasks[0].status, 'in_review');
    assert.throws(() => f.cmd('review', { receiptId: r.receiptId, accept: true }, 'worker-1'));
    f.cmd('review', { receiptId: r.receiptId, accept: true }, 'reviewer-1');
    const s = f.store.snapshot(f.cycleId);
    assert.equal(s.tasks[0].status, 'completed');
    assert.equal(s.tasks[1].status, 'ready');
});
test('versions reject concurrent updates; retries return the original result and reject changed payload', t => {
    const f = fixture(t);
    const e = { cycleId: f.cycleId, expectedVersion: 0, idempotencyKey: 'activate-once', type: 'activate', data: {} };
    const r = f.store.command('producer-fixture', e);
    assert.deepEqual(f.store.command('producer-fixture', e), r);
    assert.throws(() => f.store.command('producer-fixture', { ...e, data: { extra: 'no' } }));
    assert.throws(() => f.store.command('producer-fixture', { ...e, idempotencyKey: 'concurrent' }));
    assert.equal(f.store.snapshot(f.cycleId).stateVersion, 1);
});
test('a duplicate delivery cannot create a second receipt or accept itself', t => {
    const f = fixture(t);
    const a = f.running();
    const data = { assignmentId: a.assignmentId, fence: a.fence, deliveryKey: 'one', artifacts: [{ path: 'outputs/A.txt', sha256: 'c'.repeat(64) }], summary: 'one' };
    const first = f.cmd('deliver', data, 'worker-1');
    const again = f.cmd('deliver', data, 'worker-1');
    assert.equal(first.receiptId, again.receiptId);
    assert.equal(f.store.snapshot(f.cycleId).receipts.length, 1);
    assert.throws(() => f.cmd('deliver', { ...data, summary: 'changed' }, 'worker-1'));
});
test('stale fencing and expired leases fail; gates bind task digest and expire', t => {
    const f = fixture(t, [{ id: 'A', title: 'Scoped', role: 'continuity', scope: 'local_read_only', criteria: 'report', dependsOn: [], requiresGate: true }]);
    f.ready();
    assert.throws(() => f.cmd('queue', { taskId: 'A', workerId: 'worker-1' }));
    const task = f.store.snapshot(f.cycleId).tasks[0];
    assert.throws(() => f.cmd('gate', { taskId: 'A', specDigest: '0'.repeat(64), scope: 'local_read_only', expiresAt: 2000000, approved: true }));
    f.cmd('gate', { taskId: 'A', specDigest: task.specDigest, scope: 'local_read_only', expiresAt: 2000000, approved: true });
    const a = f.cmd('queue', { taskId: 'A', workerId: 'worker-1' });
    f.cmd('transport_sent', { assignmentId: a.assignmentId, nativeReceipt: 'mail' });
    assert.throws(() => f.cmd('accept', { assignmentId: a.assignmentId, fence: 'stale' }, 'worker-1'));
    f.advance(1000001);
    assert.throws(() => f.cmd('accept', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1'));
    f.cmd('expire', { assignmentId: a.assignmentId });
    assert.equal(f.store.snapshot(f.cycleId).tasks[0].status, 'blocked');
});
test('single writer refuses a second owner; restart preserves task and command results', t => {
    const f = fixture(t);
    f.ready();
    const before = f.store.snapshot(f.cycleId);
    assert.throws(() => new WorkflowStore(f.dbPath));
    f.store.close();
    const reopened = new WorkflowStore(f.dbPath);
    t.after(() => reopened.close());
    assert.deepEqual(reopened.snapshot(f.cycleId), before);
});
test('history indexing records provenance only and exports cannot become commands', t => {
    const f = fixture(t);
    f.cmd('index_history', { source: 'projects/film/handoff.json', sha256: 'd'.repeat(64), authorClaim: 'historical author', revision: 'old' });
    const s = f.store.snapshot(f.cycleId);
    assert.equal(s.history[0].authority, 'historical_unverified');
    assert.equal(s.assignments.length, 0);
    assert.equal(s.gates.length, 0);
    assert.throws(() => f.store.command('producer-fixture', s));
});
test('revoked gates cannot approve a delivered result', t => {
    const f = fixture(t, [{ id: 'A', title: 'Scoped', role: 'continuity', scope: 'local_read_only', criteria: 'report', dependsOn: [], requiresGate: true }]);
    f.ready();
    const task = f.store.snapshot(f.cycleId).tasks[0];
    const gate = { taskId: 'A', specDigest: task.specDigest, scope: task.scope, expiresAt: 2000000, approved: true };
    f.cmd('gate', gate);
    const a = f.cmd('queue', { taskId: 'A', workerId: 'worker-1' });
    f.cmd('transport_sent', { assignmentId: a.assignmentId, nativeReceipt: 'm' });
    f.cmd('accept', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1');
    f.cmd('start', { assignmentId: a.assignmentId, fence: a.fence }, 'worker-1');
    const r = f.cmd('deliver', { assignmentId: a.assignmentId, fence: a.fence, deliveryKey: 'd', artifacts: [{ path: 'outputs/A.md', sha256: 'c'.repeat(64) }], summary: 'report' }, 'worker-1');
    f.cmd('gate', { ...gate, approved: false });
    assert.throws(() => f.cmd('review', { receiptId: r.receiptId, accept: true }, 'reviewer-1'));
    assert.equal(f.store.snapshot(f.cycleId).tasks[0].status, 'in_review');
});
test('semantic retries tolerate object key order while rejecting new content', t => {
    const f = fixture(t);
    const one = { cycleId: f.cycleId, expectedVersion: 0, idempotencyKey: 'same', type: 'activate', data: {} };
    const result = f.store.command('producer-fixture', one);
    const reordered = { data: {}, type: 'activate', idempotencyKey: 'same', expectedVersion: 0, cycleId: f.cycleId };
    assert.deepEqual(f.store.command('producer-fixture', reordered), result);
});
test('archiving and a new cycle never inherit work or activate a second cycle', t => {
    const f = fixture(t, []);
    f.cmd('activate');
    const next = f.store.createCycle({ projectId: 'project-1', episodeId: 'andre-time-travel', producerId: 'next-producer', roles: ['producer', 'qc'], baseline: { head: 'next', registryDigest: 'a'.repeat(64), policyDigest: 'b'.repeat(64) }, tasks: [] });
    const e = { cycleId: next.cycleId, expectedVersion: 0, idempotencyKey: 'next', type: 'activate', data: {} };
    assert.throws(() => f.store.command('next-producer', e));
    f.cmd('archive');
    f.store.command('next-producer', e);
    assert.notEqual(next.cycleId, f.cycleId);
    assert.equal(f.store.snapshot(next.cycleId).assignments.length, 0);
});
test('two assignments are the concurrency cap, unknown kinds and extra fields fail', t => {
    const tasks = ['A', 'B', 'C'].map(id => ({ id, title: id, role: 'continuity', scope: 'local_read_only', criteria: 'r', dependsOn: [] }));
    const f = fixture(t, tasks);
    f.ready();
    for (const n of [2, 3])
        f.cmd('register_worker', { id: `worker-${n}`, role: 'continuity', provider: 'synthetic', kind: 'worker' });
    f.cmd('queue', { taskId: 'A', workerId: 'worker-1' });
    f.cmd('queue', { taskId: 'B', workerId: 'worker-2' });
    assert.throws(() => f.cmd('queue', { taskId: 'C', workerId: 'worker-3' }));
    assert.throws(() => f.cmd('register_worker', { id: 'evil', role: 'producer', provider: 'x', kind: 'producer' }));
});

test('command data must be an object and a failed event insert rolls back all state',t=>{
 const f=fixture(t);const before=f.store.snapshot(f.cycleId);assert.throws(()=>f.cmd('activate',1));assert.deepEqual(f.store.snapshot(f.cycleId),before);
});
test('queued work stays accountable to producer until accepted and blocks can be resolved explicitly',t=>{
 const f=fixture(t);const a=f.queued();assert.equal(f.store.snapshot(f.cycleId).tasks[0].accountableActorId,'producer-fixture');f.cmd('transport_sent',{assignmentId:a.assignmentId,nativeReceipt:'mail'});f.cmd('accept',{assignmentId:a.assignmentId,fence:a.fence},'worker-1');assert.equal(f.store.snapshot(f.cycleId).tasks[0].accountableActorId,'worker-1');
 const other=fixture(t);other.ready();other.cmd('block',{taskId:'A',reason:'waiting for input'});assert.equal(other.store.snapshot(other.cycleId).tasks[0].status,'blocked');other.cmd('unblock',{taskId:'A'});assert.equal(other.store.snapshot(other.cycleId).tasks[0].status,'ready');
});
