import React, { useState } from 'react';
import { 
  Lane, 
  Issue, 
  Reservation, 
  Budget, 
  Problem, 
  CoordinationEvent, 
  TopSummary 
} from '../types';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  GitBranch, 
  Layers, 
  Zap, 
  Mail, 
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  PlugZap
} from 'lucide-react';

interface TopStatusViewProps {
  summary: TopSummary;
  lanes: Lane[];
  issues: Issue[];
  reservations: Reservation[];
  budget: Budget;
  problems: Problem[];
  events: CoordinationEvent[];
  onWakeLane: (id: string) => void;
  onStopLane: (id: string) => void;
  onDismissProblem: (id: string) => void;
  onSelectTab: (tab: string) => void;
  onComposeMessageTo: (laneId: string) => void;
}

export const TopStatusView: React.FC<TopStatusViewProps> = ({
  summary,
  lanes,
  issues,
  reservations,
  budget,
  problems,
  events,
  onWakeLane,
  onStopLane,
  onDismissProblem,
  onSelectTab,
  onComposeMessageTo,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const filteredLanes = lanes.filter((lane) => {
    const matchesSearch = 
      lane.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lane.branch.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lane.currentTask.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || lane.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'claude':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">Claude</span>;
      case 'codex':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Codex</span>;
      case 'gemini':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">Gemini</span>;
      case 'opencode':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">OpenCode</span>;
      case 'amp':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-pink-500/10 text-pink-400 border border-pink-500/30">Amp</span>;
      case 'copilot':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Copilot</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-500/10 text-gray-400 border border-gray-500/30">{provider}</span>;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'working':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            working
          </span>
        );
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            idle
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-600/20 text-gray-400 border border-gray-600/30">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            stopped
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Real Project Connection Quick Banner */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-[#161b22] to-cyan-950/30 border border-emerald-500/30 rounded-xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <PlugZap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Ready for Real Local & Remote Testing</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                andreathar/Movies_Projects
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              API keys in <code className="text-cyan-300 font-mono">.env</code> are loaded (GitHub PAT + Gemini 3.8 Flash + Anthropic Key).
            </p>
          </div>
        </div>
        <button
          onClick={() => onSelectTab('connect')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-sm transition-colors shrink-0"
        >
          <span>Connect & Test Real Project</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Summary Header Rows (as in agent-parley top) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Lanes Summary */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#8b949e] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#c9d1d9]">
              <Layers className="w-4 h-4 text-[#58a6ff]" />
              COORDINATION LANES
            </span>
            <span>{summary.lanesTotal} Total</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center font-mono">
            <div className="bg-[#0d1117] p-2 rounded border border-emerald-500/20">
              <div className="text-xl font-bold text-emerald-400">{summary.lanesWorking}</div>
              <div className="text-[11px] text-[#8b949e]">Working</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded border border-amber-500/20">
              <div className="text-xl font-bold text-amber-400">{summary.lanesIdle}</div>
              <div className="text-[11px] text-[#8b949e]">Idle</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded border border-gray-600/20">
              <div className="text-xl font-bold text-gray-400">{summary.lanesStopped}</div>
              <div className="text-[11px] text-[#8b949e]">Stopped</div>
            </div>
          </div>
        </div>

        {/* Row 2: Issues Summary */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#8b949e] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#c9d1d9]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ISSUES & CLAIMS
            </span>
            <button 
              onClick={() => onSelectTab('issues')}
              className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-3 text-center font-mono">
            <div className="bg-[#0d1117] p-2 rounded border border-[#30363d]">
              <div className="text-xl font-bold text-[#58a6ff]">{summary.issuesClaimed}</div>
              <div className="text-[10px] text-[#8b949e]">Claimed</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded border border-[#30363d]">
              <div className="text-xl font-bold text-amber-400">{summary.issuesOpen}</div>
              <div className="text-[10px] text-[#8b949e]">Open</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded border border-[#30363d]">
              <div className="text-xl font-bold text-purple-400">{summary.issuesInReview}</div>
              <div className="text-[10px] text-[#8b949e]">Review</div>
            </div>
            <div className="bg-[#0d1117] p-2 rounded border border-[#30363d]">
              <div className="text-xl font-bold text-emerald-400">{summary.issuesCompleted}</div>
              <div className="text-[10px] text-[#8b949e]">Done</div>
            </div>
          </div>
        </div>

        {/* Row 3: Budget & Leases */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#8b949e] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#c9d1d9]">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              GOVERNANCE & BUDGET
            </span>
            <span className="text-[11px] font-mono text-amber-400">
              {budget.enforced ? 'ENFORCED' : 'OFF'}
            </span>
          </div>
          <div className="space-y-2 mt-2">
            <div>
              <div className="flex justify-between text-xs font-mono text-[#8b949e] mb-1">
                <span>Tokens: {budget.tokensUsed.toLocaleString()} / {budget.tokenCap.toLocaleString()}</span>
                <span>{summary.budgetUsedPercent}%</span>
              </div>
              <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                <div 
                  className={`h-full ${summary.budgetUsedPercent > 85 ? 'bg-red-500' : summary.budgetUsedPercent > 60 ? 'bg-amber-500' : 'bg-[#1f6feb]'}`}
                  style={{ width: `${Math.min(100, summary.budgetUsedPercent)}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-mono text-[#8b949e] pt-1 border-t border-[#21262d]">
              <span>Active Leases: <strong className="text-[#e6edf3]">{summary.activeLeases}</strong></span>
              <span>Calls: <strong className="text-[#e6edf3]">{budget.callsUsed}</strong> / {budget.callsCap}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Top Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-lg">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-[#e6edf3] tracking-wide">
              LANE STATUS BOARD
            </span>
            <span className="text-xs font-mono text-[#8b949e]">
              Press 'Wake' or 'Stop' to manage processes
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Filter lanes, branches, tasks..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            {/* Provider Filter */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="all">All Providers</option>
              <option value="claude">Claude</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
              <option value="opencode">OpenCode</option>
            </select>
          </div>
        </div>

        {/* Interactive Top Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Participant</th>
                <th className="py-3 px-3 font-semibold">Provider</th>
                <th className="py-3 px-3 font-semibold">State</th>
                <th className="py-3 px-3 font-semibold">Branch</th>
                <th className="py-3 px-3 font-semibold">Issues</th>
                <th className="py-3 px-3 font-semibold">Mail</th>
                <th className="py-3 px-3 font-semibold">Leases</th>
                <th className="py-3 px-3 font-semibold">Tokens</th>
                <th className="py-3 px-3 font-semibold">Idle</th>
                <th className="py-3 px-4 font-semibold">Current Task</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
              {filteredLanes.map((lane) => (
                <tr key={lane.id} className="hover:bg-[#1f242c] transition group">
                  <td className="py-3 px-4 font-bold text-[#e6edf3] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1f6feb]"></span>
                    {lane.name}
                  </td>
                  <td className="py-3 px-3">{getProviderBadge(lane.provider)}</td>
                  <td className="py-3 px-3">{getStateBadge(lane.state)}</td>
                  <td className="py-3 px-3">
                    <span className="text-[#58a6ff] hover:underline flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-[#8b949e]" />
                      {lane.branch}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {lane.ownedIssues.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {lane.ownedIssues.map((iss) => (
                          <span key={iss} className="px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] text-[10px] font-bold border border-[#1f6feb]/30">
                            {iss}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#6e7681]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {lane.unreadMail > 0 || lane.unacknowledgedMail > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {lane.unreadMail} unread / {lane.unacknowledgedMail} ack
                      </span>
                    ) : (
                      <span className="text-[#6e7681]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {lane.leases.length > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#30363d] text-[#e6edf3]" title={lane.leases.join('\n')}>
                        {lane.leases.length} leases
                      </span>
                    ) : (
                      <span className="text-[#6e7681]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[#8b949e]">
                    {lane.tokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-[#8b949e]">
                    {lane.idleSeconds}s
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-[#8b949e] group-hover:text-[#e6edf3]" title={lane.currentTask}>
                    {lane.currentTask}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {lane.state !== 'working' ? (
                        <button
                          onClick={() => onWakeLane(lane.id)}
                          className="px-2 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-medium transition flex items-center gap-1"
                          title="Wake lane and resume execution"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Wake
                        </button>
                      ) : (
                        <button
                          onClick={() => onStopLane(lane.id)}
                          className="px-2 py-1 rounded bg-[#da3633]/20 hover:bg-[#da3633]/30 text-[#f85149] border border-[#da3633]/30 text-[11px] font-medium transition flex items-center gap-1"
                          title="Stop and retire lane session"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Stop
                        </button>
                      )}
                      <button
                        onClick={() => onComposeMessageTo(lane.id)}
                        className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-[11px] transition flex items-center gap-1"
                        title="Send coordination mail"
                      >
                        <Mail className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Problems & Real-time Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problems & Diagnostic Log */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono text-sm font-bold text-[#e6edf3]">
                DETECTED PROBLEMS & ANOMALIES ({problems.length})
              </h3>
            </div>
            <span className="text-xs text-[#8b949e] font-mono">
              Auto-diagnosed by supervision engine
            </span>
          </div>

          {problems.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[#8b949e] bg-[#0d1117] rounded border border-[#30363d]">
              <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              No issues or churn detected. All coordination invariants hold.
            </div>
          ) : (
            <div className="space-y-3">
              {problems.map((prob) => (
                <div
                  key={prob.id}
                  className={`p-3 rounded-lg border text-xs font-mono flex items-start justify-between gap-3 ${
                    prob.severity === 'error'
                      ? 'bg-red-950/20 border-red-500/30 text-red-200'
                      : prob.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                        {prob.type.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-white">[{prob.lane}]</span>
                    </div>
                    <p className="text-[#c9d1d9]">{prob.detail}</p>
                    <span className="text-[10px] text-[#8b949e]">{prob.timestamp}</span>
                  </div>

                  <button
                    onClick={() => onDismissProblem(prob.id)}
                    className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-[10px] border border-[#30363d] transition whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Coordination Event Stream */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#58a6ff]" />
              <h3 className="font-mono text-sm font-bold text-[#e6edf3]">
                COORDINATION EVENT STREAM
              </h3>
            </div>
            <span className="text-xs text-[#8b949e] font-mono">
              Live daemon feed
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded bg-[#0d1117] border border-[#21262d] text-xs font-mono flex items-start gap-2.5 hover:border-[#30363d] transition"
              >
                <span className="text-[11px] text-[#8b949e] whitespace-nowrap mt-0.5">
                  {ev.timestamp}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#1f6feb]/20 text-[#58a6ff] whitespace-nowrap">
                  {ev.type}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-[#e6edf3] mr-1.5">{ev.lane}:</span>
                  <span className="text-[#8b949e]">{ev.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
