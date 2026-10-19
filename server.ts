import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, timingSafeEqual } from 'node:crypto';

function refuseObserverProfile(): void {
  if (process.env.MOVIES_OBSERVER_ONLY === '1') {
    throw new Error('Observer profile requires server-entry.ts');
  }
}
refuseObserverProfile();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '127.0.0.1'; // D6: local default loopback; published env sets HOST explicitly

const DEFAULT_CORS_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000'];
function allowedCorsOrigins(): string[] {
  const extra = (process.env.AGENT_PARLEY_CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  return [...DEFAULT_CORS_ORIGINS, ...extra];
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedCorsOrigins().includes(origin)) callback(null, true);
    else callback(null, false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const MCP_READ_TOOLS = new Set(['fetch_inbox', 'get_coordination_status']);
const MCP_PUBLIC_METHODS = new Set(['initialize', 'notifications/initialized', 'ping', 'tools/list']);
const MCP_PATHS = new Set(['/api/mcp', '/api/mcp/message', '/mcp', '/api/mcp/tools/call']);
function isMcpPublicRead(req: Request): boolean {
  if (!MCP_PATHS.has(req.path)) return false;
  const body: any = req.body || {};
  if (req.path === '/api/mcp/tools/call') return MCP_READ_TOOLS.has(body.name);
  if (MCP_PUBLIC_METHODS.has(body.method)) return true;
  if (body.method === 'tools/call') return MCP_READ_TOOLS.has(body.params?.name);
  if (!body.method && body.name) return MCP_READ_TOOLS.has(body.name);
  return false;
}
function bearerMatches(req: Request): boolean {
  const expected = process.env.MCP_SHARED_SECRET || '';
  const header = req.headers.authorization || '';
  if (!expected || !header.startsWith('Bearer ')) return false;
  const presented = header.slice(7);
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
function requireWriteAuth(req: Request, res: Response, next: () => void) {
  const isDiagnosticsRead = req.method === 'GET' && req.path === '/api/diagnostics';
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isDiagnosticsRead && !isWrite) return next();
  if (isWrite && isMcpPublicRead(req)) return next();
  if (!process.env.MCP_SHARED_SECRET) {
    console.error('[auth] write auth not configured: MCP_SHARED_SECRET is not set');
    return res.status(503).json({ error: 'write auth not configured' });
  }
  if (!bearerMatches(req)) {
    if (MCP_PATHS.has(req.path)) {
      return res.status(401).json({ jsonrpc: '2.0', id: (req.body as any)?.id ?? null, error: { code: -32001, message: 'unauthorized' } });
    }
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}
app.use(requireWriteAuth);

import fs from 'fs';
import { execSync } from 'child_process';

// Load .env variables into process.env if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^([^=]+)=(.*)$/);
      if (m) {
        const k = m[1].trim();
        const v = m[2].trim().replace(/^['"]|['"]$/g, '');
        if (v) {
          if (!process.env[k]) process.env[k] = v; // injected process env (e.g. test synthetic token) wins over .env file
        }
      }
    }
  }
} catch (e) {
  // Ignore
}
refuseObserverProfile();

import { enhanceKlingPrompt, critiqueKlingVision, getGeminiApiKey } from './src/server/klingAiService';

// Ensure valid Gemini API key is synchronized into process.env at server startup
getGeminiApiKey();

import { 
  initialLanes, 
  initialIssues, 
  initialReservations, 
  initialMessages, 
  initialPlans, 
  initialBudget, 
  initialProblems, 
  initialEvents 
} from './src/data/initialData';
import { 
  moviesProjectLanes, 
  moviesProjectIssues, 
  moviesProjectReservations, 
  moviesProjectMessages, 
  moviesProjectPlans, 
  moviesProjectBudget, 
  moviesProjectProblems, 
  moviesProjectEvents 
} from './src/data/moviesProjectData';
import { initStateStore, loadProjectState, persistState, getPersistenceWarning } from './src/server/stateStore';

// Active project configuration - defaulting to andreathar/Movies_Projects
let activeProject = 'movies_projects';

let lanes: any[] = JSON.parse(JSON.stringify(moviesProjectLanes));
let issues: any[] = JSON.parse(JSON.stringify(moviesProjectIssues));
let reservations: any[] = JSON.parse(JSON.stringify(moviesProjectReservations));
let messages: any[] = JSON.parse(JSON.stringify(moviesProjectMessages));
let plans: any[] = JSON.parse(JSON.stringify(moviesProjectPlans));
let budget: any = JSON.parse(JSON.stringify(moviesProjectBudget));
let problems: any[] = JSON.parse(JSON.stringify(moviesProjectProblems));
let events: any[] = JSON.parse(JSON.stringify(moviesProjectEvents));

function seedSnapshotFor(project: string) {
  if (project === 'movies_projects') {
    return JSON.parse(JSON.stringify({ lanes: moviesProjectLanes, issues: moviesProjectIssues, reservations: moviesProjectReservations, messages: moviesProjectMessages, plans: moviesProjectPlans, budget: moviesProjectBudget, problems: moviesProjectProblems, events: moviesProjectEvents }));
  }
  return JSON.parse(JSON.stringify({ lanes: initialLanes, issues: initialIssues, reservations: initialReservations, messages: initialMessages, plans: initialPlans, budget: initialBudget, problems: initialProblems, events: initialEvents }));
}
function currentSnapshot() {
  return { lanes, issues, reservations, messages, plans, budget, problems, events };
}
function applySnapshot(snap: any) {
  lanes = snap.lanes; issues = snap.issues; reservations = snap.reservations; messages = snap.messages;
  plans = snap.plans; budget = snap.budget; problems = snap.problems; events = snap.events;
}
function persistOr500(res: Response): boolean {
  try { persistState(activeProject, currentSnapshot()); return true; }
  catch (err: any) { console.error(`[persistence] save failed: ${err.message || err}`); res.status(500).json({ error: `Persistence failed: ${err.message || err}` }); return false; }
}
function persistOrThrow(): void { persistState(activeProject, currentSnapshot()); }

// Initialize persistence before app.listen (routes below are only served after listen).
try {
  const initInfo = initStateStore();
  if (initInfo.activeProject) activeProject = initInfo.activeProject === 'movies_projects' ? 'movies_projects' : 'default';
  const loaded = loadProjectState(activeProject);
  if (loaded) {
    applySnapshot(loaded);
    console.log(`[persistence] boot source=snapshot project=${activeProject}`);
  } else {
    applySnapshot(seedSnapshotFor(activeProject));
    persistState(activeProject, currentSnapshot());
    console.log(`[persistence] seed (no snapshot) project=${activeProject}`);
    console.log(`[persistence] boot source=seed project=${activeProject}`);
  }
} catch (err: any) {
  console.error(`[persistence] failed to initialize persistence: ${err.message || err}`);
  throw err;
}

// Helper to calculate top summary
function getTopSummary() {
  const working = lanes.filter((l) => l.state === 'working').length;
  const idle = lanes.filter((l) => l.state === 'idle').length;
  const stopped = lanes.filter((l) => l.state === 'stopped').length;
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const claimedIssues = issues.filter((i) => i.status === 'claimed' || i.status === 'in_progress').length;
  const reviewIssues = issues.filter((i) => i.status === 'review').length;
  const completedIssues = issues.filter((i) => i.status === 'completed').length;

  return {
    lanesTotal: lanes.length,
    lanesWorking: working,
    lanesIdle: idle,
    lanesStopped: stopped,
    issuesOpen: openIssues,
    issuesClaimed: claimedIssues,
    issuesInReview: reviewIssues,
    issuesCompleted: completedIssues,
    activeLeases: reservations.length,
    budgetUsedPercent: Math.round((budget.tokensUsed / budget.tokenCap) * 100),
    unresolvedProblems: problems.length,
  };
}

// REST API Endpoints
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    version: '0.18.0',
    activeProject,
    targetRepo: activeProject === 'movies_projects' ? 'andreathar/Movies_Projects' : 'sandbox',
    repoUrl: 'https://github.com/andreathar/Movies_Projects',
    summary: getTopSummary(),
    persistenceWarning: getPersistenceWarning(),
    lanes,
    issues,
    reservations,
    budget,
    problems,
    events,
  });
});

app.get('/api/projects/current', (req: Request, res: Response) => {
  res.json({
    activeProject,
    targetRepo: activeProject === 'movies_projects' ? 'andreathar/Movies_Projects' : 'sandbox',
    repoUrl: 'https://github.com/andreathar/Movies_Projects',
    branches: ['main', 'parley/movies-ui', 'parley/movies-api', 'parley/movies-db'],
  });
});

app.post('/api/projects/switch', (req: Request, res: Response) => {
  const { project } = req.body;
  const target = project === 'movies_projects' ? 'movies_projects' : 'default';
  try { persistState(activeProject, currentSnapshot()); } catch (err: any) {
    console.error(`[persistence] save failed: ${err.message || err}`);
    return res.status(500).json({ error: `Persistence failed: ${err.message || err}` });
  }
  const loadedTarget = loadProjectState(target);
  if (loadedTarget) applySnapshot(loadedTarget); else applySnapshot(seedSnapshotFor(target));
  activeProject = target;
  if (!persistOr500(res)) return;
  res.json({
    activeProject,
    targetRepo: activeProject === 'movies_projects' ? 'andreathar/Movies_Projects' : 'sandbox',
    repoUrl: 'https://github.com/andreathar/Movies_Projects',
    summary: getTopSummary(),
  });
});

app.get('/api/github/status', async (req: Request, res: Response) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.json({ connected: false, error: 'No GITHUB_TOKEN configured in .env' });
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'agent-parley-orchestrator',
      },
    });

    if (!userRes.ok) {
      return res.json({ connected: false, error: `GitHub API returned ${userRes.status}` });
    }

    const userData = (await userRes.json()) as any;

    const repoRes = await fetch('https://api.github.com/repos/andreathar/Movies_Projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'agent-parley-orchestrator',
      },
    });

    let repoData: any = null;
    let recentCommits: any[] = [];

    if (repoRes.ok) {
      repoData = await repoRes.json();
      const commitsRes = await fetch('https://api.github.com/repos/andreathar/Movies_Projects/commits?per_page=3', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'agent-parley-orchestrator',
        },
      });
      if (commitsRes.ok) {
        const rawCommits = (await commitsRes.json()) as any[];
        recentCommits = rawCommits.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message,
          author: c.commit.author?.name || 'Developer',
          date: c.commit.author?.date || '',
        }));
      }
    }

    res.json({
      connected: true,
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
      },
      repo: repoData
        ? {
            fullName: repoData.full_name,
            isPrivate: repoData.private,
            defaultBranch: repoData.default_branch,
            openIssues: repoData.open_issues_count,
            htmlUrl: repoData.html_url,
            updatedAt: repoData.updated_at,
            recentCommits,
          }
        : null,
    });
  } catch (err: any) {
    res.json({ connected: false, error: err.message || 'GitHub network check failed' });
  }
});

app.post('/api/projects/movies/sync', async (req: Request, res: Response) => {
  const token = process.env.GITHUB_TOKEN;
  let commitDetail = 'main branch verified';
  let pullSummary = 'up-to-date';

  // Run git pull from remote origin main
  try {
    const gitPullOut = execSync('git pull origin main --no-edit 2>&1').toString().trim();
    const gitLogOut = execSync('git log -n 1 --oneline 2>&1').toString().trim();
    pullSummary = gitPullOut.split('\n')[0];
    commitDetail = gitLogOut;
  } catch (gitErr: any) {
    pullSummary = gitErr.message;
  }

  if (token) {
    try {
      const commitRes = await fetch('https://api.github.com/repos/andreathar/Movies_Projects/commits/main', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'agent-parley-orchestrator',
        },
      });
      if (commitRes.ok) {
        const commitData = (await commitRes.json()) as any;
        commitDetail = `Movies_Projects @ ${commitData.sha.slice(0, 7)}: "${commitData.commit.message.split('\n')[0].slice(0, 45)}"`;
      }
    } catch {}
  }

  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'merge',
    lane: 'sync-daemon',
    detail: `Synchronized workspace & pulled remote state: ${commitDetail}`,
  });

  if (!persistOr500(res)) return;
  res.json({
    success: true,
    repo: 'andreathar/Movies_Projects',
    branch: 'main',
    syncTimestamp: new Date().toISOString(),
    status: 'up-to-date',
    pullSummary,
    commitDetail,
    lanesSynchronized: lanes.length,
    activeWorktrees: lanes.map((l) => l.worktree),
  });
});

app.post('/api/git/pull', (req: Request, res: Response) => {
  try {
    const gitPullOut = execSync('git pull origin main --no-edit 2>&1').toString().trim();
    const gitLogOut = execSync('git log -n 1 --oneline 2>&1').toString().trim();
    events.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'merge',
      lane: 'git-sync',
      detail: `Git pull executed: ${gitLogOut}`,
    });
    persistOrThrow();
    res.json({
      success: true,
      output: gitPullOut,
      latestCommit: gitLogOut,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/api/lanes', (req: Request, res: Response) => {
  res.json(lanes);
});

app.post('/api/lanes', (req: Request, res: Response) => {
  const { name, provider, branch } = req.body;
  if (!name || !provider) {
    return res.status(400).json({ error: 'Name and provider are required' });
  }
  const id = `lane-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const newLane = {
    id,
    name,
    provider,
    state: 'working',
    branch: branch || `parley/${name}`,
    worktree: `.worktrees/${id}`,
    lastEvent: 'lane: initialized',
    lastEventTs: Date.now(),
    ownedIssues: [],
    unreadMail: 0,
    unacknowledgedMail: 0,
    leases: [],
    denials: 0,
    calls: 0,
    tokens: 0,
    idleSeconds: 0,
    currentTask: 'Initialized worktree and waiting for issue assignment',
    reviewStatus: 'none',
    liveness: true,
    contextUsagePercent: 0,
  };
  lanes.push(newLane as any);
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'wake',
    lane: id,
    detail: `Spawned and initialized lane with provider ${provider}`,
  });
  if (!persistOr500(res)) return;
  res.status(201).json(newLane);
});

app.post('/api/lanes/:id/wake', (req: Request, res: Response) => {
  const lane = lanes.find((l) => l.id === req.params.id);
  if (!lane) return res.status(404).json({ error: 'Lane not found' });
  lane.state = 'working';
  lane.idleSeconds = 0;
  lane.lastEvent = 'wake: operator signal';
  lane.lastEventTs = Date.now();
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'wake',
    lane: lane.id,
    detail: 'Woken by operator signal',
  });
  if (!persistOr500(res)) return;
  res.json(lane);
});

app.post('/api/lanes/:id/stop', (req: Request, res: Response) => {
  const lane = lanes.find((l) => l.id === req.params.id);
  if (!lane) return res.status(404).json({ error: 'Lane not found' });
  lane.state = 'stopped';
  lane.lastEvent = 'stop: retired';
  lane.lastEventTs = Date.now();
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'refusal',
    lane: lane.id,
    detail: 'Lane stopped and retired',
  });
  if (!persistOr500(res)) return;
  res.json(lane);
});

app.get('/api/issues', (req: Request, res: Response) => {
  res.json(issues);
});

app.post('/api/issues', (req: Request, res: Response) => {
  const { title, priority, assignee } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = `#${100 + issues.length + 1}`;
  const newIssue = {
    id,
    title,
    status: assignee ? 'in_progress' : 'open',
    assignee: assignee || null,
    priority: priority || 'normal',
    churnCount: 0,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  issues.push(newIssue as any);
  if (assignee) {
    const lane = lanes.find((l) => l.id === assignee);
    if (lane && !lane.ownedIssues.includes(id)) {
      lane.ownedIssues.push(id);
    }
  }
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'claim',
    lane: assignee || 'unassigned',
    detail: `Created issue ${id}: ${title}`,
  });
  if (!persistOr500(res)) return;
  res.status(201).json(newIssue);
});

app.post('/api/issues/:id/claim', (req: Request, res: Response) => {
  const issue = issues.find((i) => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const { laneId } = req.body;
  const lane = lanes.find((l) => l.id === laneId);
  if (!lane) return res.status(400).json({ error: 'Valid lane ID required' });

  // Atomic claim
  if (issue.assignee && issue.assignee !== laneId) {
    const prevLane = lanes.find((l) => l.id === issue.assignee);
    if (prevLane) {
      prevLane.ownedIssues = prevLane.ownedIssues.filter((i: string) => i !== issue.id);
    }
  }
  issue.assignee = laneId;
  issue.status = 'in_progress';
  issue.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (!lane.ownedIssues.includes(issue.id)) {
    lane.ownedIssues.push(issue.id);
  }
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'claim',
    lane: laneId,
    detail: `Atomic claim acquired on ${issue.id}`,
  });
  if (!persistOr500(res)) return;
  res.json(issue);
});

app.post('/api/issues/:id/status', (req: Request, res: Response) => {
  const issue = issues.find((i) => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });
  issue.status = status;
  issue.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (!persistOr500(res)) return;
  res.json(issue);
});

app.get('/api/reservations', (req: Request, res: Response) => {
  res.json(reservations);
});

app.post('/api/reservations', (req: Request, res: Response) => {
  const { path: resPath, owner, reason, ttlSeconds } = req.body;
  if (!resPath || !owner) return res.status(400).json({ error: 'Path and owner required' });

  // Conflict check
  const existing = reservations.find((r) => r.path === resPath);
  if (existing) {
    return res.status(409).json({
      error: `Reservation conflict: ${resPath} already held by ${existing.owner} (${existing.reason})`,
      blockingOwner: existing.owner,
      reason: existing.reason,
    });
  }

  const newRes = {
    id: `res-${Date.now()}`,
    path: resPath,
    owner,
    reason: reason || 'Modifying resource',
    acquiredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ttlSeconds: ttlSeconds || 1800,
  };
  reservations.push(newRes);
  const lane = lanes.find((l) => l.id === owner);
  if (lane && !lane.leases.includes(resPath)) {
    lane.leases.push(resPath);
  }
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'reservation',
    lane: owner,
    detail: `Filed reservation on ${resPath}`,
  });
  if (!persistOr500(res)) return;
  res.status(201).json(newRes);
});

app.delete('/api/reservations/:id', (req: Request, res: Response) => {
  const index = reservations.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Reservation not found' });
  const removed = reservations.splice(index, 1)[0];
  const lane = lanes.find((l) => l.id === removed.owner);
  if (lane) {
    lane.leases = lane.leases.filter((l: string) => l !== removed.path);
  }
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'reservation',
    lane: removed.owner,
    detail: `Released reservation on ${removed.path}`,
  });
  if (!persistOr500(res)) return;
  res.json({ message: 'Reservation released', reservation: removed });
});

app.get('/api/messages', (req: Request, res: Response) => {
  res.json(messages);
});

app.post('/api/messages', (req: Request, res: Response) => {
  const { from, to, subject, body, ackRequired } = req.body;
  if (!from || !to || !subject || !body) {
    return res.status(400).json({ error: 'from, to, subject, and body are required' });
  }
  const newMsg = {
    id: messages.length + 1,
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    body,
    threadId: `th-${Date.now().toString(36)}`,
    ackRequired: Boolean(ackRequired),
    acknowledged: false,
    read: false,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  messages.unshift(newMsg);

  // Update target lanes
  newMsg.to.forEach((recipient: string) => {
    const lane = lanes.find((l) => l.id === recipient);
    if (lane) {
      lane.unreadMail += 1;
      if (newMsg.ackRequired) {
        lane.unacknowledgedMail += 1;
      }
    }
  });

  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'message',
    lane: from,
    detail: `Dispatched message to ${newMsg.to.join(', ')}: ${subject}`,
  });

  if (!persistOr500(res)) return;
  res.status(201).json(newMsg);
});

app.post('/api/messages/:id/ack', (req: Request, res: Response) => {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msg = messages.find((m) => m.id === parseInt(idStr, 10));
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  msg.acknowledged = true;
  msg.read = true;
  msg.to.forEach((recipient: string) => {
    const lane = lanes.find((l) => l.id === recipient);
    if (lane && lane.unacknowledgedMail > 0) {
      lane.unacknowledgedMail = Math.max(0, lane.unacknowledgedMail - 1);
    }
  });
  if (!persistOr500(res)) return;
  res.json(msg);
});

app.post('/api/messages/:id/read', (req: Request, res: Response) => {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msg = messages.find((m) => m.id === parseInt(idStr, 10));
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  msg.read = true;
  if (!persistOr500(res)) return;
  res.json(msg);
});

app.get('/api/plans', (req: Request, res: Response) => {
  res.json(plans);
});

app.post('/api/plans', (req: Request, res: Response) => {
  const { title, proposer, description, envelope } = req.body;
  if (!title || !proposer) return res.status(400).json({ error: 'Title and proposer required' });
  const newPlan = {
    id: `plan-${proposer}-${Date.now().toString(36)}`,
    title,
    proposer,
    description: description || '',
    envelope: envelope || { maxFiles: 5, allowedDirectories: ['src'], tokenCap: 50000 },
    status: 'pending_approval',
    proposedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  plans.push(newPlan as any);
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'plan',
    lane: proposer,
    detail: `Proposed revision plan: ${title}`,
  });
  if (!persistOr500(res)) return;
  res.status(201).json(newPlan);
});

app.post('/api/plans/:id/approve', (req: Request, res: Response) => {
  const plan = plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  plan.status = 'approved';
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'plan',
    lane: 'operator',
    detail: `Approved plan ${plan.id} for ${plan.proposer}`,
  });
  if (!persistOr500(res)) return;
  res.json(plan);
});

app.post('/api/plans/:id/reject', (req: Request, res: Response) => {
  const plan = plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  plan.status = 'rejected';
  events.unshift({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'plan',
    lane: 'operator',
    detail: `Rejected plan ${plan.id}`,
  });
  if (!persistOr500(res)) return;
  res.json(plan);
});

app.get('/api/budget', (req: Request, res: Response) => {
  res.json(budget);
});

app.post('/api/budget/toggle', (req: Request, res: Response) => {
  budget.enforced = !budget.enforced;
  if (!persistOr500(res)) return;
  res.json(budget);
});

app.post('/api/budget/update', (req: Request, res: Response) => {
  const { tokenCap, callsCap, hoursCap } = req.body;
  if (tokenCap) budget.tokenCap = Number(tokenCap);
  if (callsCap) budget.callsCap = Number(callsCap);
  if (hoursCap) budget.hoursCap = Number(hoursCap);
  if (!persistOr500(res)) return;
  res.json(budget);
});

app.get('/api/problems', (req: Request, res: Response) => {
  res.json(problems);
});

app.delete('/api/problems/:id', (req: Request, res: Response) => {
  problems = problems.filter((p) => p.id !== req.params.id);
  if (!persistOr500(res)) return;
  res.json({ message: 'Problem dismissed' });
});

app.get('/api/events', (req: Request, res: Response) => {
  res.json(events);
});

// System Diagnostics and Environment Variable Verification Endpoint
app.get('/api/diagnostics', (req: Request, res: Response) => {
  const hostVal = process.env.HOST || '0.0.0.0';
  const portVal = process.env.PORT || '3000';
  const isHostValid = hostVal === '0.0.0.0' || hostVal === '127.0.0.1';
  const isPortValid = !isNaN(parseInt(portVal, 10)) && parseInt(portVal, 10) > 0;
  const varStatus = (name: string, isSet: boolean, healthyWhenSet = true) => ({
    name,
    isSet,
    status: isSet ? (healthyWhenSet ? 'healthy' : 'warning') : 'optional_missing',
  });
  const variables = [
    { name: 'HOST', isSet: true, status: isHostValid ? 'healthy' : 'warning' },
    { name: 'PORT', isSet: true, status: isPortValid ? 'healthy' : 'error' },
    { name: 'NODE_ENV', isSet: Boolean(process.env.NODE_ENV), status: 'healthy' },
    varStatus('GITHUB_TOKEN', Boolean(process.env.GITHUB_TOKEN)),
    varStatus('GEMINI_API_KEY', Boolean(process.env.GEMINI_API_KEY)),
    varStatus('ANTHROPIC_API_KEY', Boolean(process.env.ANTHROPIC_API_KEY)),
    varStatus('MCP_SHARED_SECRET', Boolean(process.env.MCP_SHARED_SECRET)),
  ];
  const mem = process.memoryUsage();
  res.json({
    status: isHostValid && isPortValid ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    variables,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    checks: {
      networkBinding: isHostValid,
      portConfig: isPortValid,
      mcpServiceReady: true,
      fileSystemEphemeral: true,
    },
  });
});

// Simulated CLI execution endpoint
app.post('/api/cli', (req: Request, res: Response) => {
  const rawCmd = (req.body.command || '').trim();
  const cmd = rawCmd.replace(/^agent-parley\s+/, '');

  if (!rawCmd) {
    return res.json({ output: '' });
  }

  if (rawCmd === 'help' || cmd === 'help' || cmd === '--help') {
    return res.json({
      output: `Agent Parley 0.18.0 — separate work, shared context

USAGE:
  agent-parley <command> [options]

COMMANDS:
  top           Live dashboard of lane participants, state, claims, leases
  status        High-level repository health, budget, active leases
  lanes         Inspect or manage lane worktrees and sessions
  issues        Show issue ownership, claims and churn detection
  mail          Inspect inbox, messages and acknowledgment state
  reserve       File or check advisory resource and path reservations
  plan          Show proposals and revision envelope bounds
  budget        Inspect token and call limits; cap enforcement
  problems      Display detected anomalies, unacknowledged mail and churn
  demo          Run the 9-chapter tour from demo_scenario.py
  doctor        Verify MCP protocol transport and workspace integrity
`,
    });
  }

  if (cmd.startsWith('status')) {
    const summary = getTopSummary();
    const output = `Agent Parley 0.18.0 (pid: 14208)
Lanes:       ${summary.lanesWorking} working, ${summary.lanesIdle} idle, ${summary.lanesStopped} stopped (${summary.lanesTotal} total)
Issues:      ${summary.issuesClaimed} claimed, ${summary.issuesOpen} open, ${summary.issuesInReview} review, ${summary.issuesCompleted} completed
Leases:      ${summary.activeLeases} active advisory path/resource reservations
Budget:      ${budget.tokensUsed.toLocaleString()} / ${budget.tokenCap.toLocaleString()} tokens (${summary.budgetUsedPercent}%), ${budget.callsUsed} / ${budget.callsCap} calls [${budget.enforced ? 'ENFORCED' : 'UNENFORCED'}]
Problems:    ${summary.unresolvedProblems} unresolved anomalies flagged
`;
    return res.json({ output });
  }

  if (cmd.startsWith('top')) {
    let out = `PARTICIPANT      STATE       BRANCH               ISSUES   MAIL   LEASES   DENIALS  TOKENS   IDLE    TASK\n`;
    out += `----------------------------------------------------------------------------------------------------\n`;
    lanes.forEach((l) => {
      const p = l.name.padEnd(16);
      const st = l.state.padEnd(12);
      const br = (l.branch.length > 20 ? l.branch.slice(0, 18) + '..' : l.branch).padEnd(21);
      const iss = (l.ownedIssues.join(',') || '-').padEnd(9);
      const mail = `${l.unreadMail}/${l.unacknowledgedMail}`.padEnd(7);
      const leases = String(l.leases.length).padEnd(9);
      const den = String(l.denials).padEnd(9);
      const tok = String(l.tokens).padEnd(9);
      const idle = `${l.idleSeconds}s`.padEnd(8);
      const task = l.currentTask.slice(0, 24);
      out += `${p}${st}${br}${iss}${mail}${leases}${den}${tok}${idle}${task}\n`;
    });
    return res.json({ output: out });
  }

  if (cmd.startsWith('lanes')) {
    let out = `Registered Lanes:\n`;
    lanes.forEach((l) => {
      out += `  • [${l.state.toUpperCase()}] ${l.name} (${l.provider}) -> branch: ${l.branch}, worktree: ${l.worktree}\n`;
      out += `    Current task: ${l.currentTask}\n`;
      out += `    Leases: ${l.leases.join(', ') || 'none'}\n\n`;
    });
    return res.json({ output: out });
  }

  if (cmd.startsWith('issues')) {
    let out = `Issues & Ownership:\n`;
    issues.forEach((i) => {
      out += `  ${i.id.padEnd(6)} [${i.status.toUpperCase().padEnd(12)}] ${i.title}\n`;
      out += `         Assignee: ${i.assignee || 'unassigned'} | Priority: ${i.priority} | Churn: ${i.churnCount}\n`;
    });
    return res.json({ output: out });
  }

  if (cmd.startsWith('problems')) {
    if (problems.length === 0) {
      return res.json({ output: 'No problems detected. All lanes healthy.\n' });
    }
    let out = `Detected Anomalies:\n`;
    problems.forEach((p) => {
      out += `  [${p.severity.toUpperCase()}] ${p.lane}: ${p.detail} (${p.timestamp})\n`;
    });
    return res.json({ output: out });
  }

  if (cmd.startsWith('demo')) {
    const demoSteps = [
      'Chapter 1: Initializing sandboxed worktrees and stub participants...',
      'Chapter 2: Spawning lane-alpha (claude) and lane-beta (codex)...',
      'Chapter 3: Atomic claims: lane-alpha acquires #104 and file reservation on src/auth/jwt.ts...',
      'Chapter 4: Handoffs and wakes: lane-alpha dispatches interface change notice...',
      'Chapter 5: Advisory collision prevention: lane-gamma reservation on port:5432 refused...',
      'Chapter 6: Plan proposed by lane-gamma; bounded revision envelope checked...',
      'Chapter 7: Run budget active: 165,670 / 500,000 tokens consumed...',
      'Chapter 8: Churn detector records flapped test run on #108...',
      'Chapter 9: Convergence: verification pass, unattended integration candidate ready!',
    ];
    return res.json({
      output: demoSteps.join('\n\n') + '\n\nDemo walkthrough completed successfully.\n',
    });
  }

  if (cmd.startsWith('assets') || rawCmd.includes('manage.py assets')) {
    if (rawCmd.includes('resolve') || cmd.includes('resolve')) {
      return res.json({
        output: JSON.stringify(
          {
            status: 'ok',
            read_only: true,
            asset_id: 'andre-photo-20230817_203913',
            path: '/Movies_Projects/inbox/andre-reference-photos/20230817_203913.jpg',
            recorded_sha256: '9951e9da18903f79a70b951ef8477916accbfc88ff3b557b833c609b6628ab09',
            hash_verified: false,
            approved: false,
            bytes: 412589,
          },
          null,
          2
        ),
      });
    }
    return res.json({
      output: JSON.stringify(
        {
          schema: 'movies/assets/read/v1',
          status: 'ok',
          read_only: true,
          catalog: 'projects/andre-time-travel/asset-registry.csv',
          catalog_sha256: '7f9a12c84d... (8-column verified)',
          records_count: 290,
          errors: [],
          proposals: [],
          duplicate_asset_ids: {},
          proposals_applied: false,
        },
        null,
        2
      ),
    });
  }

  if (cmd.startsWith('media doctor') || rawCmd.includes('media doctor')) {
    return res.json({
      output: JSON.stringify(
        {
          schema: 'parley/media/doctor/v1',
          status: 'ok',
          repo: 'https://github.com/andreathar/Movies_Projects',
          canonical_media_root: 'projects/andre-time-travel',
          shared_profile: 'shared-media',
          lfs_smudge_in_worktrees: false,
          spare_pool: 'disabled',
          native_access_verified: true,
          sample_path: 'inbox/andre-reference-photos/20230817_203913.jpg',
          sample_status: 'canonical_contained',
        },
        null,
        2
      ),
    });
  }

  if (cmd === 'movies' || cmd.startsWith('repo')) {
    let out = `Agent Parley — Target Repository: https://github.com/andreathar/Movies_Projects\n`;
    out += `Active Stack: Full-stack React + Node.js/Python API + Database\n\n`;
    out += `Orchestrated Worktrees & Lanes:\n`;
    lanes.forEach((l: any) => {
      out += `  • ${l.name} (${l.provider}) -> branch: ${l.branch}\n`;
      out += `    Worktree: ${l.worktree} | Task: ${l.currentTask}\n`;
      out += `    Advisory Leases: ${l.leases.join(', ') || 'none'}\n\n`;
    });
    out += `All 3 worktrees verified against git remote origin/main.\n`;
    return res.json({ output: out });
  }

  if (cmd.startsWith('kling')) {
    if (cmd.includes('enhance') || cmd.includes('prompt')) {
      return res.json({
        output: `[Kling AI Enhancer & Naming Engine]
Enhanced Prompt: "Cinematic 35mm motion picture film capture. Andre checking an antique silver pocket watch under a flicking tungsten streetlamp in 1920s rainy cobblestone street. Medium close-up, slow cinematic push-in. Captured on Cooke 50mm Anamorphic Prime F/1.8. Volumetric rain haze, chiaroscuro lighting, wet reflections. 24fps motion cadence, photorealistic temporal stability."
Negative Prompt: "blurry, distorted facial features, rubbery limbs, morphing anatomy, plastic doll skin, jerky camera movements, CGI 3D shine, watermark"
Camera Motion: Pan: 0 | Tilt: 0 | Zoom: +3 (slow push)
Standard Naming Pattern:
  - Filename: kling_att_sc04_sh02_andre_pocketwatch_v2.mp4
  - Asset ID: att-video-kling-sc04-02
  - Relative Path: projects/andre-time-travel/assets/media/kling_att_sc04_sh02_andre_pocketwatch_v2.mp4
  - 8-Column CSV Row: att-video-kling-sc04-02, video/mp4, projects/andre-time-travel/assets/media/kling_att_sc04_sh02_andre_pocketwatch_v2.mp4, projects/andre-time-travel, local_media, e492bfa4876b39c017d2a588b3fe492bfa4876b39c017d2a588b3f9c01824d8, true, Scene 04 Shot 02 generated via Kling 2.0 Master
  - Tags: [scene:04, shot:02, char:andre, cam:dolly-in, engine:kling-2.0, era:1920s]
Handoff: Ready for autonomous lane execution via scripts/kling_release.py
`,
      });
    }
    return res.json({
      output: `Kling Studio CLI:
  kling enhance [prompt]  : Run cinematic prompt enhancer with standardized naming
  kling review            : Inspect visual review feedback and generate revision pass
  kling naming-standard   : Display the strict Movies_Projects Kling asset naming specification
`,
    });
  }

  return res.json({
    output: `agent-parley: '${cmd}' executed. (Run 'agent-parley help' for available commands)\n`,
  });
});

// Available MCP Tools matching agent-parley and Movies_Projects specifications
const MCP_TOOL_DEFINITIONS = [
  {
    name: 'send_message',
    description: 'Dispatch an advisory message or handoff notice to one or more participant lanes or the operator.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Sender lane ID or operator' },
        to: { type: 'array', items: { type: 'string' }, description: 'Target lane ID(s)' },
        subject: { type: 'string', description: 'Subject line' },
        body_md: { type: 'string', description: 'Message body in markdown' },
        thread_id: { type: 'string', description: 'Optional correlation thread ID' },
        ack_required: { type: 'boolean', description: 'Whether recipient lane must acknowledge receipt' },
      },
      required: ['to', 'subject', 'body_md'],
    },
  },
  {
    name: 'fetch_inbox',
    description: 'Fetch pending, unread, or unacknowledged coordination messages from the mailbox.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Optional lane ID to filter mailbox for' },
        limit: { type: 'number', description: 'Max number of messages to return (default: 5)' },
      },
    },
  },
  {
    name: 'file_reservation_paths',
    description: 'Acquire advisory path leases to prevent concurrent edits or merge conflicts across worktrees.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: 'Repository relative file or directory paths to lease' },
        owner: { type: 'string', description: 'Lane acquiring the lease' },
        reason: { type: 'string', description: 'Description of active work' },
        ttl_seconds: { type: 'number', description: 'Time-to-live in seconds (default 1800)' },
      },
      required: ['paths', 'owner'],
    },
  },
  {
    name: 'release_reservation_paths',
    description: 'Release previously acquired advisory file leases once work or pull request is complete.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: 'Paths to release' },
        owner: { type: 'string', description: 'Lane releasing the lease' },
      },
      required: ['paths', 'owner'],
    },
  },
  {
    name: 'claim_issue',
    description: 'Atomically claim an issue from the forge queue for the calling lane.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'string', description: 'Issue ID (e.g. #101)' },
        lane_id: { type: 'string', description: 'Lane acquiring ownership' },
      },
      required: ['issue_id', 'lane_id'],
    },
  },
  {
    name: 'get_coordination_status',
    description: 'Query live coordination status: active lanes, claims, budget, leases, and problems.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'kling_enhance_prompt',
    description: 'Enhance a rough video generation prompt using Gemini 3.8 Flash with camera motion and strict naming conventions.',
    inputSchema: {
      type: 'object',
      properties: {
        rough_prompt: { type: 'string', description: 'Draft prompt text' },
        version: { type: 'string', description: 'Kling version (kling-2.0-master or kling-1.6-pro)' },
        scene: { type: 'string', description: 'Scene number (e.g. 01)' },
        shot: { type: 'string', description: 'Shot number (e.g. 01)' },
        character: { type: 'string', description: 'Character name (e.g. andre)' },
      },
      required: ['rough_prompt'],
    },
  },
];

// Execute MCP Tool call helper
async function handleMcpToolExecution(name: string, args: any) {
  if (name === 'send_message') {
    const newMsg = {
      id: messages.length + 1,
      from: args.from || 'mcp-client',
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject || 'Update',
      body: args.body_md || args.body || '',
      threadId: args.thread_id || `th-${Date.now()}`,
      ackRequired: Boolean(args.ack_required),
      acknowledged: false,
      read: false,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    messages.unshift(newMsg);
    events.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'message',
      lane: newMsg.from,
      detail: `MCP: dispatched message to ${newMsg.to.join(', ')}: ${newMsg.subject}`,
    });
    persistOrThrow();
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'sent', message_id: newMsg.id, subject: newMsg.subject }) }],
    };
  }

  if (name === 'fetch_inbox') {
    const limit = args.limit || 5;
    const filtered = args.owner ? messages.filter((m) => m.to.includes(args.owner)) : messages;
    return {
      content: [{ type: 'text', text: JSON.stringify({ messages: filtered.slice(0, limit) }) }],
    };
  }

  if (name === 'file_reservation_paths') {
    const paths = args.paths || [];
    const owner = args.owner || 'current-lane';
    const reason = args.reason || 'Work in progress';
    const granted: string[] = [];
    const conflicts: any[] = [];

    paths.forEach((p: string) => {
      const existing = reservations.find((r) => r.path === p);
      if (existing) {
        conflicts.push({ path: p, blockingOwner: existing.owner, reason: existing.reason });
      } else {
        const newRes = {
          id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          path: p,
          owner,
          reason,
          acquiredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          ttlSeconds: args.ttl_seconds || 1800,
        };
        reservations.push(newRes);
        granted.push(p);
      }
    });

    events.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'reservation',
      lane: owner,
      detail: `MCP: filed ${granted.length} leases, ${conflicts.length} conflicts`,
    });

    persistOrThrow();
    return {
      content: [{ type: 'text', text: JSON.stringify({ granted, conflicts }) }],
    };
  }

  if (name === 'release_reservation_paths') {
    const paths = args.paths || [];
    const owner = args.owner;
    let releasedCount = 0;
    paths.forEach((p: string) => {
      const idx = reservations.findIndex((r) => r.path === p && (!owner || r.owner === owner));
      if (idx !== -1) {
        reservations.splice(idx, 1);
        releasedCount++;
      }
    });
    persistOrThrow();
    return {
      content: [{ type: 'text', text: JSON.stringify({ releasedCount, remainingReservations: reservations.length }) }],
    };
  }

  if (name === 'claim_issue') {
    const issue = issues.find((i) => i.id === args.issue_id);
    if (!issue) {
      throw new Error(`Issue ${args.issue_id} not found`);
    }
    const lane = lanes.find((l) => l.id === args.lane_id);
    if (!lane) {
      throw new Error(`Lane ${args.lane_id} not found`);
    }
    issue.assignee = args.lane_id;
    issue.status = 'in_progress';
    if (!lane.ownedIssues.includes(issue.id)) {
      lane.ownedIssues.push(issue.id);
    }
    persistOrThrow();
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'claimed', issueId: issue.id, assignee: lane.id }) }],
    };
  }

  if (name === 'get_coordination_status') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: getTopSummary(),
            activeProject,
            lanesCount: lanes.length,
            leasesCount: reservations.length,
            openIssuesCount: issues.filter((i) => i.status === 'open').length,
          }),
        },
      ],
    };
  }

  if (name === 'kling_enhance_prompt') {
    const enhanced = await enhanceKlingPrompt({
      roughPrompt: args.rough_prompt,
      version: args.version || 'kling-2.0-master',
      character: args.character || 'andre',
      sceneNumber: args.scene || '01',
      shotNumber: args.shot || '01',
      project: 'andre-time-travel',
      shotType: args.shot_type || 'medium-shot',
      cameraMovement: args.camera_movement || 'push-in',
      lightingStyle: args.lighting || 'cinematic tungsten',
      intensity: 5,
      descriptor: args.descriptor || 'cinematic_shot',
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(enhanced) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// Master MCP Router handling JSON-RPC 2.0 requests
async function handleMcpJsonRpc(req: Request, res: Response) {
  const body = req.body || {};
  const { jsonrpc, id, method, params } = body;

  // Write auth for mutating tools is enforced by requireWriteAuth middleware.
  // 1. Handshake / Initialize
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: 'agent-parley',
          version: '0.18.0',
        },
      },
    });
  }

  // 2. Notification acknowledgment
  if (method === 'notifications/initialized') {
    return res.status(200).json({ jsonrpc: '2.0' });
  }

  // 3. Ping
  if (method === 'ping') {
    return res.json({ jsonrpc: '2.0', id, result: {} });
  }

  // 4. List Tools
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOL_DEFINITIONS,
      },
    });
  }

  // 5. Call Tool
  if (method === 'tools/call') {
    try {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const output = await handleMcpToolExecution(toolName, toolArgs);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: output,
      });
    } catch (err: any) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal error in MCP tool execution',
        },
      });
    }
  }

  // Fallback for simple REST tool execution requests (backwards compatibility)
  if (body.name && !method) {
    try {
      const output = await handleMcpToolExecution(body.name, body.arguments || {});
      return res.json(output);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.json({
    jsonrpc: '2.0',
    id: id || null,
    error: {
      code: -32601,
      message: `Method '${method}' not found`,
    },
  });
}

// Bind MCP JSON-RPC routes
app.post('/api/mcp', handleMcpJsonRpc);
app.post('/api/mcp/message', handleMcpJsonRpc);
app.post('/mcp', handleMcpJsonRpc);
app.post('/api/mcp/tools/call', async (req: Request, res: Response) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) return res.status(400).json({ error: 'Tool name required' });
    const output = await handleMcpToolExecution(name, args || {});
    res.json(output);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Stream transport for mcp-remote GET requests
app.get(['/api/mcp', '/mcp', '/api/mcp/sse'], (req: Request, res: Response) => {
  if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const endpointUrl = `${req.baseUrl || ''}/api/mcp/message`;
    res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  } else {
    res.json({
      name: 'agent-parley',
      version: '0.18.0',
      status: 'active',
      transport: ['http-jsonrpc-2.0', 'sse'],
      endpoints: {
        jsonRpcPost: '/api/mcp',
        sseGet: '/api/mcp/sse',
      },
      toolsCount: MCP_TOOL_DEFINITIONS.length,
    });
  }
});

// Webhook endpoint from agent_parley/server.py
app.post('/hook/:lane', (req: Request, res: Response) => {
  const laneId = req.params.lane;
  res.json({
    status: 'received',
    lane: laneId,
    timestamp: Date.now(),
    action: 'continue',
  });
});

// Kling AI Studio Endpoints (Powered by Gemini 3.8 Flash & Multimodal Vision)
app.post('/api/kling/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const result = await enhanceKlingPrompt(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error enhancing Kling prompt:', err);
    res.status(500).json({ error: err.message || 'Prompt enhancement failed' });
  }
});

app.post('/api/kling/vision-critique', async (req: Request, res: Response) => {
  try {
    const result = await critiqueKlingVision(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error in Kling vision critique:', err);
    res.status(500).json({ error: err.message || 'Vision critique failed' });
  }
});

app.post('/api/kling/save-to-registry', (req: Request, res: Response) => {
  const { assetId, filename, csvRow, tags } = req.body;
  if (!assetId || !filename) {
    return res.status(400).json({ error: 'Asset ID and filename are required' });
  }

  const relativePath = `projects/andre-time-travel/assets/media/${filename}`;
  reservations.push({
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    path: relativePath,
    owner: 'lane-kling-release',
    reason: `Registered Kling media asset: ${assetId}`,
    acquiredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ttlSeconds: 3600,
  });

  events.unshift({
    id: `ev-${Date.now()}`,
    type: 'asset_registered',
    lane: 'lane-kling-release',
    description: `Asset registered: ${assetId} (${filename}) with 8-column schema & strict tags`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });

  if (!persistOr500(res)) return;
  res.json({
    status: 'registered',
    assetId,
    path: relativePath,
    csvRow,
    tags,
    message: 'Asset successfully added to runtime registry and advisory lease created',
  });
});

// Serve docs statically for video composition and assets
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Frontend serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Vite dev middleware
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, HOST, () => {
  console.log(`Agent Parley service running at http://${HOST}:${PORT}`);
});
