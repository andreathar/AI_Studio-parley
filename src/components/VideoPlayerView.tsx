import React, { useState } from 'react';
import { Film, Play, BookOpen, Layers, GitBranch, CheckCircle2, ShieldAlert } from 'lucide-react';

export const VideoPlayerView: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState(0);

  const chapters = [
    {
      title: 'Chapter 1: The Multi-Agent Collision Problem',
      summary: 'Multiple coding agents modifying overlapping files without explicit coordination leads to churn, overwrites, and race conditions.',
      command: 'agent-parley status',
      highlight: 'Every lane gets isolated Git worktrees and advisory leases.',
    },
    {
      title: 'Chapter 2: Spawning Sandboxed Worktree Lanes',
      summary: 'Lanes are initialized with native CLI providers (Claude, Codex, Gemini, OpenCode, Amp, Copilot) with clean separation of concerns.',
      command: 'agent-parley lanes',
      highlight: 'Lanes move without you. Idle lanes are woken, planned issues dispatched.',
    },
    {
      title: 'Chapter 3: Atomic Work Item Claims',
      summary: 'Issues are claimed by exactly one participant at a time with unambiguous ownership.',
      command: 'agent-parley issues',
      highlight: 'Atomic claims prevent duplicate or conflicting agent effort.',
    },
    {
      title: 'Chapter 4: Inter-Agent Mail & Wake Routing',
      summary: 'Structured communication between lanes and the operator: wakes, reviews, and acknowledgment-required handoffs.',
      command: 'agent-parley mail',
      highlight: 'Lanes owe acknowledgments on critical messages. Pull requests wake their lane.',
    },
    {
      title: 'Chapter 5: Advisory Reservation Refusal',
      summary: 'When a lane attempts to access a path or resource already reserved by a peer, coordination hooks refuse the branch switch.',
      command: 'agent-parley reserve',
      highlight: 'Advisory reservations name the blocking owner and reason before conflict happens.',
    },
    {
      title: 'Chapter 6: Bounded Plan Revisions',
      summary: 'Proposed plan modifications apply automatically only within the defined revision envelope; outside bounds wait for operator review.',
      command: 'agent-parley plan',
      highlight: 'Caps on touched files, allowed directory paths, and token ceilings.',
    },
    {
      title: 'Chapter 7: Run Budget Caps',
      summary: 'Token, call, and time budgets enforce strict economic boundaries across all lanes combined.',
      command: 'agent-parley budget',
      highlight: 'Once reached, nothing new starts until budget resume.',
    },
    {
      title: 'Chapter 8: Churn Detection',
      summary: 'Flapping tests and repeating failed verification loops are flagged as problems.',
      command: 'agent-parley problems',
      highlight: 'Supervision flags churn per issue and alerts the operator.',
    },
    {
      title: 'Chapter 9: Convergence & Unattended Merge',
      summary: 'Verified branches converge through policy-gated merges with full decision trail.',
      command: 'agent-parley top',
      highlight: 'Finished verification, clean reviews, and verified handoffs.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-mono text-[#e6edf3] flex items-center gap-2">
          <Film className="w-5 h-5 text-[#58a6ff]" />
          AGENT PARLEY LAUNCH WALKTHROUGH & VIDEO COMPOSITION
        </h2>
        <p className="text-xs text-[#8b949e] font-mono mt-0.5">
          Authored with HyperFrames and real CLI coordination output from the shipped transport path
        </p>
      </div>

      {/* Video / Composition Player Frame */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
        <div className="bg-[#090d13] border-b border-[#30363d] px-4 py-2 flex items-center justify-between font-mono text-xs text-[#8b949e]">
          <span className="flex items-center gap-2 text-[#e6edf3]">
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            HyperFrames Video Composition (1920 × 1080 Native Frame)
          </span>
          <span className="text-[11px] text-[#6e7681]">docs/video/index.html</span>
        </div>

        <div className="relative w-full aspect-video bg-[#0d1117] overflow-hidden">
          <iframe
            src="/docs/video/index.html"
            title="Agent Parley Launch Video"
            className="w-full h-full border-0"
            allow="autoplay"
          />
        </div>
      </div>

      {/* Interactive 9-Chapter Walkthrough Guide */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#58a6ff]" />
            <h3 className="font-mono text-sm font-bold text-[#e6edf3]">
              THE 9 COORDINATION MILESTONES (DEMO SCENARIO TOUR)
            </h3>
          </div>
          <span className="text-xs font-mono text-[#8b949e]">
            Click a chapter to explore invariants
          </span>
        </div>

        {/* Chapters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {chapters.map((ch, idx) => {
            const isSelected = activeChapter === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveChapter(idx)}
                className={`p-3 rounded-lg text-left font-mono text-xs transition border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1f242c] border-[#58a6ff] text-[#e6edf3] shadow-md'
                    : 'bg-[#0d1117] border-[#21262d] text-[#8b949e] hover:border-[#30363d] hover:text-[#c9d1d9]'
                }`}
              >
                <div>
                  <div className="font-bold text-[11px] text-[#58a6ff] mb-1">
                    CH {idx + 1}
                  </div>
                  <div className="font-semibold text-white mb-2 leading-tight">
                    {ch.title.split(': ')[1]}
                  </div>
                </div>
                <div className="text-[10px] text-[#6e7681] truncate">
                  $ {ch.command}
                </div>
              </button>
            );
          })}
        </div>

        {/* Chapter Deep Dive Callout */}
        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-base text-[#58a6ff]">
              {chapters[activeChapter].title}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30">
              CLI command: {chapters[activeChapter].command}
            </span>
          </div>
          <p className="text-[#c9d1d9] leading-relaxed">
            {chapters[activeChapter].summary}
          </p>
          <div className="pt-2 text-emerald-400 font-semibold flex items-center gap-1.5 border-t border-[#21262d]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Coordination Invariant: {chapters[activeChapter].highlight}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
