import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  FolderGit2, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Layers, 
  ArrowRight, 
  Copy, 
  Check, 
  Code2, 
  Lock, 
  Globe, 
  FileText, 
  GitBranch, 
  Play, 
  Info,
  Film,
  Sparkles
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'deployment' | 'models' | 'assets' | 'workflow' | 'boundaries'>('boundaries');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const localInstallCode = `# 1. Clone your project repository (e.g. Movies_Projects)
git clone https://github.com/andreathar/Movies_Projects.git
cd Movies_Projects

# 2. Start the Agent Parley coordination daemon
git clone https://github.com/suneel944/agent-parley.git parley-orchestrator
cd parley-orchestrator
npm install

# 3. Launch self-hosted service (binds to 0.0.0.0:3000)
npm run dev

# Optional: Run as background daemon via PM2 or systemd:
# npx pm2 start server.ts --name agent-parley`;

  const assetStructureCode = `Movies_Projects/
├── public/
│   └── assets/
│       └── king-ai/             <-- Local King.ai Media Asset Root
│           ├── posters/         <-- High-res movie posters (e.g. Inception.webp)
│           ├── backdrops/       <-- Banner art & carousel backgrounds
│           ├── trailers/        <-- MP4 clips or WebM previews (Git LFS)
│           └── metadata.json    <-- Generated TMDB metadata cache
├── src/
│   ├── components/
│   │   ├── MovieGrid.tsx        <-- Held by lane-frontend lease
│   │   └── MovieCard.tsx
├── server/
│   └── routes/
│       └── movies.ts            <-- Held by lane-backend lease
└── prisma/
    └── schema.prisma            <-- Held by lane-database lease`;

  return (
    <div className="space-y-6">
      {/* Title & Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
              SYSTEM ARCHITECTURE & OPERATIONAL GUIDE
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30">
              Interactive Guide
            </span>
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Deep dive into self-hosting, multi-model mechanics (Claude, Codex, OpenCode), and King.ai asset storage
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] p-1 rounded-lg font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveSection('deployment')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'deployment'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>1. Self-Hosted Setup</span>
          </button>

          <button
            onClick={() => setActiveSection('models')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'models'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Claude / Codex / OpenCode</span>
          </button>

          <button
            onClick={() => setActiveSection('assets')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'assets'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>3. King.ai Asset Storage</span>
          </button>

          <button
            onClick={() => setActiveSection('workflow')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'workflow'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>4. Operator Workflow</span>
          </button>

          <button
            onClick={() => setActiveSection('boundaries')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'boundaries'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Repo Separation & Boundaries</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Self-Hosted Deployment */}
      {activeSection === 'deployment' && (
        <div className="space-y-6">
          {/* Visual Architecture Box */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
                <Server className="w-4 h-4 text-[#58a6ff]" />
                <span>SELF-HOSTED INFRASTRUCTURE & WORKTREE TOPOLOGY</span>
              </div>
              <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Port 3000 Loopback IPC
              </span>
            </div>

            {/* Visual Box-Drawing Topology Diagram */}
            <pre className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] overflow-x-auto leading-relaxed">
{`┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   YOUR WORKSTATION OR DEDICATED HOST MACHINE (Linux / macOS / WSL)               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                        AGENT PARLEY COORDINATION SERVICE (PID: Node.js)                  │   │
│   │                        Host: 0.0.0.0:3000   │   Loopback: http://127.0.0.1:3000          │   │
│   ├──────────────────────────────────────────────────────────────────────────────────────────┤   │
│   │  • HTTP REST API (/api/status, /api/lanes, /api/issues, /api/reservations)               │   │
│   │  • MCP Tool Server (send_message, fetch_inbox, file_reservation_paths, claim_issues)     │   │
│   │  • Advisory Lease Referee (Tracks active file locks to prevent multi-agent collisions)    │   │
│   │  • React Web Dashboard (Live visual status board and operator control plane)             │   │
│   └─────────────────────────────────────────────┬────────────────────────────────────────────┘   │
│                                                 │                                                │
│                 ┌───────────────────────────────┼───────────────────────────────┐                │
│                 │ (Loopback MCP IPC)            │ (Loopback MCP IPC)            │                │
│                 ▼                               ▼                               ▼                │
│   ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐  │
│   │       lane-frontend       │   │       lane-backend        │   │       lane-database       │  │
│   │   Claude Code CLI / SDK   │   │     Codex / GPT-4o CLI    │   │   Gemini 2.5 / OpenCode   │  │
│   │  Worktree: .worktrees/fe  │   │  Worktree: .worktrees/be  │   │  Worktree: .worktrees/db  │  │
│   │  Branch: parley/movies-ui │   │  Branch: parley/movies-api│   │  Branch: parley/movies-db │  │
│   └─────────────┬─────────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘  │
│                 │                               │                               │                │
│                 └───────────────────────────────┼───────────────────────────────┘                │
│                                                 ▼                                                │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │               TARGET GIT REPOSITORY: https://github.com/andreathar/Movies_Projects       │   │
│   │  • Main Branch: origin/main (Production baseline)                                        │   │
│   │  • Worktree Branches: parley/movies-ui, parley/movies-api, parley/movies-db              │   │
│   │  • King.ai Media Assets: public/assets/king-ai/ (Stored locally, tracked in repo)        │   │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`}
            </pre>

            {/* Explanation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>How to Host & Access</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  The app is self-contained. Run <code>npm run dev</code> on any machine with Node.js 22. Access it in your browser at <code>http://localhost:3000</code> or over your private LAN.
                </p>
              </div>

              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Git Worktree Isolation</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  Instead of copying the repo 3 times, Git worktrees share the same <code>.git</code> database while checking out distinct branches into lightweight separate directories.
                </p>
              </div>

              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero External Cloud Costs</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  The coordination daemon and SQLite/in-memory ledger run 100% locally on your machine with zero cloud server overhead or mandatory third-party subscriptions.
                </p>
              </div>
            </div>

            {/* Terminal Quick Start Snippet */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[#8b949e]">
                <span>Self-Hosted Terminal Quickstart Commands:</span>
                <button
                  onClick={() => copySnippet(localInstallCode, 'install')}
                  className="flex items-center gap-1 text-[#58a6ff] hover:underline"
                >
                  {copiedCode === 'install' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Bash Script</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] overflow-x-auto leading-relaxed">
                {localInstallCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Multi-Model Mechanics (Claude, Codex, OpenCode) */}
      {activeSection === 'models' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>HOW CLAUDE, CODEX, AND OPENCODE WORK CONCURRENTLY</span>
              </div>
              <span className="text-amber-400 font-semibold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Model Context Protocol (MCP) Integration
              </span>
            </div>

            <p className="text-[#c9d1d9] leading-relaxed">
              Agent Parley acts as the <strong>authoritative referee</strong>. The models do not overwrite each other because they never work in the same Git branch simultaneously, and they communicate via standardized <strong>MCP tools</strong> over loopback:
            </p>

            {/* 3 Model Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Claude Card */}
              <div className="bg-[#0d1117] border border-amber-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-amber-400">Claude Code</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">Frontend Lane</span>
                </div>
                <div className="text-[11px] text-[#8b949e] space-y-1">
                  <div><strong>Provider:</strong> Anthropic Claude 3.5/3.7</div>
                  <div><strong>Worktree:</strong> <code>.worktrees/movies-frontend</code></div>
                  <div><strong>Active Task:</strong> MovieGrid & Card UI</div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-[#21262d] text-[10px] text-[#c9d1d9] leading-relaxed">
                  Claude reads the UI issue, requests a file lease on <code>src/components/MovieGrid.tsx</code>, writes responsive Tailwind markup, and runs tests inside its worktree before notifying backend peers.
                </div>
              </div>

              {/* Codex Card */}
              <div className="bg-[#0d1117] border border-emerald-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-emerald-400">Codex / GPT-4o</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Backend Lane</span>
                </div>
                <div className="text-[11px] text-[#8b949e] space-y-1">
                  <div><strong>Provider:</strong> OpenAI Codex CLI / API</div>
                  <div><strong>Worktree:</strong> <code>.worktrees/movies-backend</code></div>
                  <div><strong>Active Task:</strong> TMDB Proxy & Watchlist API</div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-[#21262d] text-[10px] text-[#c9d1d9] leading-relaxed">
                  Codex implements Express routes in <code>server/routes/movies.ts</code>. When it updates the movie response schema, it dispatches an inter-agent mail notice to Claude so frontend types stay in sync.
                </div>
              </div>

              {/* OpenCode / Gemini Card */}
              <div className="bg-[#0d1117] border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-purple-400">OpenCode / Gemini</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">Database Lane</span>
                </div>
                <div className="text-[11px] text-[#8b949e] space-y-1">
                  <div><strong>Provider:</strong> OpenCode / Ollama or Gemini</div>
                  <div><strong>Worktree:</strong> <code>.worktrees/movies-database</code></div>
                  <div><strong>Active Task:</strong> Prisma Schema & DDL</div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-[#21262d] text-[10px] text-[#c9d1d9] leading-relaxed">
                  OpenCode runs locally with zero API cost (or via Gemini API). It reserves <code>prisma/schema.prisma</code> and <code>port:5432</code>, applies database migrations, and self-retires once tasks finish.
                </div>
              </div>
            </div>

            {/* MCP Call Flow Sequence */}
            <div className="space-y-2 pt-2">
              <div className="text-[#8b949e] font-bold text-xs uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Model Coordination Protocol Execution Sequence</span>
              </div>

              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1f6feb] text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <div>
                    <strong className="text-[#e6edf3]">Model acquires atomic claim:</strong>
                    <span className="text-[#8b949e] ml-1">Calls <code>claim_issues({'{'} issue_id: '#201' {'}'})</code> over loopback. Parley registers ownership; other models receive claim refusal.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1f6feb] text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <div>
                    <strong className="text-[#e6edf3]">Model acquires advisory path lease:</strong>
                    <span className="text-[#8b949e] ml-1">Calls <code>file_reservation_paths({'{'} paths: ['server/routes/movies.ts'] {'}'})</code>. Parley grants the lease or returns the blocking owner with reason.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1f6feb] text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <div>
                    <strong className="text-[#e6edf3]">Model writes code in isolated worktree:</strong>
                    <span className="text-[#8b949e] ml-1">Changes are committed to <code>parley/movies-api</code>. Main branch remains clean and unpolluted.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1f6feb] text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                  <div>
                    <strong className="text-[#e6edf3]">Model dispatches wake & handoff mail:</strong>
                    <span className="text-[#8b949e] ml-1">Calls <code>send_message({'{'} to: ['lane-frontend'], subject: 'Schema ready' {'}'})</code>. Parley wakes the idle frontend lane to consume the change.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: King.ai Asset Storage Pipeline */}
      {activeSection === 'assets' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
                <Film className="w-4 h-4 text-purple-400" />
                <span>WHERE AND HOW KING.AI ASSETS ARE STORED & SERVED</span>
              </div>
              <span className="text-purple-400 font-semibold text-[11px] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Local Git Repository Storage
              </span>
            </div>

            <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-lg text-purple-200 space-y-1.5">
              <div className="font-bold flex items-center gap-2 text-sm text-[#d2a8ff]">
                <Sparkles className="w-4 h-4" />
                <span>Local Repository Asset Location</span>
              </div>
              <p className="text-xs text-[#c9d1d9] leading-relaxed">
                As selected in your setup, all <strong>King.ai movie posters, backdrops, and trailer assets</strong> are stored directly inside the local Git repository at <strong><code>public/assets/king-ai/</code></strong>. This keeps assets tightly coupled with the code and versioned together without external S3/Cloud Storage billing.
              </p>
            </div>

            {/* Tree representation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#8b949e]">
                <span>Recommended Repository Asset Directory Structure:</span>
                <button
                  onClick={() => copySnippet(assetStructureCode, 'tree')}
                  className="flex items-center gap-1 text-[#58a6ff] hover:underline"
                >
                  {copiedCode === 'tree' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Tree</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] overflow-x-auto leading-relaxed">
                {assetStructureCode}
              </pre>
            </div>

            {/* Key Invariants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Static Web Serving</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  The Node.js backend serves <code>public/</code> directly via static middleware. In React, reference images via <code>/assets/king-ai/posters/poster.webp</code>.
                </p>
              </div>

              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lease Lock Protection</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  When <code>lane-frontend</code> downloads or generates poster artwork, it acquires an advisory lease on <code>public/assets/king-ai/</code> so backend agents cannot overwrite media.
                </p>
              </div>

              <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Git LFS for Videos</span>
                </div>
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  For trailer MP4s or heavy video files exceeding 10MB, configure <code>git lfs track "*.mp4"</code> so your Git repository clone remains lightning fast.
                </p>
              </div>
            </div>

            {/* Canonical Shared Media Specialty from main */}
            <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Canonical Shared Media Engine (scripts/shared_media.py &amp; SHARED_MEDIA.md)</span>
                </div>
                <span className="text-purple-300 font-mono text-[10px] bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                  Commit 9e0eb71
                </span>
              </div>
              <p className="text-[#c9d1d9] text-[11px] leading-relaxed">
                In <strong>Movies_Projects main</strong>, heavy media files are anchored to one explicit canonical root. Agent lanes run in lightweight worktrees with index exclusions and zero LFS smudge overhead.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-white">8-Column Registry</span>
                  <p className="text-[#8b949e] text-[10px]">
                    Schema: <code>asset_id, kind, path_or_provider_id, path_base, source, sha256, approved, notes</code>. 290 catalog assets normalized.
                  </p>
                </div>
                <div className="p-2.5 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-white">Non-Destructive Outputs</span>
                  <p className="text-[#8b949e] text-[10px]">
                    <code>output_path()</code> guarantees derivatives cannot overlap canonical media or overwrite existing files.
                  </p>
                </div>
                <div className="p-2.5 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-white">CLI Validation</span>
                  <p className="text-[#8b949e] text-[10px]">
                    <code>manage.py assets validate</code> and <code>agent-parley media doctor</code> verify catalog integrity in read-only mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Daily Operator Walkthrough */}
      {activeSection === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
                <Play className="w-4 h-4 text-emerald-400 fill-current" />
                <span>HOW YOU ACTUALLY USE THE APPLICATION DAY TO DAY</span>
              </div>
              <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                End-to-End Walkthrough
              </span>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#58a6ff] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1f6feb] text-white flex items-center justify-center text-xs">1</span>
                    Start Server & Open the Top Dashboard
                  </span>
                  <span className="text-[10px] text-[#8b949e]">Top View Tab</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed">
                  Open <code>http://localhost:3000</code>. Check the 3 summary lines (Working lanes, Claimed issues, Budget percent, and Active Leases). You see your three dedicated lanes: <strong>lane-frontend</strong>, <strong>lane-backend</strong>, and <strong>lane-database</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#58a6ff] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1f6feb] text-white flex items-center justify-center text-xs">2</span>
                    Assign Work Items (Issues) to Specific Lanes
                  </span>
                  <span className="text-[10px] text-[#8b949e]">Issues Tab</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed">
                  Navigate to <strong>Issues & Claims</strong>. When you need a new movie feature (e.g. <code>#204: Fuzzy Movie Search API</code>), click <strong>New Work Item</strong> and assign it to <code>lane-backend</code>. The assignment is atomic, preventing other lanes from picking it up.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#58a6ff] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1f6feb] text-white flex items-center justify-center text-xs">3</span>
                    Monitor Active Leases & Prevent Collisions
                  </span>
                  <span className="text-[10px] text-[#8b949e]">Leases Tab</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed">
                  Check <strong>Advisory Leases</strong>. You see exactly which files each agent is touching (e.g. <code>src/components/MovieGrid.tsx</code> held by Claude, <code>server/routes/movies.ts</code> held by Codex). If an agent attempts to modify a peer's file, Parley's pre-checkout hooks refuse the branch switch with the blocking owner's reason.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#58a6ff] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1f6feb] text-white flex items-center justify-center text-xs">4</span>
                    Acknowledge Mail & Approve Plan Revisions
                  </span>
                  <span className="text-[10px] text-[#8b949e]">Mail & Plans Tabs</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed">
                  When a lane proposes an architectural change outside its envelope (e.g. adding a new video trailer package), it pauses and notifies you in <strong>Plans</strong>. You inspect the bounded revision envelope and click <strong>Approve</strong>. In <strong>Mail</strong>, you acknowledge handoffs to unlock unattended integration.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">5</span>
                    Safe Branch Isolation & PR Review (Zero Direct Pushes to Main)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Shield Enforced
                  </span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed">
                  Agents commit strictly to their isolated <code>parley/*</code> feature branches inside <code>.worktrees/</code>. They <strong>never push directly to <code>main</code></strong>. When ready, changes are submitted as a GitHub Pull Request targeting your review branch (e.g. <code>develop</code> or <code>staging</code>). Your <code>main</code> branch and its other active changes remain 100% untouched until you review the diff and choose to merge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Repo Separation & Boundaries FAQ */}
      {activeSection === 'boundaries' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>REPOSITORY BOUNDARIES & INVARIANTS: AGENT PARLEY VS. MOVIES_PROJECTS</span>
              </div>
              <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Strict Isolation Invariant
              </span>
            </div>

            {/* Crucial Question Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Are we going to merge them? NO — NEVER.</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed text-[11px]">
                  <strong>Agent Parley</strong> is the <em>coordination tool & harness</em> (like Git, Docker, or your editor). <strong>Movies_Projects</strong> is the <em>target product codebase</em>. You never merge Docker or your IDE into your project repo. Parley’s coordination state, locks, and logs remain 100% outside the target repository.
                </p>
              </div>

              <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-[#58a6ff] font-bold text-sm">
                  <FolderGit2 className="w-4 h-4 text-[#58a6ff]" />
                  <span>Do we need to create another repo? NO.</span>
                </div>
                <p className="text-[#c9d1d9] leading-relaxed text-[11px]">
                  Your existing <code>https://github.com/andreathar/Movies_Projects</code> is your movie app repository. Agent Parley is simply cloned into its own folder (e.g. <code>parley-orchestrator</code>) to coordinate work on your existing repo. You do not need a third repository.
                </p>
              </div>
            </div>

            {/* NEW: MAIN BRANCH PROTECTION GUARANTEE */}
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Will it break our repo if main has other changes? NO — Here is why:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-[#58a6ff]">1. Zero Direct Pushes</span>
                  <p className="text-[#8b949e]">
                    Neither Parley nor the agents will ever run <code>git push origin main</code>. All commits occur on feature branches like <code>parley/movies-ui</code>.
                  </p>
                </div>
                <div className="p-3 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-emerald-400">2. Target `develop` or Staging</span>
                  <p className="text-[#8b949e]">
                    You configure the PR base branch to <code>develop</code> or <code>staging</code>. Your active changes on <code>main</code> remain untouched and isolated.
                  </p>
                </div>
                <div className="p-3 bg-[#0d1117] rounded border border-[#30363d] space-y-1">
                  <span className="font-bold text-purple-400">3. Non-Destructive Rebasing</span>
                  <p className="text-[#8b949e]">
                    To sync other changes from <code>main</code>, agents run <code>git fetch origin main && git rebase</code> locally in their worktree. Any conflict is flagged in Parley for human review without touching GitHub.
                  </p>
                </div>
              </div>
            </div>

            {/* ASCII Directory Boundary Diagram */}
            <div className="space-y-2 pt-1">
              <div className="text-[#8b949e] font-bold text-xs uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Filesystem Separation Architecture</span>
              </div>
              <pre className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] overflow-x-auto leading-relaxed">
{`YOUR LOCAL MACHINE DISK:
├── ~/dev/agent-parley/              <-- [REPO A: COORDINATION TOOL]
│   ├── server.ts                    <-- Parley backend daemon & MCP tool server
│   ├── src/                         <-- Parley Web Dashboard UI (what you are viewing now)
│   ├── package.json                 <-- Dependencies for the coordinator
│   └── (Advisory leases & state)    <-- Stored HERE, never inside Movies_Projects!
│
└── ~/dev/Movies_Projects/           <-- [REPO B: YOUR PRODUCT REPOSITORY]
    ├── .git/                        <-- Shared Git database
    ├── public/                      <-- Your movie app assets & King.ai media
    ├── src/                         <-- Your real React / frontend application
    ├── server/ or api/              <-- Your real backend endpoints
    │
    └── .worktrees/ (Git worktrees)  <-- Parallel agent development branches (NEVER MAIN!)
        ├── fe/  (parley/movies-ui)  <-- Claude writes UI code on branch 'parley/movies-ui'
        ├── be/  (parley/movies-api) <-- Codex writes API code on branch 'parley/movies-api'
        └── db/  (parley/movies-db)  <-- OpenCode writes DB schemas on branch 'parley/movies-db'`}
              </pre>
            </div>

            {/* Explanation of Version Differences */}
            <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2.5">
              <div className="font-bold text-[#e6edf3] text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span>Why your actual Movies_Projects repo has a different version of code:</span>
              </div>
              <p className="text-[#c9d1d9] text-[11px] leading-relaxed">
                The mock items, files, and cards currently visible in this web dashboard (e.g., <code>MovieGrid.tsx</code>, <code>server/routes/movies.ts</code>) are <strong>seed demonstration templates</strong> to show how Agent Parley coordinates work items across multiple agents.
              </p>
              <p className="text-[#c9d1d9] text-[11px] leading-relaxed">
                When you connect Agent Parley to your actual <code>Movies_Projects</code> clone locally:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#8b949e] text-[11px] pl-2">
                <li><strong className="text-[#c9d1d9]">No code is overwritten on main:</strong> Parley creates isolated git branches (e.g. <code>parley/feature-xyz</code>) off your designated base branch without touching <code>main</code>.</li>
                <li><strong className="text-[#c9d1d9]">Agents read your real codebase:</strong> Claude, Codex, and OpenCode inspect your real files, components, and package dependencies in their worktrees.</li>
                <li><strong className="text-[#c9d1d9]">Pull Requests only:</strong> All modifications arrive as standard GitHub Pull Requests targeting <code>develop</code> or <code>staging</code> for your review.</li>
                <li><strong className="text-[#c9d1d9]">Zero pollution:</strong> No Agent Parley files or server code are ever committed to <code>Movies_Projects</code>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
