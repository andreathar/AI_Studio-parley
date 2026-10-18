import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot, localOrigin } from '../src/local-movies-view.mjs';

export function fixture() {
  return {
    schema: 'movies-ai-studio/offline-comparison/v2',
    mode: 'offline_read_only',
    observedAt: '2026-10-18T04:00:00+00:00',
    runtimeCoordinator: null,
    movies: {
      projectId: 'andre-time-travel', chapterIds: ['G'],
      taskIds: ['T01', 'T02'], taskStates: { completed: 1, blocked: 1 },
      tasks: [
        { id: 'T01', title: 'Roteiro sintético', status: 'completed', ownerRole: 'editor' },
        { id: 'T02', title: '<img src=x onerror=alert(1)>', status: 'blocked', ownerRole: 'qc' },
      ],
      roleIds: ['editor', 'qc'], assetRecords: 2,
    },
    appSource: { packageVersion: '0.18.0', demoLaneIds: ['lane-demo'], demoIssueIds: ['#201'] },
    comparison: { commonTaskIds: [], exportSourceMismatches: [], checkedExportSources: 0, unverifiedExportSources: 0 },
    sources: [{ scope: 'movies', path: 'workspace.json', sha256: 'a'.repeat(64) }],
  };
}

test('accepts canonical local data without inventing lanes or live budget', () => {
  const value = validateSnapshot(fixture());
  assert.equal(value.movies.tasks.length, 2);
  assert.equal(value.movies.tasks[1].status, 'blocked');
  assert.equal(value.runtimeCoordinator, null);
  assert.equal(value.movies.tasks[1].title, '<img src=x onerror=alert(1)>');
  assert.equal(value.lanes, undefined);
  assert.equal(value.budget, undefined);
});

test('refuses demo/runtime data, duplicate tasks and unknown roles', () => {
  for (const change of [
    x => x.mode = 'live',
    x => x.runtimeCoordinator = { healthy: true },
    x => x.movies.tasks[1].id = 'T01',
    x => x.movies.tasks[1].ownerRole = 'unassigned',
    x => x.movies.taskStates.blocked = 5,
    x => x.sources[0].sha256 = 'invalid',
  ]) {
    const value = fixture(); change(value);
    assert.throws(() => validateSnapshot(value), /Snapshot/);
  }
});

test('accepts local hosts and refuses public origins before file import', () => {
  for (const hostname of ['127.0.0.1', 'localhost', '[::1]']) {
    assert.equal(localOrigin({ protocol: 'http:', hostname }), true);
  }
  assert.equal(localOrigin({ protocol: 'file:', hostname: '' }), true);
  assert.equal(localOrigin({ protocol: 'https:', hostname: 'agent-parley.ai.studio' }), false);
  assert.equal(localOrigin({ protocol: 'http:', hostname: '127.0.0.1.evil.test' }), false);
});
