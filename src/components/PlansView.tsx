import React from 'react';
import { Plan } from '../types';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle,
  FolderTree,
  Coins
} from 'lucide-react';

interface PlansViewProps {
  plans: Plan[];
  onApprovePlan: (id: string) => void;
  onRejectPlan: (id: string) => void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  onApprovePlan,
  onRejectPlan,
}) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
          PLAN PROPOSALS & BOUNDED REVISION ENVELOPES
        </h2>
        <p className="text-xs text-[#8b949e] font-mono mt-0.5">
          A lane proposes modifications with <code>plan propose</code>; changes outside the <code>[revisions]</code> envelope require operator approval
        </p>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-lg space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#21262d]">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#58a6ff]" />
                  <h3 className="font-mono text-base font-bold text-[#e6edf3]">
                    {plan.title}
                  </h3>
                  <span className="text-xs font-mono text-[#8b949e]">
                    ({plan.id})
                  </span>
                </div>
                <div className="text-xs font-mono text-[#8b949e] mt-1">
                  Proposed by: <strong className="text-[#58a6ff]">{plan.proposer}</strong> on {plan.proposedAt}
                </div>
              </div>

              <div>
                {plan.status === 'pending_approval' ? (
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    AWAITING OPERATOR APPROVAL
                  </span>
                ) : plan.status === 'approved' ? (
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    APPROVED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    REJECTED
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="font-mono text-xs text-[#c9d1d9] bg-[#0d1117] p-3 rounded border border-[#21262d] leading-relaxed">
              {plan.description}
            </p>

            {/* Envelope Bounds */}
            <div className="bg-[#0d1117] p-3.5 rounded border border-[#21262d] space-y-2">
              <div className="text-[11px] font-mono text-[#8b949e] font-semibold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#58a6ff]" />
                Enforced Revision Envelope Bounds
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[#c9d1d9]">
                <div>
                  <span className="text-[#8b949e]">Max Touched Files:</span>{' '}
                  <strong>{plan.envelope.maxFiles} files</strong>
                </div>
                <div>
                  <span className="text-[#8b949e]">Allowed Paths:</span>{' '}
                  <strong>{plan.envelope.allowedDirectories.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-[#8b949e]">Token Ceiling:</span>{' '}
                  <strong>{plan.envelope.tokenCap.toLocaleString()} tokens</strong>
                </div>
              </div>
            </div>

            {/* Approval Controls */}
            {plan.status === 'pending_approval' && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => onRejectPlan(plan.id)}
                  className="px-3.5 py-1.5 rounded bg-[#da3633]/20 hover:bg-[#da3633]/30 text-[#f85149] border border-[#da3633]/30 font-mono text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Revision</span>
                </button>
                <button
                  onClick={() => onApprovePlan(plan.id)}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Apply Envelope</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
