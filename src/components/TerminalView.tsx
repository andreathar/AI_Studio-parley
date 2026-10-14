import React, { useState, useRef, useEffect } from 'react';
import { Terminal, CornerDownLeft, Play, RefreshCw, Trash2 } from 'lucide-react';

interface TerminalViewProps {
  onExecuteCommand: (command: string) => Promise<string>;
}

interface CommandHistoryEntry {
  command: string;
  output: string;
  timestamp: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ onExecuteCommand }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryEntry[]>([
    {
      command: 'agent-parley status',
      output: `Agent Parley 0.18.0 (pid: 14208)
Lanes:       2 working, 1 idle, 1 stopped (4 total)
Issues:      2 claimed, 1 open, 1 review, 1 completed
Leases:      4 active advisory path/resource reservations
Budget:      165,670 / 500,000 tokens (33%), 490 / 1000 calls [ENFORCED]
Problems:    3 unresolved anomalies flagged
`,
      timestamp: '16:19:20',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const quickCommands = [
    'agent-parley top',
    'agent-parley status',
    'agent-parley lanes',
    'agent-parley issues',
    'agent-parley mail',
    'agent-parley problems',
    'agent-parley demo',
    'agent-parley help',
  ];

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const handleRun = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || isLoading) return;
    const cmd = cmdToRun.trim();

    if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setIsLoading(true);
    setInput('');

    try {
      const output = await onExecuteCommand(cmd);
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: `Error executing command: ${err.message || 'unknown failure'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRun(input);
  };

  return (
    <div className="space-y-4">
      {/* Title & Quick pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e6edf3] flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#58a6ff]" />
            AGENT PARLEY INTERACTIVE CLI
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Real command dispatcher simulating CLI tooling, status board, and demo scenarios
          </p>
        </div>

        <button
          onClick={() => setHistory([])}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded border border-[#30363d] transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Console</span>
        </button>
      </div>

      {/* Quick command buttons */}
      <div className="flex flex-wrap gap-2">
        {quickCommands.map((qc) => (
          <button
            key={qc}
            onClick={() => handleRun(qc)}
            className="px-2.5 py-1 text-xs font-mono bg-[#161b22] hover:bg-[#21262d] text-[#58a6ff] hover:text-[#79c0ff] border border-[#30363d] rounded transition flex items-center gap-1.5"
          >
            <span>$</span>
            <span>{qc}</span>
          </button>
        ))}
      </div>

      {/* Terminal Window */}
      <div className="bg-[#090d13] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl font-mono text-xs flex flex-col min-h-[550px]">
        {/* Terminal Title Bar */}
        <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#da3633]"></span>
            <span className="w-3 h-3 rounded-full bg-[#d29922]"></span>
            <span className="w-3 h-3 rounded-full bg-[#238636]"></span>
            <span className="ml-2 text-xs font-mono font-medium text-[#8b949e]">
              bash — parley-coordination (mcp-local)
            </span>
          </div>
          <span className="text-[10px] text-[#6e7681]">132 columns × 40 rows</span>
        </div>

        {/* Terminal Screen Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-[#e6edf3] font-mono leading-relaxed">
          <div className="text-[#8b949e]">
            Agent Parley coordination runtime active. Type <span className="text-[#58a6ff]">agent-parley help</span> or pick a command chip above.
          </div>

          {history.map((entry, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#58a6ff]">
                <span className="text-emerald-400 font-bold">operator@parley</span>
                <span className="text-[#8b949e]">:</span>
                <span className="text-[#79c0ff]">~</span>
                <span className="text-[#e6edf3]">$ {entry.command}</span>
                <span className="text-[10px] text-[#6e7681] ml-auto">{entry.timestamp}</span>
              </div>
              <pre className="text-[#c9d1d9] bg-[#0d1117]/60 p-3 rounded border border-[#21262d] whitespace-pre-wrap font-mono text-xs overflow-x-auto leading-normal">
                {entry.output}
              </pre>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-amber-400 animate-pulse">
              <span>Executing command...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* CLI Prompt Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold whitespace-nowrap">
            <span>operator@parley:~$</span>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type 'agent-parley top', 'status', 'demo', or custom command..."
            className="flex-1 bg-transparent text-[#e6edf3] font-mono text-xs focus:outline-none placeholder-[#484f58]"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-1 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-40 text-white rounded text-xs font-mono font-medium transition flex items-center gap-1"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Enter</span>
          </button>
        </form>
      </div>
    </div>
  );
};
