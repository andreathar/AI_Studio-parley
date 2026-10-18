import test from 'node:test';
import assert from 'node:assert/strict';
import { observationViewState } from '../src/online-movies-view.mjs';
import { observation } from './helpers/observation.mjs';
const now = Date.parse('2026-10-18T05:00:00Z');
test('never treats stale, future or absent observations as live lanes', () => {
    const envelope = { state: 'current', observation: observation(), expiresAt: '2026-10-18T05:15:00.000Z' };
    assert.equal(observationViewState(envelope, now).state, 'current');
    assert.equal(observationViewState(envelope, now + 91000).state, 'stale');
    assert.equal(observationViewState(envelope, now + 900000).state, 'expired');
    assert.equal(observationViewState({ ...envelope, observation: null }, now).state, 'offline');
    assert.throws(() => observationViewState(envelope, now - 31000), /refused/);
    const malicious = structuredClone(envelope);
    malicious.observation.productionTasks[0].title = '<script>PRIVATE</script>';
    assert.throws(() => observationViewState(malicious, now), /Observation/);
});
