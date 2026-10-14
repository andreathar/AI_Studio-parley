import React, { useState } from 'react';
import { Budget } from '../types';
import { SlidersHorizontal, ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';

interface BudgetModalProps {
  budget: Budget;
  isOpen: boolean;
  onClose: () => void;
  onToggleEnforce: () => void;
  onUpdateBudget: (tokenCap: number, callsCap: number, hoursCap: number) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  budget,
  isOpen,
  onClose,
  onToggleEnforce,
  onUpdateBudget,
}) => {
  const [tokens, setTokens] = useState(budget.tokenCap);
  const [calls, setCalls] = useState(budget.callsCap);
  const [hours, setHours] = useState(budget.hoursCap);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBudget(tokens, calls, hours);
    onClose();
  };

  const percentUsed = Math.round((budget.tokensUsed / budget.tokenCap) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#58a6ff]" />
            <h3 className="font-mono text-base font-bold text-[#e6edf3]">
              COORDINATION RUN BUDGET & CAPS
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status alert */}
        <div
          className={`p-4 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 ${
            budget.enforced
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
              : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
          }`}
        >
          <div>
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              STATUS: {budget.enforced ? 'ENFORCEMENT ACTIVE' : 'UNENFORCED (LOGGING ONLY)'}
            </div>
            <p className="text-[11px] text-[#8b949e]">
              {budget.enforced
                ? 'Lanes will automatically pause once caps are exceeded until resumed.'
                : 'Lanes track consumption without blocking execution.'}
            </p>
          </div>
          <button
            onClick={onToggleEnforce}
            className={`px-3 py-1.5 rounded font-bold text-xs font-mono transition ${
              budget.enforced
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-[#1f6feb] hover:bg-[#388bfd] text-white'
            }`}
          >
            {budget.enforced ? 'Disable' : 'Enforce Caps'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-[#0d1117] p-3 rounded border border-[#21262d] font-mono text-xs space-y-2">
          <div className="flex justify-between text-[#8b949e]">
            <span>Aggregate Token Usage</span>
            <span>{budget.tokensUsed.toLocaleString()} / {budget.tokenCap.toLocaleString()} ({percentUsed}%)</span>
          </div>
          <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${percentUsed > 80 ? 'bg-red-500' : 'bg-[#1f6feb]'}`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[#8b949e] mb-1 font-semibold">
              MAX TOKEN CAP
            </label>
            <input
              type="number"
              min="10000"
              step="10000"
              value={tokens}
              onChange={(e) => setTokens(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8b949e] mb-1 font-semibold">
                MAX CALLS CAP
              </label>
              <input
                type="number"
                min="50"
                step="50"
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8b949e] mb-1 font-semibold">
                RUNTIME HOURS CAP
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
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
              className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium transition"
            >
              Save Caps
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
