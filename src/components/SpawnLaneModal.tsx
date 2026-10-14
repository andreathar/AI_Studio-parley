import React, { useState } from 'react';
import { Provider } from '../types';
import { Plus, X, Layers } from 'lucide-react';

interface SpawnLaneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnLane: (name: string, provider: Provider, branch?: string) => void;
}

export const SpawnLaneModal: React.FC<SpawnLaneModalProps> = ({
  isOpen,
  onClose,
  onSpawnLane,
}) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Provider>('claude');
  const [branch, setBranch] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSpawnLane(name.trim(), provider, branch.trim() || undefined);
    setName('');
    setBranch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#58a6ff]" />
            <h3 className="text-base font-bold text-[#e6edf3]">
              SPAWN NEW COORDINATION LANE
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#8b949e] mb-1 font-semibold">
              LANE IDENTIFIER
            </label>
            <input
              type="text"
              required
              placeholder="e.g. lane-billing or lane-refactor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#8b949e] mb-1 font-semibold">
              CLI / MODEL PROVIDER
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="codex">Codex (OpenAI)</option>
              <option value="gemini">Gemini (Google)</option>
              <option value="opencode">OpenCode</option>
              <option value="amp">Amp</option>
              <option value="copilot">Copilot (GitHub)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#8b949e] mb-1 font-semibold">
              GIT BRANCH (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. parley/stripe-idempotency"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Spawn Lane</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
