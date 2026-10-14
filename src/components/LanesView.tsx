import React from 'react';
import { Lane } from '../types';
import { 
  Play, 
  Square, 
  GitBranch, 
  FolderGit2, 
  Mail, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  Plus,
  Send
} from 'lucide-react';

interface LanesViewProps {
  lanes: Lane[];
  onWakeLane: (id: string) => void;
  onStopLane: (id: string) => void;
  onOpenSpawnModal: () => void;
  onComposeMessageTo: (laneId: string) => void;
}

export const LanesView: React.FC<LanesViewProps> = ({
  lanes,
  onWakeLane,
  onStopLane,
  onOpenSpawnModal,
  onComposeMessageTo,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
            PARTICIPANT LANES & WORKTREES
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Each agent lane operates inside its own isolated Git worktree with separate claims and context
          </p>
        </div>
        <button
          onClick={onOpenSpawnModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Spawn New Lane</span>
        </button>
      </div>

      {/* Grid of Lane Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-md flex flex-col justify-between hover:border-[#58a6ff]/40 transition"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#21262d]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#e6edf3]">
                      {lane.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] uppercase font-semibold">
                      {lane.provider}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-[#8b949e]">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-[#58a6ff]" />
                      {lane.branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderGit2 className="w-3 h-3 text-[#8b949e]" />
                      {lane.worktree}
                    </span>
                  </div>
                </div>

                <div>
                  {lane.state === 'working' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      working
                    </span>
                  ) : lane.state === 'idle' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      idle ({lane.idleSeconds}s)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-gray-600/20 text-gray-400 border border-gray-600/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                      stopped
                    </span>
                  )}
                </div>
              </div>

              {/* Current Task Description */}
              <div className="py-3">
                <div className="text-[11px] font-mono uppercase text-[#8b949e] font-semibold mb-1">
                  Current In-Flight Task
                </div>
                <p className="text-xs font-mono text-[#c9d1d9] bg-[#0d1117] p-2.5 rounded border border-[#21262d] leading-relaxed">
                  {lane.currentTask}
                </p>
              </div>

              {/* Metrics & Context Window */}
              <div className="grid grid-cols-2 gap-3 py-2 text-xs font-mono">
                <div className="bg-[#0d1117] p-2.5 rounded border border-[#21262d]">
                  <div className="text-[11px] text-[#8b949e] flex items-center justify-between mb-1">
                    <span>Context Window</span>
                    <span>{lane.contextUsagePercent}%</span>
                  </div>
                  <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1f6feb] h-full"
                      style={{ width: `${lane.contextUsagePercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#0d1117] p-2.5 rounded border border-[#21262d] flex items-center justify-between">
                  <span className="text-[11px] text-[#8b949e]">Tokens Consumed</span>
                  <span className="font-bold text-[#e6edf3]">{lane.tokens.toLocaleString()}</span>
                </div>
              </div>

              {/* Assigned Issues & Leases */}
              <div className="pt-2 pb-1 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#8b949e]">
                  <span>Claimed Issues:</span>
                  <div className="flex gap-1">
                    {lane.ownedIssues.length > 0 ? (
                      lane.ownedIssues.map((iss) => (
                        <span key={iss} className="px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] text-[10px] font-bold border border-[#1f6feb]/30">
                          {iss}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#6e7681]">None</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#8b949e]">
                  <span>Advisory Leases:</span>
                  <span className="text-[#c9d1d9] truncate max-w-[200px]" title={lane.leases.join(', ')}>
                    {lane.leases.length > 0 ? lane.leases.join(', ') : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#8b949e]">
                  <span>Mailbox:</span>
                  <span className="text-[#c9d1d9]">
                    {lane.unreadMail} unread, {lane.unacknowledgedMail} unacknowledged
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-3 border-t border-[#21262d] flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#8b949e] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lane.lastEvent}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onComposeMessageTo(lane.id)}
                  className="px-2.5 py-1.5 rounded text-xs font-mono bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3 text-[#58a6ff]" />
                  <span>Mail</span>
                </button>

                {lane.state !== 'working' ? (
                  <button
                    onClick={() => onWakeLane(lane.id)}
                    className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-[#238636] hover:bg-[#2ea043] text-white transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Wake Lane</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStopLane(lane.id)}
                    className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-[#da3633]/20 hover:bg-[#da3633]/30 text-[#f85149] border border-[#da3633]/30 transition flex items-center gap-1"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Lane</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
