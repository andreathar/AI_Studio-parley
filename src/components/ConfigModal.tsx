import React, { useState } from 'react';
import { 
  KeyRound, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Info, 
  ShieldCheck, 
  Globe, 
  Cpu, 
  Terminal,
  HelpCircle
} from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string>(
    'parley_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSecret = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setGeneratedSecret(`parley_${randomHex}`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fullEnvTemplate = `# Agent Parley Configuration
PORT=3000
HOST=0.0.0.0
MCP_SHARED_SECRET=${generatedSecret}
GEMINI_API_KEY=
GITHUB_TOKEN=`;

  const copyFullEnv = () => {
    navigator.clipboard.writeText(fullEnvTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e6edf3]">
                ENVIRONMENT VARIABLES & SECRETS GUIDE
              </h3>
              <p className="text-[11px] text-[#8b949e]">
                Clarifying host configuration vs. authentication tokens
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded hover:bg-[#21262d] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Clarification Box */}
        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-500/30 text-blue-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-[#79c0ff]">
            <Info className="w-4 h-4 shrink-0" />
            <span>Important: `HOST` is NOT a secret or password</span>
          </div>
          <p className="text-xs leading-relaxed text-[#c9d1d9]">
            In configuration files like <code>.env</code>, <strong><code>HOST=0.0.0.0</code></strong> tells the server which network interface to bind to. In container and cloud environments, <code>0.0.0.0</code> is required so the preview proxy can reach port 3000. <strong>You do not need a secret key for `HOST`.</strong>
          </p>
        </div>

        {/* Variables Catalog */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#58a6ff]" />
            Variable Reference
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* HOST */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] text-sm">HOST</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Required: 0.0.0.0
                </span>
              </div>
              <p className="text-[#8b949e] text-[11px] leading-relaxed">
                Network binding address. <code>0.0.0.0</code> listens on all interfaces (internal and container proxy). Not a credential.
              </p>
            </div>

            {/* PORT */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] text-sm">PORT</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Default: 3000
                </span>
              </div>
              <p className="text-[#8b949e] text-[11px] leading-relaxed">
                The TCP port the web service and API server listen on.
              </p>
            </div>

            {/* MCP_SHARED_SECRET */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm">MCP_SHARED_SECRET (Webhook Secret)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-700/50 text-[#8b949e] border border-gray-600/30">
                  Optional
                </span>
              </div>
              <p className="text-[#8b949e] text-[11px] leading-relaxed">
                If an external integration, webhook receiver, or local hook client prompts for a "host secret", "shared secret", or HMAC signature token, use this variable.
              </p>
            </div>

            {/* GEMINI_API_KEY */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] text-sm">GEMINI_API_KEY</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-700/50 text-[#8b949e] border border-gray-600/30">
                  Optional
                </span>
              </div>
              <p className="text-[#8b949e] text-[11px] leading-relaxed">
                Google AI Studio API key for assistant prompt completion and evaluation.
              </p>
            </div>

            {/* GITHUB_TOKEN */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] text-sm">GITHUB_TOKEN</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-700/50 text-[#8b949e] border border-gray-600/30">
                  Optional
                </span>
              </div>
              <p className="text-[#8b949e] text-[11px] leading-relaxed">
                Personal Access Token for reading PR hygiene checks, repository issues, and remote worktree branches.
              </p>
            </div>

            {/* Git Branch Safety & Main Protection Card */}
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Main Branch Protection Invariant</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  ENFORCED: Zero Direct Pushes
                </span>
              </div>
              <p className="text-[#c9d1d9] text-[11px] leading-relaxed">
                Agent Parley prohibits direct commits or pushes to <code>main</code>. All agent work is performed in isolated worktrees (<code>.worktrees/*</code>) on dedicated feature branches (<code>parley/*</code>), and PRs target secondary branches (e.g. <code>develop</code> or <code>staging</code>). Existing changes on <code>main</code> are 100% protected.
              </p>
            </div>
          </div>
        </div>

        {/* Cryptographic Secret Generator */}
        <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#e6edf3] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Secret Generator
            </span>
            <button
              onClick={handleGenerateSecret}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition text-[11px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Generate New</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedSecret}
              className="flex-1 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-[#79c0ff] font-mono text-xs select-all focus:outline-none"
            />
            <button
              onClick={() => copyToClipboard(generatedSecret, 'secret')}
              className="px-3 py-2 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white flex items-center gap-1.5 transition whitespace-nowrap"
            >
              {copiedKey === 'secret' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-[#8b949e]">
            Use this generated string if you need a secure webhook or authorization secret for <code>MCP_SHARED_SECRET</code>.
          </p>
        </div>

        {/* Copyable .env snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>Copyable .env Template</span>
            <button
              onClick={copyFullEnv}
              className="flex items-center gap-1 text-[#58a6ff] hover:underline"
            >
              {copiedEnv ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied Full .env</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy .env Template</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] overflow-x-auto leading-relaxed whitespace-pre">
            {fullEnvTemplate}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-[#30363d]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
