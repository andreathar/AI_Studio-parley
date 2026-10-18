import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { observation } from './helpers/observation.mjs';
import { runtimeProfile } from '../server-entry.ts';
import { validateObservation, canonicalObservation } from '../src/shared/moviesObservation.mjs';
import { createObserverHandler, digestAuthorizer, observerConfig } from '../src/server/moviesObserverRouter.ts';
const NOW = Date.parse('2026-10-18T05:00:00Z');
const READER = 'synthetic-reader-not-a-real-credential-0001';
const WRITER = 'synthetic-writer-not-a-real-credential-0002';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(t) {
    let now = NOW;
    const handler = createObserverHandler({ origin: 'https://observer.invalid', expiresAt: NOW + 900000,
        authorize: digestAuthorizer(sha(READER), sha(WRITER)), now: () => now,
        assets: new Map([['/', { type: 'text/html', body: Buffer.from('<html>synthetic shell</html>') }]]),
    });
    const server = createServer(handler);
    server.requestTimeout = 1000;
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    async function call(method, path, { token, cookie, body, headers = {} } = {}) {
        return await new Promise((resolve, reject) => {
            const req = request({ host: '127.0.0.1', port: server.address().port, method, path, headers: {
                    Host: 'observer.invalid', ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers,
                } }, res => { let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text })); });
            req.on('error', reject);
            if (body)
                req.write(body);
            req.end();
        });
    }
    return { call, advance: ms => { now += ms; } };
}
test('strict schema rejects excluded private fields, foreign scope and forged data', () => {
    assert.equal(validateObservation(observation()).productionTasks[1].status, 'blocked');
    for (const mutate of [
        x => x.project = 'Other_Project', x => x.productionTasks[0].title = 'PRIVATE_SENTINEL',
        x => x.participants[0].credential = 'PRIVATE_SENTINEL', x => x.sources = ['/private/path'],
        x => x.productionTasks[1].dependsOn = ['T99'], x => x.productionTasks[1].id = 'T01',
        x => x.counts.assets = -1, x => x.participants[0].filmRoleId = 'producer',
        x => x.observedAt = 'invalid', x => x.filmRoles = ['editor', 'editor'],
        x => x.participants[0].id = '../../.env', x => x.productionTasks[0].command = 'rm -rf /',
        x => x.coordinator.state = 'healthy-demo', x => x.extra = 'PRIVATE_SENTINEL',
    ]) {
        const value = observation();
        mutate(value);
        assert.throws(() => validateObservation(value), /Observation/);
    }
});
test('separates writer ingestion from reader cookie and keeps unavailable distinct from seeds', async (t) => {
    const { call } = await fixture(t);
    assert.equal((await call('GET', '/api/movies-observer/snapshot')).status, 401);
    assert.equal((await call('POST', '/api/movies-observer/session', { token: WRITER, headers: { Origin: 'https://observer.invalid' } })).status, 401);
    assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: READER, body: JSON.stringify(observation()) })).status, 401);
    const login = await call('POST', '/api/movies-observer/session', { token: READER, headers: { Origin: 'https://observer.invalid' } });
    assert.equal(login.status, 204);
    const setCookie = login.headers['set-cookie'][0];
    for (const flag of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/'])
        assert.ok(setCookie.includes(flag));
    const cookie = setCookie.split(';')[0];
    const empty = await call('GET', '/api/movies-observer/snapshot', { cookie });
    assert.equal(empty.status, 200);
    assert.equal(JSON.parse(empty.text).state, 'offline');
    assert.equal(JSON.parse(empty.text).observation, null);
    assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: JSON.stringify(observation()) })).status, 204);
    const live = await call('GET', '/api/movies-observer/snapshot', { cookie });
    assert.equal(JSON.parse(live.text).state, 'current');
    assert.equal(JSON.parse(live.text).observation.productionTasks.length, 2);
    assert.equal(live.headers['cache-control'], 'no-store');
    assert.equal(live.headers['access-control-allow-origin'], undefined);
});
test('fails closed for every legacy control path without parsing its private body', async (t) => {
    const { call } = await fixture(t);
    for (const path of ['/api/status', '/api/diagnostics', '/api/cli', '/api/git/pull', '/api/lanes', '/api/messages', '/api/kling/enhance-prompt', '/mcp', '/api/mcp', '/hook/codex', '/.env']) {
        const result = await call('POST', path, { token: WRITER, body: 'PRIVATE_SENTINEL' });
        assert.equal(result.status, 404, path);
        assert.ok(!result.text.includes('PRIVATE_SENTINEL'));
    }
});
test('enforces integrity, sequence, publish pacing, total cap, stale and expiry', async (t) => {
    const { call, advance } = await fixture(t);
    const login = await call('POST', '/api/movies-observer/session', { token: READER, headers: { Origin: 'https://observer.invalid' } });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const forged = observation();
    forged.digest = '0'.repeat(64);
    assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: JSON.stringify(forged) })).status, 400);
    const put = value => call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: JSON.stringify(value) });
    assert.equal((await put(observation())).status, 204);
    assert.equal((await put(observation(2))).status, 429);
    advance(91000);
    assert.equal(JSON.parse((await call('GET', '/api/movies-observer/snapshot', { cookie })).text).state, 'stale');
    assert.equal((await put(observation(1, NOW + 91000))).status, 409);
    assert.equal((await put(observation(2, NOW + 91000))).status, 204);
    advance(900000);
    assert.equal((await call('GET', '/api/movies-observer/snapshot', { cookie })).status, 410);
    assert.equal((await put(observation(3, NOW + 991000))).status, 410);
});
test('rejects oversize, malformed, cross-origin, query-token and invalid encoding without logs', async (t) => {
    const { call } = await fixture(t);
    const logs = [];
    const original = { error: console.error, warn: console.warn, log: console.log };
    for (const key of Object.keys(original))
        console[key] = (...args) => logs.push(args);
    try {
        assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: 'x'.repeat(32769) })).status, 413);
        assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: '{"private":"PRIVATE_SENTINEL"' })).status, 400);
        assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: '{}', headers: { Origin: 'https://evil.invalid' } })).status, 403);
        assert.equal((await call('POST', '/api/movies-observer/session', { token: READER })).status, 403);
        assert.equal((await call('GET', `/api/movies-observer/snapshot?token=${READER}`)).status, 400);
        assert.equal((await call('OPTIONS', '/api/movies-observer/snapshot')).status, 405);
        assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: '{}', headers: { 'Content-Encoding': 'gzip' } })).status, 415);
        assert.deepEqual(logs, []);
    }
    finally {
        Object.assign(console, original);
    }
});
test('configuration refuses absent or equal scopes without echoing values', () => {
    for (const env of [{}, { MOVIES_OBSERVER_READER_SHA256: sha(READER), MOVIES_OBSERVER_WRITER_SHA256: sha(READER) }]) {
        assert.throws(() => observerConfig(env, NOW), /Observer configuration refused/);
    }
});
test('caps accepted writes at fifteen and reader polling at thirty per minute', async (t) => {
    const { call, advance } = await fixture(t);
    for (let sequence = 1; sequence <= 15; sequence++) {
        assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: JSON.stringify(observation(sequence, NOW + (sequence - 1) * 60000)) })).status, 204);
        if (sequence < 15)
            advance(60000);
    }
    assert.equal((await call('PUT', '/api/movies-observer/snapshot', { token: WRITER, body: JSON.stringify(observation(15, NOW + 840000)) })).status, 429);
    const login = await call('POST', '/api/movies-observer/session', { token: READER, headers: { Origin: 'https://observer.invalid' } });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    for (let i = 0; i < 30; i++)
        assert.equal((await call('GET', '/api/movies-observer/snapshot', { cookie })).status, 200);
    assert.equal((await call('GET', '/api/movies-observer/snapshot', { cookie })).status, 429);
});
test('runtime refuses ambiguous activation and Python agrees with the minimized checksum fixture', () => {
    assert.equal(runtimeProfile({}), 'demo');
    assert.equal(runtimeProfile({ MOVIES_OBSERVER_ONLY: '1' }), 'observer');
    assert.throws(() => runtimeProfile({ MOVIES_OBSERVER_ONLY: 'true' }), /refused/);
    const stdout = execFileSync('python3', ['-B', '-c',
        'import json,sys; from scripts.movies_publish import validate_wire; validate_wire(json.load(sys.stdin)); print("accepted")'], { input: JSON.stringify(observation()), encoding: 'utf8' });
    assert.equal(stdout.trim(), 'accepted');
});
