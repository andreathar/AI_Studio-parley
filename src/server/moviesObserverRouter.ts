import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse, RequestListener } from 'node:http';
import { validateObservation, canonicalObservation, MAX_OBSERVATION_BYTES } from '../shared/moviesObservation.mjs';
import type { Observation } from '../shared/moviesObservation.mjs';
type Role = 'reader' | 'writer';
export type Authorizer = (role: Role, credential: string) => boolean;
export interface Asset {
    type: string;
    body: Buffer;
}
export interface ObserverConfig {
    origin: string;
    expiresAt: number;
    authorize: Authorizer;
    now?: () => number;
    assets?: Map<string, Asset>;
}
const ROOT = '/api/movies-observer';
const COOKIE = '__Host-movies-observer';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const refused = () => new Error('Observer configuration refused');
/** Authorize the two scopes independently, retaining only their digests. */
export function digestAuthorizer(readerDigest: string, writerDigest: string): Authorizer {
    if (!/^[a-f0-9]{64}$/.test(readerDigest) || !/^[a-f0-9]{64}$/.test(writerDigest) || readerDigest === writerDigest)
        throw refused();
    const expected = { reader: Buffer.from(readerDigest, 'hex'), writer: Buffer.from(writerDigest, 'hex') };
    return (role, credential) => typeof credential === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(credential) &&
        timingSafeEqual(Buffer.from(sha(credential), 'hex'), expected[role]);
}
/** Refuse absent grants, foreign origins and deadlines beyond the pilot cap. */
export function observerConfig(env: NodeJS.ProcessEnv, now = Date.now()): ObserverConfig {
    try {
        const origin = env.MOVIES_OBSERVER_ORIGIN;
        if (origin !== 'https://agent-parley.ai.studio')
            throw refused();
        const expiresAt = Date.parse(env.MOVIES_OBSERVER_EXPIRES_AT || '');
        if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + 900000)
            throw refused();
        return { origin, expiresAt, authorize: digestAuthorizer(env.MOVIES_OBSERVER_READER_SHA256 || '', env.MOVIES_OBSERVER_WRITER_SHA256 || '') };
    }
    catch {
        throw refused();
    }
}
function oneHeader(req: IncomingMessage, name: string): string | null {
    let count = 0;
    for (let i = 0; i < req.rawHeaders.length; i += 2)
        if (req.rawHeaders[i].toLowerCase() === name)
            count++;
    const value = req.headers[name];
    return count === 1 && typeof value === 'string' ? value : null;
}
function bearer(req: IncomingMessage): string {
    const value = oneHeader(req, 'authorization');
    return value?.startsWith('Bearer ') ? value.slice(7) : '';
}
function readerCookie(req: IncomingMessage): string {
    const cookies = (oneHeader(req, 'cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '='));
    return cookies.length === 1 ? cookies[0].slice(COOKIE.length + 1) : '';
}
/** Serve only observations and allowlisted assets, with no legacy fallback. */
export function createObserverHandler(config: ObserverConfig): RequestListener {
    const now = config.now || Date.now, started = now(), origin = new URL(config.origin);
    if (!Number.isFinite(config.expiresAt) || config.expiresAt <= started || config.expiresAt > started + 900000 || origin.origin !== config.origin)
        throw refused();
    let observation: Observation | null = null, lastSequence = 0, lastPublish = -Infinity, publishes = 0;
    const windows = new Map<string, {
        at: number;
        count: number;
    }>();
    const limited = (key: string, max: number) => {
        const t = now(), entry = windows.get(key);
        if (!entry || t - entry.at >= 60000) {
            windows.set(key, { at: t, count: 1 });
            return false;
        }
        entry.count++;
        return entry.count > max;
    };
    return (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        const finish = (code: number, data?: unknown) => {
            if (res.writableEnded)
                return;
            res.statusCode = code;
            if (data !== undefined) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            }
            else
                res.end();
        };
        const denied = (code: number) => { res.setHeader('Connection', 'close'); finish(code, { error: 'observer_request_refused' }); };
        const authenticate = (role: Role, credential: string) => {
            if (config.authorize(role, credential))
                return true;
            denied(limited('unauthorized', 30) ? 429 : 401);
            return false;
        };
        const handle = async () => {
            const path = req.url || '';
            if (path.includes('?') || path.includes('#'))
                return denied(400);
            if (oneHeader(req, 'host') !== origin.host)
                return denied(403);
            if (req.headers.origin && req.headers.origin !== config.origin)
                return denied(403);
            if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(req.headers['sec-fetch-site'])))
                return denied(403);
            if (req.method === 'OPTIONS')
                return denied(405);
            const isSession = path === ROOT + '/session', isSnapshot = path === ROOT + '/snapshot';
            if (!isSession && !isSnapshot) {
                const asset = config.assets?.get(path);
                if (!asset || req.method !== 'GET')
                    return denied(404);
                res.setHeader('Content-Type', asset.type);
                res.statusCode = 200;
                res.end(asset.body);
                return;
            }
            if (now() >= config.expiresAt) {
                observation = null;
                return denied(410);
            }
            if (isSession && req.method === 'POST') {
                if (req.headers.origin !== config.origin)
                    return denied(403);
                if (!authenticate('reader', bearer(req)))
                    return;
                if (limited('login', 10))
                    return denied(429);
                const seconds = Math.max(0, Math.floor((config.expiresAt - now()) / 1000));
                res.setHeader('Set-Cookie', `${COOKIE}=${bearer(req)}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${seconds}`);
                return finish(204);
            }
            if (isSession && req.method === 'DELETE') {
                if (req.headers.origin !== config.origin)
                    return denied(403);
                if (!authenticate('reader', readerCookie(req)))
                    return;
                res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);
                return finish(204);
            }
            if (isSnapshot && req.method === 'GET') {
                if (!authenticate('reader', readerCookie(req)))
                    return;
                if (limited('reads', 30))
                    return denied(429);
                return finish(200, { state: !observation ? 'offline' : now() - Date.parse(observation.observedAt) > 90000 ? 'stale' : 'current', observation, expiresAt: new Date(config.expiresAt).toISOString() });
            }
            if (!isSnapshot || req.method !== 'PUT')
                return denied(405);
            if (!authenticate('writer', bearer(req)))
                return;
            if (publishes >= 15 || now() - lastPublish < 60000)
                return denied(429);
            if (req.headers['content-type']?.split(';')[0] !== 'application/json' || (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity'))
                return denied(415);
            const declared = Number(req.headers['content-length']);
            if (Number.isFinite(declared) && declared > MAX_OBSERVATION_BYTES)
                return denied(413);
            const chunks: Buffer[] = [];
            let bytes = 0;
            for await (const chunk of req) {
                const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                bytes += part.length;
                if (bytes > MAX_OBSERVATION_BYTES)
                    return denied(413);
                chunks.push(part);
            }
            let value: Observation;
            try {
                value = validateObservation(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                if (sha(canonicalObservation(value)) !== value.digest || Math.abs(now() - Date.parse(value.observedAt)) > 30000)
                    return denied(400);
            }
            catch {
                return denied(400);
            }
            if (now() >= config.expiresAt) {
                observation = null;
                return denied(410);
            }
            if (value.sequence <= lastSequence)
                return denied(409);
            if (publishes >= 15 || now() - lastPublish < 60000)
                return denied(429);
            observation = value;
            lastSequence = value.sequence;
            lastPublish = now();
            publishes++;
            finish(204);
        };
        void handle().catch(() => denied(500));
    };
}
