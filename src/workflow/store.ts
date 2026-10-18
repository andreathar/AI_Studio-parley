/** Transactional Movies cycle state. This module is not mounted by server.ts. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { APPLICATION_ID, MIGRATIONS, applyMigrations, validateSchema, digest } from './schema';
import { validateHandoff, type HandoffEvidence } from './handoff';
export class WorkflowError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
const fail = (message: string, status = 409): never => { throw new WorkflowError(status, message); };
const text = (v: unknown, max = 256): string => typeof v === 'string' && v.trim() && v.length <= max ? v : fail('Invalid text', 400);
const id = (v: unknown): string => { const s = text(v, 100); return /^[a-zA-Z0-9_.:-]+$/.test(s) ? s : fail('Invalid ID', 400); };
const sha = (v: unknown): string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? v : fail('Invalid digest', 400);
const safePath = (v: unknown): string => { const s = text(v, 1024); return !path.isAbsolute(s) && !s.includes('\\') && !s.split('/').some(x => !x || x === '.' || x === '..') ? s : fail('Invalid relative path', 400); };
const scope = (v: unknown): string => ['local_read_only', 'local_edit'].includes(String(v)) ? String(v) : fail('Only local work scopes supported', 400);
const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const json = (v: unknown): string => JSON.stringify(canonical(v));
export type TaskSpec = {
    id: string;
    title: string;
    role: string;
    scope: 'local_read_only' | 'local_edit';
    criteria: string;
    dependsOn: string[];
    requiresGate?: boolean;
};
export type CycleSpec = {
    cycleId?: string;
    handoffPolicy?: 'none' | 'movies/handoff/v1';
    projectId: string;
    episodeId: string;
    baseline: {
        head: string;
        registryDigest: string;
        policyDigest: string;
    };
    roles: string[];
    producerId: string;
    tasks: TaskSpec[];
};
export type CommandType = 'activate' | 'archive' | 'register_worker' | 'queue' | 'transport_sent' | 'transport_ack' | 'transport_uncertain' | 'accept' | 'start' | 'deliver' | 'review' | 'gate' | 'expire' | 'block' | 'unblock' | 'index_history';
export type AssignmentReference = {
    assignmentId: string;
    fence: string;
};
export type CommandData = {
    activate: Record<string, never>;
    archive: Record<string, never>;
    register_worker: {
        id: string;
        role: string;
        provider: string;
        kind: 'worker' | 'reviewer';
    };
    queue: {
        taskId: string;
        workerId: string;
    };
    transport_sent: {
        assignmentId: string;
        nativeReceipt: string;
    };
    transport_ack: {
        assignmentId: string;
        nativeReceipt: string;
    };
    transport_uncertain: {
        assignmentId: string;
    };
    accept: AssignmentReference;
    start: AssignmentReference;
    deliver: AssignmentReference & {
        handoff?: HandoffEvidence;
        deliveryKey: string;
        summary: string;
        artifacts: Array<{
            path: string;
            sha256: string;
        }>;
    };
    review: {
        receiptId: string;
        accept: boolean;
    };
    gate: {
        taskId: string;
        specDigest: string;
        scope: 'local_read_only' | 'local_edit';
        expiresAt: number;
        approved: boolean;
    };
    expire: {
        assignmentId: string;
    };
    unblock: {
        taskId: string;
    };
    block: {
        taskId: string;
        reason: string;
    };
    index_history: {
        source: string;
        sha256: string;
        authorClaim: string;
        revision: string;
    };
};
export type Command = {
    cycleId: string;
    expectedVersion: number;
    idempotencyKey: string;
} & {
    [K in CommandType]: {
        type: K;
        data: CommandData[K];
    };
}[CommandType];
export type WorkflowSnapshot = {
    schema: 'movies-workflow/read/v1';
    projectId: string;
    cycleId: string;
    status: 'draft' | 'active' | 'archived';
    graphRevision: number;
    stateVersion: number;
    baseline: CycleSpec['baseline'];
    handoffPolicy: 'none' | 'movies/handoff/v1';
    tasks: Array<TaskSpec & {
        revision: number;
        specDigest: string;
        requiresGate: boolean;
        status: string;
        reason: string;
        accountableActorId: string;
    }>;
    workers: Array<{
        id: string;
        role: string;
        kind: string;
        provider: string;
    }>;
    assignments: Array<{
        id: string;
        task_id: string;
        worker_id: string;
        state: string;
        transport_state: string;
        transport_ack: string | null;
    }>;
    receipts: Array<Record<string, unknown>>;
    gates: Array<Record<string, unknown>>;
    history: Array<Record<string, unknown>>;
    events: Array<Record<string, unknown>>;
};
export type CommandResult = {
    stateVersion: number;
    assignmentId?: string;
    fence?: string;
    receiptId?: string;
};
const keys: Record<CommandType, string[]> = { activate: [], archive: [], register_worker: ['id', 'role', 'provider', 'kind'], queue: ['taskId', 'workerId'], transport_sent: ['assignmentId', 'nativeReceipt'], transport_ack: ['assignmentId', 'nativeReceipt'], transport_uncertain: ['assignmentId'], accept: ['assignmentId', 'fence'], start: ['assignmentId', 'fence'], deliver: ['assignmentId', 'fence', 'deliveryKey', 'artifacts', 'summary'], review: ['receiptId', 'accept'], gate: ['taskId', 'specDigest', 'scope', 'expiresAt', 'approved'], expire: ['assignmentId'], block: ['taskId', 'reason'], unblock: ['taskId'], index_history: ['source', 'sha256', 'authorClaim', 'revision'] };
/** One writer connection, exclusive ownership file, no stale-lock stealing. */
export class WorkflowStore {
    private db!: DatabaseSync;
    private lock: string;
    private token: string;
    private closed = false;
    private clock: () => number;
    constructor(public readonly dbPath: string, options: {
        create?: boolean;
        migrate?: boolean;
        now?: () => number;
    } = {}) {
        this.clock = options.now ?? Date.now;
        this.lock = dbPath + '.writer';
        this.token = randomUUID();
        if (!path.isAbsolute(dbPath) || fs.existsSync(dbPath) && (fs.lstatSync(dbPath).isSymbolicLink() || fs.statSync(dbPath).nlink !== 1))
            fail('Unsafe database path', 400);
        if (!fs.existsSync(dbPath) && !options.create)
            fail('Workflow database missing', 503);
        if (fs.realpathSync(path.dirname(dbPath)) !== path.resolve(path.dirname(dbPath)))
            fail('Symlinked storage directory refused', 400);
        const fd = fs.openSync(this.lock, 'wx', 0o600);
        fs.writeFileSync(fd, this.token);
        fs.closeSync(fd);
        try {
            this.db = new DatabaseSync(dbPath);
            this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA synchronous=FULL;');
            const version = Number((this.db.prepare('PRAGMA user_version').get() as any).user_version);
            const tables = this.db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
            const appId = Number((this.db.prepare('PRAGMA application_id').get() as any).application_id);
            if (tables.length && appId !== APPLICATION_ID)
                throw Error('Not a workflow database; use isolated migration');
            if (version > MIGRATIONS.length || options.migrate === false && version !== MIGRATIONS.length)
                throw Error('Unsupported workflow schema');
            if (tables.length)
                validateSchema(this.db, version);
            applyMigrations(this.db);
            validateSchema(this.db);
            this.db.exec('PRAGMA journal_mode=WAL');
            fs.chmodSync(dbPath, 0o600);
        }
        catch (error) {
            try {
                this.db!.close();
            }
            catch { }
            this.release();
            throw error;
        }
    }
    private release(): void {
        if (fs.existsSync(this.lock) && fs.readFileSync(this.lock, 'utf8') === this.token)
            fs.unlinkSync(this.lock);
    }
    close(): void {
        if (this.closed)
            return;
        this.db.close();
        this.closed = true;
        this.release();
    }
    private get(sql: string, ...args: any[]): any { return this.db.prepare(sql).get(...args); }
    private all(sql: string, ...args: any[]): any[] { return this.db.prepare(sql).all(...args); }
    private run(sql: string, ...args: any[]): void { this.db.prepare(sql).run(...args); }
    private transaction<T>(action: () => T): T {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const r = action();
            this.db.exec('COMMIT');
            return r;
        }
        catch (e) {
            this.db.exec('ROLLBACK');
            throw e;
        }
    }
    createCycle(spec: CycleSpec): WorkflowSnapshot {
        if (!['none', 'movies/handoff/v1'].includes(spec.handoffPolicy ?? 'none'))
            fail('Invalid handoff policy', 400);
        id(spec.projectId);
        id(spec.episodeId);
        id(spec.producerId);
        text(spec.baseline.head);
        sha(spec.baseline.registryDigest);
        sha(spec.baseline.policyDigest);
        if (!Array.isArray(spec.roles) || new Set(spec.roles).size !== spec.roles.length || !spec.roles.includes('producer') || !spec.roles.includes('qc'))
            fail('Invalid role registry', 400);
        spec.roles.forEach(id);
        if (!Array.isArray(spec.tasks) || spec.tasks.length > 100)
            fail('Invalid tasks', 400);
        const ids = new Set(spec.tasks.map(t => id(t.id)));
        if (ids.size !== spec.tasks.length)
            fail('Duplicate task ID', 400);
        const map = new Map(spec.tasks.map(t => [t.id, t]));
        for (const t of spec.tasks) {
            text(t.title);
            text(t.criteria, 4096);
            scope(t.scope);
            if (!spec.roles.includes(t.role) || !Array.isArray(t.dependsOn) || new Set(t.dependsOn).size !== t.dependsOn.length || t.dependsOn.some(x => !ids.has(x)))
                fail('Invalid role or dependency', 400);
        }
        const visiting = new Set<string>(), done = new Set<string>();
        const visit = (name: string) => {
            if (visiting.has(name))
                fail('Dependency cycle', 400);
            if (done.has(name))
                return;
            visiting.add(name);
            map.get(name)!.dependsOn.forEach(visit);
            visiting.delete(name);
            done.add(name);
        };
        ids.forEach(visit);
        const cycle = spec.cycleId === undefined ? randomUUID() : id(spec.cycleId);
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(cycle))
            fail('Cycle UUID required', 400);
        this.transaction(() => {
            const project = this.get('SELECT * FROM projects WHERE id=?', spec.projectId);
            if (project && project.episode_id !== spec.episodeId)
                fail('Project identity conflict');
            this.run('INSERT OR IGNORE INTO projects VALUES(?,?)', spec.projectId, spec.episodeId);
            this.run("INSERT INTO cycles(id,project_id,status,baseline,handoff_policy) VALUES(?,?,'draft',?,?)", cycle, spec.projectId, json(spec.baseline), spec.handoffPolicy ?? 'none');
            for (const role of spec.roles)
                this.run('INSERT INTO roles VALUES(?,?)', cycle, role);
            this.run("INSERT INTO workers VALUES(?,?,?,'producer','local')", cycle, spec.producerId, 'producer');
            for (const t of spec.tasks)
                this.run("INSERT INTO tasks(cycle_id,id,title,role,scope,criteria,spec_digest,requires_gate,state) VALUES(?,?,?,?,?,?,?,?,'planned')", cycle, t.id, t.title, t.role, t.scope, t.criteria, digest(json(t)), Number(!!t.requiresGate));
            for (const t of spec.tasks)
                for (const dep of t.dependsOn)
                    this.run('INSERT INTO dependencies VALUES(?,?,?)', cycle, t.id, dep);
        });
        return this.snapshot(cycle);
    }
    private eligible(cycle: string, t: any): boolean {
        const blocked = this.get("SELECT count(*) AS n FROM dependencies d JOIN tasks t ON t.cycle_id=d.cycle_id AND t.id=d.depends_on WHERE d.cycle_id=? AND d.task_id=? AND t.state<>'completed'", cycle, t.id).n;
        const gate = this.get('SELECT * FROM gates WHERE cycle_id=? AND task_id=?', cycle, t.id);
        return !blocked && (!t.requires_gate || gate?.approved === 1 && gate.spec_digest === t.spec_digest && gate.scope === t.scope && gate.expires_at > this.clock());
    }
    private accountable(cycleId: string, taskId: string): string {
        const a = this.get('SELECT worker_id,state FROM assignments WHERE cycle_id=? AND task_id=? ORDER BY rowid DESC LIMIT 1', cycleId, taskId);
        if (a && ['accepted', 'running'].includes(a.state))
            return a.worker_id;
        return this.get("SELECT id FROM workers WHERE cycle_id=? AND kind='producer'", cycleId).id;
    }
    snapshot(cycleId: string): WorkflowSnapshot {
        const c = this.get('SELECT * FROM cycles WHERE id=?', id(cycleId));
        if (!c)
            fail('Cycle not found', 404);
        const tasks = this.all('SELECT * FROM tasks WHERE cycle_id=? ORDER BY rowid', cycleId).map(t => ({ id: t.id, title: t.title, role: t.role, scope: t.scope, criteria: t.criteria, revision: t.revision, specDigest: t.spec_digest, requiresGate: !!t.requires_gate, status: t.state === 'planned' && c.status === 'active' && this.eligible(cycleId, t) ? 'ready' : t.state, reason: t.reason, accountableActorId: this.accountable(cycleId, t.id), dependsOn: this.all('SELECT depends_on FROM dependencies WHERE cycle_id=? AND task_id=? ORDER BY depends_on', cycleId, t.id).map(d => d.depends_on) }));
        return { schema: 'movies-workflow/read/v1', projectId: c.project_id, cycleId: c.id, status: c.status, graphRevision: c.graph_revision, stateVersion: c.state_version, baseline: JSON.parse(c.baseline), handoffPolicy: c.handoff_policy, tasks, workers: this.all('SELECT id,role,kind,provider FROM workers WHERE cycle_id=? ORDER BY id', cycleId), assignments: this.all('SELECT a.*,o.state AS transport_state,o.native_receipt,o.transport_ack FROM assignments a JOIN outbox o ON o.assignment_id=a.id WHERE a.cycle_id=? ORDER BY a.rowid', cycleId), receipts: this.all('SELECT r.* FROM receipts r JOIN assignments a ON a.id=r.assignment_id WHERE a.cycle_id=? ORDER BY r.rowid', cycleId).map(r => ({ ...r, artifacts: this.all('SELECT path,sha256 FROM artifacts WHERE receipt_id=? ORDER BY path', r.id), handoff: (() => {
                    const h = this.get('SELECT * FROM receipt_handoffs WHERE receipt_id=?', r.id);
                    if (!h)
                        return null;
                    if (digest(h.payload) !== h.digest)
                        fail('Handoff integrity failure');
                    return JSON.parse(h.payload);
                })() })), gates: this.all('SELECT * FROM gates WHERE cycle_id=? ORDER BY task_id', cycleId), history: this.all('SELECT * FROM historical_documents WHERE cycle_id=? ORDER BY source,sha256', cycleId), events: this.all('SELECT version,actor,operation,detail,at FROM events WHERE cycle_id=? ORDER BY version', cycleId) };
    }
    command(actorId: string, envelope: Command): CommandResult {
        if (!envelope || Object.keys(envelope).sort().join() !== 'cycleId,data,expectedVersion,idempotencyKey,type' || !Object.hasOwn(keys, envelope.type))
            fail('Invalid command envelope', 400);
        const { cycleId, expectedVersion, idempotencyKey, type } = envelope;
        const data = envelope.data as Record<string, unknown>;
        id(cycleId);
        id(actorId);
        id(idempotencyKey);
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || !data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).filter(k => !(type === 'deliver' && k === 'handoff')).sort().join() !== [...keys[type]].sort().join())
            fail('Invalid command data', 400);
        const requestDigest = digest(json(envelope));
        return this.transaction(() => {
            const actor = this.get('SELECT * FROM workers WHERE cycle_id=? AND id=?', cycleId, actorId);
            if (!actor)
                fail('Unknown actor', 403);
            const old = this.get('SELECT * FROM command_results WHERE cycle_id=? AND actor=? AND idempotency_key=?', cycleId, actorId, idempotencyKey);
            if (old) {
                if (old.digest !== requestDigest)
                    fail('Idempotency payload conflict');
                return JSON.parse(old.result);
            }
            const c = this.get('SELECT * FROM cycles WHERE id=?', cycleId);
            if (c.state_version !== expectedVersion)
                fail('Revision conflict');
            if (c.status !== 'active' && !['activate', 'index_history'].includes(type))
                fail('Cycle inactive');
            const producer = () => {
                if (actor.kind !== 'producer')
                    fail('Producer operation', 403);
            };
            let result: any = {};
            let changed = true;
            const assignment = () => {
                const a = this.get('SELECT * FROM assignments WHERE id=? AND cycle_id=?', id(data.assignmentId), cycleId);
                if (!a)
                    fail('Assignment missing', 404);
                return a;
            };
            const task = (taskId: unknown) => {
                const t = this.get('SELECT * FROM tasks WHERE cycle_id=? AND id=?', cycleId, id(taskId));
                if (!t)
                    fail('Task missing', 404);
                return t;
            };
            const owned = (a: any) => {
                if (a.worker_id !== actorId || a.fence !== data.fence)
                    fail('Worker or fencing conflict', 403);
                if (a.expires_at <= this.clock())
                    fail('Lease expired');
                const t = task(a.task_id);
                if (a.task_revision !== t.revision || !this.eligible(cycleId, t))
                    fail('Task revision or gate invalid');
                return t;
            };
            switch (type) {
                case 'activate':
                    producer();
                    if (c.status !== 'draft')
                        fail('Cycle not draft');
                    this.run("UPDATE cycles SET status='active' WHERE id=?", cycleId);
                    break;
                case 'archive':
                    producer();
                    if (this.get("SELECT count(*) n FROM assignments WHERE cycle_id=? AND state IN ('queued','accepted','running','delivered')", cycleId).n)
                        fail('Pending assignments prevent archive');
                    this.run("UPDATE cycles SET status='archived' WHERE id=?", cycleId);
                    break;
                case 'register_worker':
                    producer();
                    id(data.id);
                    id(data.role);
                    text(data.provider);
                    if (!['worker', 'reviewer'].includes(String(data.kind)))
                        fail('Invalid worker kind', 400);
                    if (data.kind === 'reviewer' && data.role !== 'qc')
                        fail('QC reviewer role required', 400);
                    this.run('INSERT INTO workers VALUES(?,?,?,?,?)', cycleId, data.id, data.role, data.kind, data.provider);
                    break;
                case 'queue': {
                    producer();
                    const t = task(data.taskId);
                    const w = this.get('SELECT * FROM workers WHERE cycle_id=? AND id=?', cycleId, id(data.workerId));
                    if (!w || w.kind !== 'worker' || w.role !== t.role)
                        fail('Unknown or incompatible assignee', 400);
                    if (t.state !== 'planned' || !this.eligible(cycleId, t))
                        fail('Task not ready');
                    if (this.get("SELECT count(*) n FROM assignments WHERE cycle_id=? AND state IN ('queued','accepted','running')", cycleId).n >= 2)
                        fail('Concurrency cap reached');
                    const a = randomUUID(), f = randomUUID();
                    this.run("INSERT INTO assignments VALUES(?,?,?,?,?,?,?,'queued')", a, cycleId, t.id, w.id, t.revision, f, this.clock() + 900000);
                    this.run("INSERT INTO outbox(assignment_id,state) VALUES(?,'queued')", a);
                    this.run("UPDATE tasks SET state='assigned' WHERE cycle_id=? AND id=?", cycleId, t.id);
                    result = { assignmentId: a, fence: f };
                    break;
                }
                case 'transport_sent':
                case 'transport_ack':
                case 'transport_uncertain': {
                    producer();
                    const a = assignment();
                    if (a.state !== 'queued')
                        fail('Transport no longer pending');
                    const o = this.get('SELECT * FROM outbox WHERE assignment_id=?', a.id);
                    if (type === 'transport_sent') {
                        if (o.state === 'sent' && o.native_receipt !== data.nativeReceipt)
                            fail('Transport receipt conflict');
                        this.run("UPDATE outbox SET state='sent',native_receipt=? WHERE assignment_id=?", text(data.nativeReceipt), a.id);
                    }
                    else if (type === 'transport_ack') {
                        if (o.state !== 'sent')
                            fail('No confirmed send');
                        if (o.transport_ack && o.transport_ack !== data.nativeReceipt)
                            fail('ACK conflict');
                        this.run('UPDATE outbox SET transport_ack=? WHERE assignment_id=?', text(data.nativeReceipt), a.id);
                    }
                    else {
                        if (o.state !== 'queued')
                            fail('Cannot overwrite confirmed transport');
                        this.run("UPDATE outbox SET state='uncertain' WHERE assignment_id=?", a.id);
                    }
                    break;
                }
                case 'accept':
                case 'start': {
                    const a = assignment();
                    owned(a);
                    const o = this.get('SELECT * FROM outbox WHERE assignment_id=?', a.id);
                    if (type === 'accept') {
                        if (a.state !== 'queued' || o.state !== 'sent')
                            fail('Acceptance needs confirmed delivery');
                        this.run("UPDATE assignments SET state='accepted' WHERE id=?", a.id);
                    }
                    else {
                        if (a.state !== 'accepted')
                            fail('Task not accepted');
                        this.run("UPDATE assignments SET state='running' WHERE id=?", a.id);
                        this.run("UPDATE tasks SET state='in_progress' WHERE cycle_id=? AND id=?", cycleId, a.task_id);
                    }
                    break;
                }
                case 'deliver': {
                    const a = assignment();
                    owned(a);
                    const deliveryKey = id(data.deliveryKey);
                    text(data.summary, 4096);
                    if (!Array.isArray(data.artifacts) || !data.artifacts.length || data.artifacts.length > 32)
                        fail('Artifacts required', 400);
                    const arts = (data.artifacts as any[]).map((v: any) => {
                        if (!v || Object.keys(v).sort().join() !== 'path,sha256')
                            fail('Invalid artifact', 400);
                        return { path: safePath(v.path), sha256: sha(v.sha256) };
                    });
                    if (new Set(arts.map((x: {
                        path: string;
                    }) => x.path)).size !== arts.length)
                        fail('Duplicate artifact', 400);
                    let handoff: HandoffEvidence | undefined;
                    if (c.handoff_policy === 'movies/handoff/v1' || data.handoff !== undefined) {
                        try {
                            handoff = validateHandoff(data.handoff, task(a.task_id).role, arts);
                        }
                        catch {
                            fail('Complete versioned handoff evidence required', 400);
                        }
                    }
                    const d = digest(json({ summary: data.summary, artifacts: arts, ...(handoff ? { handoff } : {}) }));
                    const r = this.get('SELECT * FROM receipts WHERE assignment_id=? AND delivery_key=?', a.id, deliveryKey);
                    if (r) {
                        if (r.digest !== d)
                            fail('Delivery payload conflict');
                        result = { receiptId: r.id };
                        changed = false;
                        break;
                    }
                    if (a.state !== 'running')
                        fail('Task not running');
                    const receipt = randomUUID();
                    this.run("INSERT INTO receipts VALUES(?,?,?,?,?,'submitted',NULL)", receipt, a.id, deliveryKey, d, data.summary);
                    if (handoff) {
                        const payload = json(handoff);
                        this.run('INSERT INTO receipt_handoffs VALUES(?,?,?)', receipt, payload, digest(payload));
                    }
                    for (const art of arts)
                        this.run('INSERT INTO artifacts VALUES(?,?,?)', receipt, art.path, art.sha256);
                    this.run("UPDATE assignments SET state='delivered' WHERE id=?", a.id);
                    this.run("UPDATE tasks SET state='in_review' WHERE cycle_id=? AND id=?", cycleId, a.task_id);
                    result = { receiptId: receipt };
                    break;
                }
                case 'review': {
                    if (!['reviewer', 'producer'].includes(actor.kind))
                        fail('Reviewer required', 403);
                    if (typeof data.accept !== 'boolean')
                        fail('Invalid decision', 400);
                    const r = this.get('SELECT r.*,a.worker_id,a.cycle_id,a.task_id FROM receipts r JOIN assignments a ON a.id=r.assignment_id WHERE r.id=? AND a.cycle_id=?', id(data.receiptId), cycleId);
                    if (!r || r.state !== 'submitted' || r.worker_id === actorId)
                        fail('Review not permitted', 403);
                    if (data.accept && c.handoff_policy === 'movies/handoff/v1') {
                        const h = this.get('SELECT * FROM receipt_handoffs WHERE receipt_id=?', r.id);
                        if (!h || digest(h.payload) !== h.digest)
                            fail('Handoff evidence missing or changed');
                        try {
                            validateHandoff(JSON.parse(h.payload), task(r.task_id).role, this.all('SELECT path,sha256 FROM artifacts WHERE receipt_id=?', r.id));
                        }
                        catch {
                            fail('Handoff evidence invalid');
                        }
                    }
                    if (data.accept && !this.eligible(cycleId, task(r.task_id)))
                        fail('Approval gate or dependencies changed');
                    this.run('UPDATE receipts SET state=?,reviewer=? WHERE id=?', data.accept ? 'accepted' : 'rejected', actorId, r.id);
                    this.run("UPDATE assignments SET state='reviewed' WHERE id=?", r.assignment_id);
                    this.run('UPDATE tasks SET state=?,reason=? WHERE cycle_id=? AND id=?', data.accept ? 'completed' : 'blocked', data.accept ? '' : 'delivery rejected', cycleId, r.task_id);
                    break;
                }
                case 'gate': {
                    producer();
                    const t = task(data.taskId);
                    if (sha(data.specDigest) !== t.spec_digest || scope(data.scope) !== t.scope || typeof data.approved !== 'boolean' || !Number.isSafeInteger(data.expiresAt) || Number(data.expiresAt) <= this.clock())
                        fail('Invalid gate binding', 400);
                    this.run('INSERT INTO gates VALUES(?,?,?,?,?,?,?) ON CONFLICT(cycle_id,task_id) DO UPDATE SET spec_digest=excluded.spec_digest,scope=excluded.scope,expires_at=excluded.expires_at,approved=excluded.approved,issuer=excluded.issuer', cycleId, t.id, data.specDigest, data.scope, data.expiresAt, Number(data.approved), actorId);
                    break;
                }
                case 'expire': {
                    producer();
                    const a = assignment();
                    if (!['queued', 'accepted', 'running'].includes(a.state) || a.expires_at > this.clock())
                        fail('Lease not expired');
                    this.run("UPDATE assignments SET state='stale' WHERE id=?", a.id);
                    this.run("UPDATE tasks SET state='blocked',reason='lease expired' WHERE cycle_id=? AND id=?", cycleId, a.task_id);
                    break;
                }
                case 'block': {
                    producer();
                    const t = task(data.taskId);
                    if (t.state !== 'planned')
                        fail('Only unassigned tasks can be blocked');
                    this.run("UPDATE tasks SET state='blocked',reason=? WHERE cycle_id=? AND id=?", text(data.reason, 1024), cycleId, t.id);
                    break;
                }
                case 'unblock': {
                    producer();
                    const t = task(data.taskId);
                    if (t.state !== 'blocked')
                        fail('Task not blocked');
                    this.run("UPDATE tasks SET state='planned',reason='' WHERE cycle_id=? AND id=?", cycleId, t.id);
                    break;
                }
                case 'index_history':
                    producer();
                    this.run("INSERT INTO historical_documents VALUES(?,?,?,?,?,'historical_unverified')", cycleId, safePath(data.source), sha(data.sha256), text(data.authorClaim), text(data.revision));
                    break;
            }
            const version = expectedVersion + (changed ? 1 : 0);
            result = { ...result, stateVersion: version };
            if (changed) {
                this.run('UPDATE cycles SET state_version=? WHERE id=?', version, cycleId);
                this.run('INSERT INTO events(cycle_id,version,actor,operation,detail,at) VALUES(?,?,?,?,?,?)', cycleId, version, actorId, type, json(result), this.clock());
            }
            this.run('INSERT INTO command_results VALUES(?,?,?,?,?)', cycleId, actorId, idempotencyKey, requestDigest, json(result));
            return result;
        });
    }
}
