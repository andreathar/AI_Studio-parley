import React, { useState } from 'react';
import { 
  Film, 
  GitBranch, 
  GitPullRequest, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Database, 
  Code2, 
  ShieldCheck,
  Check,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface MoviesProjectBannerProps {
  activeProject: string;
  onSwitchProject: (project: string) => void;
  onSyncRepo: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  targetBaseBranch?: string;
  onSetTargetBaseBranch?: (branch: string) => void;
}

export const MoviesProjectBanner: React.FC<MoviesProjectBannerProps> = ({
  activeProject,
  onSwitchProject,
  onSyncRepo,
  isSyncing,
  lastSyncTime,
  targetBaseBranch = 'develop',
  onSetTargetBaseBranch,
}) => {
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [customBranch, setCustomBranch] = useState(targetBaseBranch);

  const handleSyncClick = async () => {
    await onSyncRepo();
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBranch.trim() && onSetTargetBaseBranch) {
      onSetTargetBaseBranch(customBranch.trim());
    }
    setIsEditingBranch(false);
  };

  const isMoviesMode = activeProject === 'movies_projects';

  return (
    <>
      <div className="bg-gradient-to-r from-[#161b22] via-[#1a2332] to-[#161b22] border-b border-[#30363d] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Left: Repository Identity & Branch Safety */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/20 text-[#58a6ff] border border-blue-500/30">
                <Film className="w-4 h-4 text-[#58a6ff]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#8b949e] text-[11px]">TARGET REPO:</span>
                  <a
                    href="https://github.com/andreathar/Movies_Projects"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#e6edf3] hover:text-[#58a6ff] flex items-center gap-1 transition"
                  >
                    <span>andreathar/Movies_Projects</span>
                    <ExternalLink className="w-3 h-3 text-[#8b949e]" />
                  </a>

                  {/* Configurable PR Target Base Branch */}
                  <div className="flex items-center gap-1 bg-[#21262d] border border-[#30363d] rounded px-1.5 py-0.5">
                    <span className="text-[#8b949e] text-[10px]">PR Target:</span>
                    {isEditingBranch ? (
                      <form onSubmit={handleBranchSubmit} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customBranch}
                          onChange={(e) => setCustomBranch(e.target.value)}
                          className="bg-[#0d1117] border border-[#1f6feb] text-[#58a6ff] text-[10px] px-1 py-0.2 rounded w-24 outline-none font-mono"
                          autoFocus
                          onBlur={() => setIsEditingBranch(false)}
                        />
                        <button type="submit" className="text-emerald-400 text-[10px] hover:underline">
                          Set
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsEditingBranch(true)}
                        className="text-[#58a6ff] font-bold hover:underline flex items-center gap-1 text-[11px]"
                        title="Click to change target base branch (e.g. develop, staging)"
                      >
                        <GitBranch className="w-2.5 h-2.5 text-[#58a6ff]" />
                        <span>{targetBaseBranch}</span>
                      </button>
                    )}
                  </div>

                  {/* Main Branch Protection Badge */}
                  <button
                    onClick={() => setShowSafetyModal(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Click to view main branch protection invariants"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>main: PROTECTED (Direct Push Blocked)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center: 3 Parallel Lanes Summary */}
          <div className="hidden lg:flex items-center gap-4 text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-1.5 bg-[#0d1117] px-2 py-0.5 rounded border border-[#21262d]">
              <Code2 className="w-3 h-3 text-amber-400" />
              <span className="text-[#c9d1d9]">Frontend:</span>
              <span className="text-amber-400 font-semibold">MovieGrid React UI</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0d1117] px-2 py-0.5 rounded border border-[#21262d]">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span className="text-[#c9d1d9]">Backend:</span>
              <span className="text-emerald-400 font-semibold">TMDB Proxy API</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0d1117] px-2 py-0.5 rounded border border-[#21262d]">
              <Database className="w-3 h-3 text-purple-400" />
              <span className="text-[#c9d1d9]">Database:</span>
              <span className="text-purple-400 font-semibold">Prisma / Postgres</span>
            </div>
          </div>

          {/* Right: Actions & Workspace Toggle */}
          <div className="flex items-center gap-2.5">
            {/* GitHub Sync Button */}
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition text-[11px]"
              title="Synchronize remote branch and issues status from GitHub"
            >
              <RefreshCw className={`w-3 h-3 text-[#58a6ff] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : showSyncSuccess ? 'Synced!' : 'Sync Repo'}</span>
              {lastSyncTime && !showSyncSuccess && (
                <span className="text-[10px] text-[#8b949e] hidden sm:inline">({lastSyncTime})</span>
              )}
            </button>

            {/* Workspace Toggle */}
            <button
              onClick={() => onSwitchProject(isMoviesMode ? 'default' : 'movies_projects')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition ${
                isMoviesMode
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40'
                  : 'bg-[#21262d] text-[#8b949e] border-[#30363d]'
              }`}
              title="Switch between Movies_Projects dedicated workspace and default sandbox"
            >
              {isMoviesMode ? (
                <ToggleRight className="w-4 h-4 text-[#58a6ff]" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-[#8b949e]" />
              )}
              <span>{isMoviesMode ? 'Movies_Projects Mode' : 'Sandbox Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Branch Protection Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-[#e6edf3]">
                  MAIN BRANCH PROTECTION GUARANTEE
                </h3>
              </div>
              <button
                onClick={() => setShowSafetyModal(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed space-y-1">
              <span className="font-bold text-emerald-300">Direct Pushes to Main Are Permanently Prohibited:</span>
              <p className="text-[11px] text-[#c9d1d9]">
                Agent Parley and its worker agents (Claude, Codex, OpenCode) will <strong>never push commits directly to <code>main</code></strong>. Your existing codebase and unmerged changes on <code>main</code> cannot be overwritten or broken.
              </p>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-[11px] text-[#8b949e] uppercase">
                3-Layer Isolation Architecture:
              </span>

              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                    <span>1. Dedicated Feature Worktrees</span>
                  </div>
                  <p className="text-[#8b949e]">
                    Agents only edit files inside isolated worktree folders (<code>.worktrees/movies-frontend</code>, etc.) on their own branch (e.g. <code>parley/movies-ui</code>). They never touch your local working copy on <code>main</code>.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>2. Pull Requests Target Secondary Branches</span>
                  </div>
                  <p className="text-[#8b949e]">
                    Completed work generates a GitHub Pull Request targeting <strong><code>{targetBaseBranch}</code></strong> (or a designated feature/staging branch), leaving <code>main</code> completely untouched.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d] space-y-1">
                  <div className="font-bold text-purple-400 flex items-center gap-1.5">
                    <span>3. Human-Controlled Merge & Conflict Resolution</span>
                  </div>
                  <p className="text-[#8b949e]">
                    If <code>main</code> has active changes, you can review the PR diff on GitHub or run <code>git rebase origin/main</code> on the feature branch. You remain the sole authority on what merges into production.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8b949e]">Change PR base branch:</span>
                <select
                  value={targetBaseBranch}
                  onChange={(e) => onSetTargetBaseBranch?.(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] text-[#58a6ff] px-2 py-1 rounded text-xs outline-none"
                >
                  <option value="develop">develop (Recommended)</option>
                  <option value="staging">staging</option>
                  <option value="feature/ai-integration">feature/ai-integration</option>
                  <option value="main">main (PR review required)</option>
                </select>
              </div>
              <button
                onClick={() => setShowSafetyModal(false)}
                className="px-3.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
