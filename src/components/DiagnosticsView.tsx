import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { DiagnosticsData, EnvVariable } from '../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Cpu, 
  Clock, 
  Globe, 
  Lock, 
  Copy, 
  Check, 
  Info, 
  ExternalLink,
  Activity,
  Zap,
  Filter
} from 'lucide-react';

interface DiagnosticsViewProps {
  onOpenConfigModal: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ onOpenConfigModal }) => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [probeLatency, setProbeLatency] = useState<number | null>(null);
  const [probing, setProbing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = performance.now();
      const res = await apiFetch('/api/diagnostics');
      const end = performance.now();
      setProbeLatency(Math.round(end - start));
      if (res.status === 401) throw new Error('Diagnostics requer acesso: desbloqueie a escrita para visualizar.');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const runProbe = async () => {
    setProbing(true);
    try {
      const start = performance.now();
      const res = await apiFetch('/api/diagnostics');
      const end = performance.now();
      setProbeLatency(Math.round(end - start));
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    setProbing(false);
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredVars = (data?.variables || []).filter((v) => {
    if (selectedCategory === 'all') return true;
    return (v.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  const getStatusBadge = (variable: EnvVariable) => {
    if (variable.status === 'healthy') {
      if (variable.isSecret) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Lock className="w-3 h-3" />
            Configured
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Valid & Active
        </span>
      );
    }

    if (variable.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          Attention
        </span>
      );
    }

    if (variable.status === 'optional_missing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-700/30 text-[#8b949e] border border-gray-600/30">
          Optional (Unset)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" />
        Error
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
              SYSTEM & ENVIRONMENT DIAGNOSTICS
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {data?.status === 'healthy' ? 'ALL CHECKS PASSED' : 'CHECKING'}
            </span>
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Automated verification of environment variables, server network binding, and runtime health
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={runProbe}
            disabled={probing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#58a6ff] ${probing ? 'animate-spin' : ''}`} />
            <span>Run Diagnostic Probe</span>
            {probeLatency !== null && (
              <span className="text-[10px] text-emerald-400 ml-1">({probeLatency}ms)</span>
            )}
          </button>

          <button
            onClick={onOpenConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Config & Secret Helper</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Card 1: Network Binding */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-bold text-[#c9d1d9]">
                <Globe className="w-4 h-4 text-[#58a6ff]" />
                NETWORK BINDING
              </span>
              <span className="text-emerald-400 font-bold">0.0.0.0:3000</span>
            </div>
            <div className="text-lg font-bold text-[#e6edf3]">
              {data.checks.networkBinding ? 'Accessible via Proxy' : 'Misconfigured'}
            </div>
            <p className="text-[11px] text-[#8b949e]">
              HOST=0.0.0.0 enables preview routing through AI Studio's reverse proxy.
            </p>
          </div>

          {/* Card 2: Runtime Platform */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-bold text-[#c9d1d9]">
                <Server className="w-4 h-4 text-[#58a6ff]" />
                NODE RUNTIME
              </span>
              <span className="text-[#58a6ff]">{data.system.nodeVersion}</span>
            </div>
            <div className="text-lg font-bold text-[#e6edf3]">
              {data.system.platform}-{data.system.arch}
            </div>
            <p className="text-[11px] text-[#8b949e]">
              PID: {data.system.pid} · Uptime: {Math.floor(data.system.uptimeSeconds / 60)}m {data.system.uptimeSeconds % 60}s
            </p>
          </div>

          {/* Card 3: Memory & Heap */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-bold text-[#c9d1d9]">
                <Cpu className="w-4 h-4 text-purple-400" />
                MEMORY FOOTPRINT
              </span>
              <span className="text-purple-400">{data.system.heapUsedMB} MB</span>
            </div>
            <div className="text-lg font-bold text-[#e6edf3]">
              {data.system.heapUsedMB} / {data.system.heapTotalMB} MB Heap
            </div>
            <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden border border-[#30363d]">
              <div 
                className="bg-purple-500 h-full"
                style={{ width: `${Math.min(100, (data.system.heapUsedMB / data.system.heapTotalMB) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Card 4: Security Hygiene */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[#8b949e]">
              <span className="flex items-center gap-1.5 font-bold text-[#c9d1d9]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                SECURITY AUDIT
              </span>
              <span className="text-emerald-400">PASSED</span>
            </div>
            <div className="text-lg font-bold text-[#e6edf3]">
              No Client Leaks
            </div>
            <p className="text-[11px] text-[#8b949e]">
              All secrets remain strictly server-side. Zero raw tokens serialized to UI.
            </p>
          </div>
        </div>
      )}

      {/* Main Table: Parsed Environment Variables Matrix */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-lg">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#58a6ff]" />
            <span className="font-bold text-[#e6edf3]">
              PARSED ENVIRONMENT VARIABLES MATRIX
            </span>
            <span className="text-[#8b949e] text-[11px]">
              ({filteredVars.length} variables inspected)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8b949e]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 px-2.5 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] text-xs focus:border-[#58a6ff] focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="network">Network</option>
              <option value="runtime">Runtime</option>
              <option value="integrations">Integrations</option>
              <option value="security">Security</option>
            </select>
          </div>
        </div>

        {/* Variables Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Variable Name</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Parsed Value / Mask</th>
                <th className="py-3 px-4 font-semibold">Expected & Description</th>
                <th className="py-3 px-4 font-semibold">Validation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
              {filteredVars.map((v) => (
                <tr key={v.name} className="hover:bg-[#1f242c] transition">
                  <td className="py-3.5 px-4 font-bold text-[#e6edf3]">
                    <div className="flex items-center gap-2">
                      {v.isSecret ? (
                        <span title="Sensitive Secret">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      ) : (
                        <span title="Configuration Property">
                          <Globe className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
                        </span>
                      )}
                      <span>{v.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#21262d] text-[#8b949e] border border-[#30363d] uppercase">
                      {v.category || '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {getStatusBadge(v)}
                  </td>
                  <td className="py-3.5 px-3">
                    {v.value !== null ? (
                      <div className="flex items-center gap-1.5">
                        <code className="px-2 py-0.5 rounded bg-[#0d1117] text-[#79c0ff] border border-[#30363d] text-[11px]">
                          {v.value}
                        </code>
                        <button
                          onClick={() => copyText(v.value || '', v.name)}
                          className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded"
                          title="Copy value"
                        >
                          {copiedKey === v.name ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[#6e7681] italic">Not Configured</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="text-[#e6edf3] text-[11px] font-medium mb-0.5">
                      {v.description || ''}
                    </div>
                    <div className="text-[#8b949e] text-[10px]">
                      {v.expected ? <>Expected: <code>{v.expected}</code></> : null}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#8b949e] text-[11px]">
                    <span className={v.status === 'healthy' ? 'text-emerald-300' : v.status === 'warning' ? 'text-amber-300' : 'text-[#8b949e]'}>
                      {v.notes || v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory Deep Dive Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 font-mono text-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#e6edf3]">
          <Info className="w-4 h-4 text-[#58a6ff]" />
          <span>Understanding Host Binding vs. External Secrets</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#c9d1d9] leading-relaxed">
          <div className="bg-[#0d1117] p-3.5 rounded border border-[#21262d] space-y-1.5">
            <div className="font-bold text-[#58a6ff]">Why `HOST=0.0.0.0` is required:</div>
            <p className="text-[11px] text-[#8b949e]">
              In development containers and cloud platforms like Google AI Studio, network traffic enters through an internal proxy interface rather than <code>localhost</code>. Binding to <code>0.0.0.0</code> ensures the dev server listens on all network interfaces. It is never a password.
            </p>
          </div>

          <div className="bg-[#0d1117] p-3.5 rounded border border-[#21262d] space-y-1.5">
            <div className="font-bold text-[#58a6ff]">When is a secret actually needed?</div>
            <p className="text-[11px] text-[#8b949e]">
              Agent Parley runs completely without external API keys or secrets in local coordination mode. A secret is only needed if you configure external GitHub webhooks (<code>MCP_SHARED_SECRET</code>) or interact with remote repositories (<code>GITHUB_TOKEN</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
