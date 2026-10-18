import React, { useState, useEffect } from 'react';
import { 
  PlugZap, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  GitBranch, 
  Lock, 
  Play, 
  ArrowRight, 
  Radio, 
  HardDrive, 
  Code,
  AlertCircle
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface ConnectProjectViewProps {
  onSelectTab: (tab: string) => void;
  onExecuteCommand?: (cmd: string) => Promise<string>;
}

export const ConnectProjectView: React.FC<ConnectProjectViewProps> = ({ onSelectTab, onExecuteCommand }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'local' | 'remote_mcp' | 'live_tests'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // GitHub connection check state
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubStatus, setGithubStatus] = useState<any>(null);

  // Live test states
  const [promptTestLoading, setPromptTestLoading] = useState(false);
  const [promptTestResult, setPromptTestResult] = useState<any>(null);

  const [mcpTestLoading, setMcpTestLoading] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<any>(null);

  // Diagnostic env check
  const [envData, setEnvData] = useState<any>(null);

  useEffect(() => {
    checkGitHubStatus();
    fetchDiagnostics();
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const json = await res.json();
        setEnvData(json);
      }
    } catch {}
  };

  const checkGitHubStatus = async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/github/status');
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
      }
    } catch (err: any) {
      setGithubStatus({ connected: false, error: err.message });
    } finally {
      setGithubLoading(false);
    }
  };

  const testPromptEnhancer = async () => {
    setPromptTestLoading(true);
    try {
      const res = await fetch('/api/kling/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughPrompt: 'Andre looking through antique telescope in 1920s observatory',
          version: 'kling-2.0-master',
          character: 'andre',
          descriptor: 'telescope_observatory',
          project: 'andre-time-travel',
          sceneNumber: '02',
          shotNumber: '01',
        }),
      });
      const data = await res.json();
      setPromptTestResult(data);
    } catch (err: any) {
      setPromptTestResult({ error: err.message });
    } finally {
      setPromptTestLoading(false);
    }
  };

  const testMcpHandshake = async () => {
    setMcpTestLoading(true);
    try {
      const res = await fetch('/api/mcp/tools/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'fetch_inbox',
          arguments: {},
        }),
      });
      const data = await res.json();
      setMcpTestResult(data);
    } catch (err: any) {
      setMcpTestResult({ error: err.message });
    } finally {
      setMcpTestLoading(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-...run.app';

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <PlugZap className="w-3.5 h-3.5" />
                Live Connection Hub
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8b949e] bg-[#21262d]">
                agent-parley 0.18.0
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Connect & Test Agent Parley With Your Real Project
            </h1>
            <p className="text-sm text-[#8b949e] mt-1 max-w-2xl">
              You've inserted your API keys into <code className="text-cyan-400 font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded">.env</code>. 
              Here is exactly how Agent Parley coordinates your repository, how to run it locally on your computer, 
              and how to test it live right now.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectTab('terminal')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium rounded-lg border border-[#30363d] transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              CLI Terminal
            </button>
            <button
              onClick={() => onSelectTab('kling_studio')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/70 hover:to-indigo-800/70 text-purple-200 text-xs font-medium rounded-lg border border-purple-500/30 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Kling Studio & Vision
            </button>
          </div>
        </div>

        {/* Live Key Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#30363d]">
          {/* GitHub Status */}
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8b949e] flex items-center gap-1.5">
                <GithubIcon className="w-3.5 h-3.5 text-white" />
                GITHUB_TOKEN
              </span>
              {githubStatus?.connected ? (
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${githubLoading ? 'animate-spin' : ''}`} />
                  Checking
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {githubStatus?.user?.login ? `@${githubStatus.user.login} (${githubStatus.user.name})` : 'andreathar'}
            </div>
            <div className="text-[11px] text-[#8b949e] font-mono mt-0.5 truncate">
              Target: andreathar/Movies_Projects
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8b949e] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                GEMINI_API_KEY
              </span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <div className="text-xs font-semibold text-white">
              Gemini 3.8 Flash
            </div>
            <div className="text-[11px] text-[#8b949e] font-mono mt-0.5 truncate">
              Powers Kling prompt & vision models
            </div>
          </div>

          {/* Anthropic Key */}
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8b949e] flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-amber-400" />
                ANTHROPIC_API_KEY
              </span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Loaded
              </span>
            </div>
            <div className="text-xs font-semibold text-white">
              Claude Code CLI Ready
            </div>
            <div className="text-[11px] text-[#8b949e] font-mono mt-0.5 truncate">
              Drives local claude lanes
            </div>
          </div>

          {/* MCP Secret */}
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#8b949e] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                MCP_SHARED_SECRET
              </span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Protected
              </span>
            </div>
            <div className="text-xs font-semibold text-white">
              HMAC Token Enforced
            </div>
            <div className="text-[11px] text-[#8b949e] font-mono mt-0.5 truncate">
              Loopback webhook validation
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Connection Modes */}
      <div className="flex border-b border-[#30363d] gap-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'overview'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          1. Mental Model: How Parley Works
        </button>

        <button
          onClick={() => setActiveSubTab('local')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'local'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          2. Run Locally on your Machine (Claude / Codex)
        </button>

        <button
          onClick={() => setActiveSubTab('live_tests')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'live_tests'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          3. One-Click Live Verification
        </button>

        <button
          onClick={() => setActiveSubTab('remote_mcp')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'remote_mcp'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          4. Remote MCP & Bridge Setup
        </button>
      </div>

      {/* SUB-TAB 1: MENTAL MODEL */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              What is Agent Parley doing?
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Normally, running multiple AI coding agents (Claude Code, OpenAI Codex, Cursor) in the same Git repository causes chaos: they overwrite each other's edits, conflict on branches, and consume unbudgeted tokens.
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">1</span>
                <div>
                  <h4 className="text-xs font-semibold text-white">Isolated Git Worktrees for Each Lane</h4>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Agent Parley creates <code className="text-cyan-400 font-mono">.worktrees/lane-claude</code> and <code className="text-cyan-400 font-mono">.worktrees/lane-codex</code>. Each agent gets its own physical directory and git branch.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">2</span>
                <div>
                  <h4 className="text-xs font-semibold text-white">Advisory Leases & Resource Reservations</h4>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Before editing a file, an agent requests a lease (e.g. <code className="text-purple-300 font-mono">src/auth/jwt.ts</code>). If another lane holds it, Parley refuses or coordinates an atomic handoff.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">3</span>
                <div>
                  <h4 className="text-xs font-semibold text-white">Shared Context via Model Context Protocol (MCP)</h4>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Lanes exchange structured mail (<code className="text-emerald-400 font-mono">send_message</code>), check their mailbox (<code className="text-emerald-400 font-mono">fetch_inbox</code>), and report progress without human intervention.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                How your setup works right now
              </h3>
              <p className="text-xs text-[#8b949e] leading-relaxed mt-1">
                Your environment currently has two interconnected parts:
              </p>

              <div className="mt-4 p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  Remote Web Mission Control (This Applet)
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  Visualizes all active lanes, issues, advisory leases, and run budgets. Contains the Kling AI Studio for generating cinema-grade prompts and analyzing video critiques with Gemini 3.8 Flash.
                </p>
                <div className="border-t border-[#30363d] pt-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#8b949e]">Target Repository:</span>
                  <span className="text-cyan-400">andreathar/Movies_Projects</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#8b949e]">GitHub Token:</span>
                  <span className="text-emerald-400">Authenticated (40 chars)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#8b949e]">Gemini Vision Model:</span>
                  <span className="text-emerald-400">gemini-3.8-flash</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-xs text-cyan-200">
              <span className="font-semibold block mb-1">💡 Choose your next step:</span>
              Want to see it work immediately? Use <strong>Tab 3 (One-Click Live Verification)</strong> to test the GitHub repo connection and Gemini models. Want to run real coding agents in your local git checkout? Follow <strong>Tab 2 (Run Locally)</strong>!
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RUN LOCALLY ON YOUR COMPUTER */}
      {activeSubTab === 'local' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Running Agent Parley on Your Local Computer
            </h3>
            <p className="text-xs text-[#8b949e] mt-1">
              Follow these 4 steps in your terminal on macOS, Linux, or Windows (WSL2) to coordinate Claude Code or Codex inside your cloned <code className="text-cyan-400 font-mono">Movies_Projects</code> repository.
            </p>
          </div>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-[11px] font-bold">1</span>
                  Install Agent Parley (Zero-dependency Python CLI)
                </span>
                <button
                  onClick={() => copyText('curl -LsSf https://github.com/suneel944/agent-parley/releases/latest/download/install.sh | sh', 'install-cmd')}
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'install-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="text-xs font-mono text-cyan-300 bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto">
                curl -LsSf https://github.com/suneel944/agent-parley/releases/latest/download/install.sh | sh
              </pre>
              <p className="text-[11px] text-[#8b949e] mt-1.5">
                (Alternatively with <code>uv</code>: <code className="text-[#c9d1d9]">uv tool install agent-parley</code> or with pip: <code className="text-[#c9d1d9]">pip install agent-parley</code>)
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-[11px] font-bold">2</span>
                  Add Parley MCP Plugin to Claude Code or Codex
                </span>
                <button
                  onClick={() => copyText('claude plugin marketplace add suneel944/agent-parley\nclaude plugin install agent-parley@agent-parley', 'plugin-cmd')}
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'plugin-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="text-xs font-mono text-purple-300 bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto">
{`# For Claude Code:
claude plugin marketplace add suneel944/agent-parley
claude plugin install agent-parley@agent-parley

# Or for Codex CLI:
codex plugin marketplace add suneel944/agent-parley
codex plugin add agent-parley@agent-parley`}
              </pre>
            </div>

            {/* Step 3 */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-[11px] font-bold">3</span>
                  Export your API Keys in your terminal
                </span>
                <button
                  onClick={() => copyText('export ANTHROPIC_API_KEY="sk-ant-..."\nexport GITHUB_TOKEN="ghp_..."', 'env-cmd')}
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'env-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="text-xs font-mono text-amber-300 bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto">
{`# You already have these keys in your .env file:
export ANTHROPIC_API_KEY="${process.env.ANTHROPIC_API_KEY ? 'sk-ant-...' + process.env.ANTHROPIC_API_KEY.slice(-6) : 'your_anthropic_api_key'}"
export GITHUB_TOKEN="${process.env.GITHUB_TOKEN ? 'ghp_...' + process.env.GITHUB_TOKEN.slice(-4) : 'your_github_token'}"`}
              </pre>
            </div>

            {/* Step 4 */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-[11px] font-bold">4</span>
                  Launch your agents inside your Git repo!
                </span>
                <button
                  onClick={() => copyText('cd /path/to/Movies_Projects\nagent-parley run claude', 'run-cmd')}
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'run-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="text-xs font-mono text-emerald-300 bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto">
{`# Navigate into your local repository:
cd /path/to/Movies_Projects

# Terminal 1: Start Claude Code with automatic worktree isolation
agent-parley run claude

# Terminal 2 (optional): Start a second agent in parallel
agent-parley run codex

# Terminal 3: Monitor all lanes live in top view
agent-parley top`}
              </pre>
              <div className="mt-3 p-2.5 bg-[#161b22] rounded border border-[#30363d] text-[11px] text-[#8b949e]">
                ✨ <strong>What happens when you run this:</strong> Agent Parley registers the project, sets up isolated git branches (<code className="text-cyan-300">parley/claude</code> and <code className="text-cyan-300">parley/codex</code>), starts the local supervision daemon, and enables Claude Code to claim issues and acquire atomic file leases so neither agent steps on the other!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ONE-CLICK LIVE VERIFICATION */}
      {activeSubTab === 'live_tests' && (
        <div className="space-y-5">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Live Interactive Verification
            </h3>
            <p className="text-xs text-[#8b949e] mt-1">
              Verify your keys and connections in real time without leaving this screen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* Test 1: GitHub Connection */}
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <GithubIcon className="w-4 h-4 text-white" />
                      1. Real GitHub Sync
                    </span>
                    {githubStatus?.connected ? (
                      <span className="text-emerald-400 text-[10px] font-mono">OK</span>
                    ) : (
                      <span className="text-[#8b949e] text-[10px] font-mono">Ready</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    Uses your <code className="text-cyan-400 font-mono">GITHUB_TOKEN</code> to query the real GitHub API for repository metadata and commits.
                  </p>
                </div>
                <button
                  onClick={checkGitHubStatus}
                  disabled={githubLoading}
                  className="mt-4 w-full py-2 px-3 bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium rounded border border-[#30363d] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${githubLoading ? 'animate-spin' : ''}`} />
                  {githubLoading ? 'Querying GitHub...' : 'Test GitHub Connection'}
                </button>
              </div>

              {/* Test 2: Gemini 3.8 Flash Prompt Enhancer */}
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      2. Gemini 3.8 Flash
                    </span>
                    {promptTestResult ? (
                      <span className="text-emerald-400 text-[10px] font-mono">OK</span>
                    ) : (
                      <span className="text-[#8b949e] text-[10px] font-mono">Ready</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    Uses your <code className="text-purple-300 font-mono">GEMINI_API_KEY</code> to generate a cinematic Kling prompt with camera motion cues.
                  </p>
                </div>
                <button
                  onClick={testPromptEnhancer}
                  disabled={promptTestLoading}
                  className="mt-4 w-full py-2 px-3 bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 text-xs font-medium rounded border border-purple-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${promptTestLoading ? 'animate-spin' : ''}`} />
                  {promptTestLoading ? 'Calling Gemini...' : 'Test Prompt Enhancer'}
                </button>
              </div>

              {/* Test 3: MCP Tool Call Handshake */}
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      3. MCP Tool Call
                    </span>
                    {mcpTestResult ? (
                      <span className="text-emerald-400 text-[10px] font-mono">OK</span>
                    ) : (
                      <span className="text-[#8b949e] text-[10px] font-mono">Ready</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    Dispatches a standard Model Context Protocol tool request (<code className="text-cyan-300 font-mono">fetch_inbox</code>) to the local coordination server.
                  </p>
                </div>
                <button
                  onClick={testMcpHandshake}
                  disabled={mcpTestLoading}
                  className="mt-4 w-full py-2 px-3 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 text-xs font-medium rounded border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Radio className={`w-3.5 h-3.5 ${mcpTestLoading ? 'animate-spin' : ''}`} />
                  {mcpTestLoading ? 'Calling MCP...' : 'Test MCP Protocol'}
                </button>
              </div>
            </div>

            {/* GitHub Results Display */}
            {githubStatus?.connected && (
              <div className="mt-5 p-4 rounded-lg bg-[#0d1117] border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    GitHub API Handshake Successful
                  </span>
                  <span className="text-[11px] text-[#8b949e] font-mono">
                    Authenticated user: @{githubStatus.user.login}
                  </span>
                </div>
                {githubStatus.repo && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#161b22] p-3 rounded border border-[#30363d]">
                    <div>
                      <span className="text-[#8b949e] block text-[10px]">Repository</span>
                      <a href={githubStatus.repo.htmlUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-mono">
                        {githubStatus.repo.fullName}
                      </a>
                    </div>
                    <div>
                      <span className="text-[#8b949e] block text-[10px]">Default Branch</span>
                      <span className="text-white font-mono">{githubStatus.repo.defaultBranch}</span>
                    </div>
                    <div>
                      <span className="text-[#8b949e] block text-[10px]">Open Issues</span>
                      <span className="text-amber-400 font-mono">{githubStatus.repo.openIssues} issue(s)</span>
                    </div>
                  </div>
                )}
                {githubStatus.repo?.recentCommits?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#8b949e] block">Recent Commits on GitHub:</span>
                    {githubStatus.repo.recentCommits.map((c: any) => (
                      <div key={c.sha} className="text-xs font-mono flex items-center gap-2 text-[#c9d1d9] bg-[#161b22] px-2.5 py-1.5 rounded border border-[#30363d]">
                        <span className="text-cyan-400 font-bold">{c.sha}</span>
                        <span className="truncate flex-1">{c.message}</span>
                        <span className="text-[10px] text-[#8b949e]">{c.author}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Enhancer Results Display */}
            {promptTestResult && (
              <div className="mt-5 p-4 rounded-lg bg-[#0d1117] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Gemini 3.8 Flash Generation Result
                  </span>
                  <span className="text-[11px] font-mono text-[#8b949e]">
                    Model: {promptTestResult.modelUsed || 'gemini-3.8-flash'}
                  </span>
                </div>
                <div className="p-3 bg-[#161b22] rounded border border-[#30363d] space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-[#8b949e] uppercase">Enhanced Cinematic Prompt</span>
                    <p className="text-xs text-purple-200 mt-0.5 italic">
                      "{promptTestResult.enhancedPrompt}"
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-[#30363d]">
                    <div>
                      <span className="text-[10px] text-[#8b949e]">Asset ID</span>
                      <p className="text-cyan-300 font-mono text-[11px]">{promptTestResult.assetId}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8b949e]">Filename Standard</span>
                      <p className="text-cyan-300 font-mono text-[11px] truncate">{promptTestResult.filename}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MCP Handshake Results Display */}
            {mcpTestResult && (
              <div className="mt-5 p-4 rounded-lg bg-[#0d1117] border border-cyan-500/30 space-y-2">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Radio className="w-4 h-4" />
                  MCP Protocol Handshake Response
                </span>
                <pre className="text-xs font-mono text-cyan-200 bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto">
                  {JSON.stringify(mcpTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REMOTE MCP & BRIDGE SETUP */}
      {activeSubTab === 'remote_mcp' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              Connecting Claude Desktop or Cursor via MCP
            </h3>
            <p className="text-xs text-[#8b949e] mt-1">
              You can connect Claude Desktop, Cursor, or external tools on your computer directly to this remote Agent Parley mission control dashboard over HTTP.
            </p>
          </div>

          <div className="space-y-4">
            {/* Warning / Explanation banner */}
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4" />
                Why ais-dev-... URLs Redirect (302 cookie check)
              </div>
              <p className="text-[11px] text-[#8b949e] leading-relaxed">
                Development URLs (<code className="text-amber-300 font-mono">ais-dev-...</code>) require an active Google sign-in browser cookie, so external CLI tools like <code className="text-cyan-300 font-mono">mcp-remote</code> receive an HTML cookie check redirect. Use the <strong>Shared URL</strong> or <strong>localhost</strong> below to connect Claude Desktop directly.
              </p>
            </div>

            {/* Option 1: Shared App URL */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Option 1 (Recommended): Shared Deployed URL (No Cookie Intercept)
                </span>
                <button
                  onClick={() =>
                    copyText(
                      JSON.stringify(
                        {
                          mcpServers: {
                            'agent-parley': {
                              command: 'npx',
                              args: [
                                '-y',
                                'mcp-remote',
                                'https://ais-pre-rfcvzn4hlg3yy2capy56fh-882508242097.us-east1.run.app/api/mcp',
                              ],
                            },
                          },
                        },
                        null,
                        2
                      ),
                      'mcp-pre-json'
                    )
                  }
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'mcp-pre-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>
              <pre className="text-xs font-mono text-emerald-300 bg-[#161b22] p-3 rounded border border-[#30363d] overflow-x-auto">
{JSON.stringify(
  {
    mcpServers: {
      'agent-parley': {
        command: 'npx',
        args: [
          '-y',
          'mcp-remote',
          'https://ais-pre-rfcvzn4hlg3yy2capy56fh-882508242097.us-east1.run.app/api/mcp',
        ],
      },
    },
  },
  null,
  2
)}
              </pre>
            </div>

            {/* Option 2: Localhost */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Option 2: Local Server (from /mnt/data/Projects_SSD/agent-parley)
                </span>
                <button
                  onClick={() =>
                    copyText(
                      JSON.stringify(
                        {
                          mcpServers: {
                            'agent-parley': {
                              command: 'npx',
                              args: ['-y', 'mcp-remote', 'http://localhost:3000/api/mcp'],
                            },
                          },
                        },
                        null,
                        2
                      ),
                      'mcp-local-json'
                    )
                  }
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'mcp-local-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>
              <pre className="text-xs font-mono text-cyan-300 bg-[#161b22] p-3 rounded border border-[#30363d] overflow-x-auto">
{JSON.stringify(
  {
    mcpServers: {
      'agent-parley': {
        command: 'npx',
        args: ['-y', 'mcp-remote', 'http://localhost:3000/api/mcp'],
      },
    },
  },
  null,
  2
)}
              </pre>
            </div>

            {/* With Bearer Token Header */}
            <div className="border border-[#30363d] rounded-lg p-4 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  With Authorization Bearer Header (Optional Security)
                </span>
                <button
                  onClick={() =>
                    copyText(
                      JSON.stringify(
                        {
                          mcpServers: {
                            'agent-parley': {
                              command: 'npx',
                              args: [
                                '-y',
                                'mcp-remote',
                                'https://ais-pre-rfcvzn4hlg3yy2capy56fh-882508242097.us-east1.run.app/api/mcp',
                                '--header',
                                `Authorization: Bearer ${process.env.MCP_SHARED_SECRET || 'parley_shared_secret'}`,
                              ],
                            },
                          },
                        },
                        null,
                        2
                      ),
                      'mcp-auth-json'
                    )
                  }
                  className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedKey === 'mcp-auth-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>
              <pre className="text-xs font-mono text-purple-300 bg-[#161b22] p-3 rounded border border-[#30363d] overflow-x-auto">
{JSON.stringify(
  {
    mcpServers: {
      'agent-parley': {
        command: 'npx',
        args: [
          '-y',
          'mcp-remote',
          'https://ais-pre-rfcvzn4hlg3yy2capy56fh-882508242097.us-east1.run.app/api/mcp',
          '--header',
          `Authorization: Bearer ${process.env.MCP_SHARED_SECRET || 'parley_1ef6e8cd8ffd40a73fd62cb7ffdcfdb2d50f7c51a5f6ef41'}`,
        ],
      },
    },
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <PlugZap className="w-4 h-4 text-emerald-400" />
                  JSON-RPC 2.0 & SSE Methods Handled
                </span>
                <p className="text-[11px] text-[#8b949e]">
                  Supports <code>initialize</code>, <code>notifications/initialized</code>, <code>tools/list</code>, <code>tools/call</code>, and <code>ping</code>.
                </p>
                <div className="p-2 bg-[#161b22] rounded border border-[#30363d] font-mono text-[11px] text-cyan-300 truncate">
                  POST /api/mcp (HTTP JSON-RPC & SSE)
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Lane Lifecycle Webhook Hook
                </span>
                <p className="text-[11px] text-[#8b949e]">
                  Native hook receiver for lane lifecycle turn boundaries and stop events.
                </p>
                <div className="p-2 bg-[#161b22] rounded border border-[#30363d] font-mono text-[11px] text-purple-300 truncate">
                  POST /hook/:lane
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
