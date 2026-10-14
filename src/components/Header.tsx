import React from 'react';
import { 
  Activity, 
  Terminal, 
  Layers, 
  CheckSquare, 
  Mail, 
  ShieldAlert, 
  FileText, 
  Play, 
  Plus, 
  Zap,
  SlidersHorizontal,
  Film,
  KeyRound,
  ShieldCheck,
  GitFork,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { TopSummary, Budget } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  summary: TopSummary;
  budget: Budget;
  onOpenSpawnModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenConfigModal: () => void;
  onRunDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  summary,
  budget,
  onOpenSpawnModal,
  onOpenBudgetModal,
  onOpenConfigModal,
  onRunDemo,
}) => {
  const tabs = [
    { id: 'top', label: 'Top Dashboard', icon: Activity, badge: null },
    { id: 'lanes', label: 'Lanes', icon: Layers, badge: `${summary.lanesWorking}/${summary.lanesTotal}` },
    { id: 'issues', label: 'Issues & Claims', icon: CheckSquare, badge: summary.issuesOpen > 0 ? `${summary.issuesOpen} open` : null },
    { id: 'mail', label: 'Mail & Handoffs', icon: Mail, badge: null },
    { id: 'reservations', label: 'Leases', icon: ShieldAlert, badge: summary.activeLeases },
    { id: 'plans', label: 'Plans', icon: FileText, badge: null },
    { id: 'shared_media', label: 'Shared Media', icon: HardDrive, badge: 'v1' },
    { id: 'kling_studio', label: 'Kling Studio & Vision', icon: Sparkles, badge: 'AI' },
    { id: 'terminal', label: 'CLI Terminal', icon: Terminal, badge: null },
    { id: 'video', label: 'Launch Video', icon: Film, badge: null },
    { id: 'diagnostics', label: 'System Diagnostics', icon: ShieldCheck, badge: 'Env OK' },
    { id: 'architecture', label: 'Architecture & Flow', icon: GitFork, badge: 'Guide' },
  ];

  return (
    <header className="border-b border-[#30363d] bg-[#161b22]/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1f6feb] to-[#58a6ff] flex items-center justify-center shadow-lg shadow-blue-500/10 border border-[#388bfd]/30">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#e6edf3]">AGENT PARLEY</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30">
                v0.18.0
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-xs text-[#8b949e] hidden sm:block">
              Separate work, shared context — parallel agent coordination & worktree governance
            </p>
          </div>
        </div>

        {/* Quick Actions & Budget Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onOpenConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] transition"
            title="Inspect Environment Variables & Secret Generator"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Config & Secrets</span>
          </button>

          <button
            onClick={onOpenBudgetModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] transition"
            title="Inspect & Enforce Run Budget"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Budget: {summary.budgetUsedPercent}%</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${budget.enforced ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700 text-gray-300'}`}>
              {budget.enforced ? 'ENFORCED' : 'OFF'}
            </span>
          </button>

          <button
            onClick={onRunDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Demo</span>
          </button>

          <button
            onClick={onOpenSpawnModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Spawn Lane</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-[#21262d] py-1 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#388bfd]/30 font-semibold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-[#1f6feb]/30 text-[#79c0ff]'
                      : 'bg-[#30363d] text-[#8b949e]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
