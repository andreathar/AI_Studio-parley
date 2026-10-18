import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { observerAssets } from '../src/server/observerServer.ts';
test('observer asset map selects its own view and never serves external links or private files', async (t) => {
    const root = await mkdtemp(path.join(tmpdir(), 'movies-observer-assets-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, 'dist/assets'), { recursive: true });
    await writeFile(path.join(root, 'dist/index.html'), '<html><link href="https://fonts.example.invalid/font.css"><body><div id="root"></div></body></html>');
    await writeFile(path.join(root, 'dist/assets/a.js'), 'export const value=1');
    await writeFile(path.join(root, 'dist/assets/private.env'), 'PRIVATE_SENTINEL');
    const assets = await observerAssets(root);
    assert.deepEqual([...assets.keys()], ['/', '/assets/a.js']);
    assert.ok(assets.get('/').body.toString().includes('data-movies-observer="1"'));
    assert.ok(!assets.get('/').body.toString().includes('fonts.example.invalid'));
    await writeFile(path.join(root, 'outside.js'), 'PRIVATE_SENTINEL');
    await symlink(path.join(root, 'outside.js'), path.join(root, 'dist/assets/escape.js'));
    await assert.rejects(observerAssets(root), /refused/);
});
test('observer entry and legacy direct entry refuse before environment file loading or listening', async (t) => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const temporary = await mkdtemp(path.join(tmpdir(), 'movies-observer-start-'));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    await writeFile(path.join(temporary, '.env'), 'PRIVATE_SENTINEL=not-a-real-credential\n');
    const tsx = path.join(root, 'node_modules/tsx/dist/loader.mjs');
    for (const file of ['server-entry.ts', 'server.ts']) {
        const child = spawnSync(process.execPath, ['--import', tsx, path.join(root, file)], {
            cwd: temporary, env: { PATH: process.env.PATH, MOVIES_OBSERVER_ONLY: '1', HOST: '127.0.0.1', PORT: '0' }, encoding: 'utf8', timeout: 5000,
        });
        assert.notEqual(child.status, 0, file);
        assert.equal(child.signal, null, file);
        assert.ok(!child.stdout.includes('PRIVATE_SENTINEL'));
        assert.ok(!child.stderr.includes('PRIVATE_SENTINEL'));
        if (file === 'server-entry.ts')
            assert.equal(child.stderr, 'Server start refused.\n');
    }
    await writeFile(path.join(temporary, '.env'), 'MOVIES_OBSERVER_ONLY=1\nPRIVATE_SENTINEL=synthetic-only\n');
    const envRequested = spawnSync(process.execPath, ['--import', tsx, path.join(root, 'server.ts')], {
        cwd: temporary, env: { PATH: process.env.PATH, HOST: '127.0.0.1', PORT: '0' }, encoding: 'utf8', timeout: 5000,
    });
    assert.notEqual(envRequested.status, 0);
    assert.equal(envRequested.signal, null);
    assert.ok(!envRequested.stderr.includes('PRIVATE_SENTINEL'));
});
