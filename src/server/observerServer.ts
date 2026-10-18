import { createServer } from 'node:http';
import { readFile, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createObserverHandler, observerConfig } from './moviesObserverRouter';
import type { Asset } from './moviesObserverRouter';
/** Materialize a bounded public build; never resolve a request as a file path. */
export async function observerAssets(root: string): Promise<Map<string, Asset>> {
    const base = await realpath(path.join(root, 'dist'));
    const read = async (relative: string) => {
        const target = await realpath(path.join(base, relative));
        if (!target.startsWith(base + path.sep))
            throw Error('Observer assets refused');
        const bytes = await readFile(target);
        if (bytes.length > 4 * 1024 * 1024)
            throw Error('Observer assets refused');
        return bytes;
    };
    const html = (await read('index.html')).toString('utf8').replace(/<html\b/i, '<html data-movies-observer="1"')
        .replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>\s*/gi, '');
    const assets = new Map<string, Asset>([['/', { type: 'text/html; charset=utf-8', body: Buffer.from(html) }]]);
    const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    let total = Buffer.byteLength(html);
    for (const name of await readdir(path.join(base, 'assets'))) {
        if (!/^[A-Za-z0-9_.-]+\.(js|css|svg)$/.test(name))
            continue;
        const body = await read('assets/' + name);
        total += body.length;
        if (total > 20 * 1024 * 1024)
            throw Error('Observer assets refused');
        assets.set('/assets/' + name, { type: types[path.extname(name)], body });
    }
    return assets;
}
/** Bind only after the explicit runtime grant and build have been validated. */
export async function startObserver(env: NodeJS.ProcessEnv): Promise<void> {
    const config = observerConfig(env);
    const host = env.HOST || '127.0.0.1', port = Number(env.PORT || '3000');
    if (!['127.0.0.1', '0.0.0.0'].includes(host) || !Number.isInteger(port) || port < 1 || port > 65535)
        throw Error('Observer configuration refused');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const assets = await observerAssets(root);
    const server = createServer({ maxHeaderSize: 8192 }, createObserverHandler({ ...config, assets }));
    server.headersTimeout = 5000;
    server.requestTimeout = 10000;
    server.keepAliveTimeout = 1000;
    server.maxRequestsPerSocket = 20;
    server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
}
