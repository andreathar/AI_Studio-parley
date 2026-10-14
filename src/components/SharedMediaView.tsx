import React, { useState, useMemo } from 'react';
import { 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCode2, 
  Search, 
  Terminal, 
  Layers, 
  FolderLock, 
  ArrowUpRight,
  Database,
  ExternalLink,
  Info,
  KeyRound,
  FileCheck
} from 'lucide-react';

export interface AssetRegistryRecord {
  asset_id: string;
  kind: string;
  path_or_provider_id: string;
  path_base: 'film' | 'workspace' | 'provider';
  source: string;
  sha256: string;
  approved: boolean;
  notes: string;
  line: number;
  valid: boolean;
}

// Canonical sample items extracted directly from projects/andre-time-travel/asset-registry.csv
const INITIAL_ASSETS: AssetRegistryRecord[] = [
  {
    asset_id: 'andre-photo-20230817_203913',
    kind: 'real_photograph',
    path_or_provider_id: 'inbox/andre-reference-photos/20230817_203913.jpg',
    path_base: 'workspace',
    source: 'copied from ~/Pictures 2026-10-09; sha256=9951e9da18903f79a70b951ef8477916accbfc88ff3b557b833c609b6628ab09',
    sha256: '9951e9da18903f79a70b951ef8477916accbfc88ff3b557b833c609b6628ab09',
    approved: false,
    notes: 'Real camera photo, unapproved; identity and grooming year await Andre confirmation.',
    line: 4,
    valid: true,
  },
  {
    asset_id: 'andre-photo-20240202_015214',
    kind: 'real_photograph',
    path_or_provider_id: 'inbox/andre-reference-photos/20240202_015214.jpg',
    path_base: 'workspace',
    source: 'copied from ~/Pictures 2026-10-09; sha256=b623ba936797b426a59058dc9d839f803eeca0ae823079f5e6d9b2ad4ac5476d',
    sha256: 'b623ba936797b426a59058dc9d839f803eeca0ae823079f5e6d9b2ad4ac5476d',
    approved: false,
    notes: 'Real camera photo, unapproved; identity and grooming year await Andre confirmation.',
    line: 5,
    valid: true,
  },
  {
    asset_id: 'andre-photo-20240202_015259',
    kind: 'real_photograph',
    path_or_provider_id: 'inbox/andre-reference-photos/20240202_015259.jpg',
    path_base: 'workspace',
    source: 'copied from ~/Pictures 2026-10-09; sha256=44c1d4dbd9d3ffe39bffbf5d771201857cb098346b7fdd9bfd667af67a1b528a',
    sha256: '44c1d4dbd9d3ffe39bffbf5d771201857cb098346b7fdd9bfd667af67a1b528a',
    approved: false,
    notes: 'Real camera photo, unapproved; identity and grooming year await Andre confirmation.',
    line: 6,
    valid: true,
  },
  {
    asset_id: 'andre-photo-20240202_015304',
    kind: 'real_photograph',
    path_or_provider_id: 'inbox/andre-reference-photos/20240202_015304.jpg',
    path_base: 'workspace',
    source: 'copied from ~/Pictures 2026-10-09; sha256=4acc534591a4cc3b82c0b75062e4b9c336c831c08ea7766fd0dcb4de22736239',
    sha256: '4acc534591a4cc3b82c0b75062e4b9c336c831c08ea7766fd0dcb4de22736239',
    approved: false,
    notes: 'Real camera photo, unapproved; identity and grooming year await Andre confirmation.',
    line: 7,
    valid: true,
  },
  {
    asset_id: 'andre-kling-render-20261008',
    kind: 'synthetic_style_reference',
    path_or_provider_id: 'inbox/andre-reference-photos/kling_20261008_IMAGE.png',
    path_base: 'workspace',
    source: 'user-supplied Kling render dated 2026-10-08; sha256=0a4acd0ffce2260514058e36b26e0afaf87961b9262bf318b1f62aac0d1e2839',
    sha256: '0a4acd0ffce2260514058e36b26e0afaf87961b9262bf318b1f62aac0d1e2839',
    approved: false,
    notes: 'Synthetic - NOT identity evidence. Use as lighting/grade/wardrobe style reference.',
    line: 13,
    valid: true,
  },
  {
    asset_id: 'legacy-element-1',
    kind: 'legacy_kling_element',
    path_or_provider_id: '323415933655261',
    path_base: 'provider',
    source: 'prior planning inspection',
    sha256: '',
    approved: false,
    notes: 'Reference hygiene risk. Preserve ID; inspect exact name/resources before reuse. Not a production Element.',
    line: 2,
    valid: true,
  },
  {
    asset_id: 'legacy-element-2',
    kind: 'legacy_kling_element',
    path_or_provider_id: '323336237505580',
    path_base: 'provider',
    source: 'prior planning inspection',
    sha256: '',
    approved: false,
    notes: 'Reference hygiene risk. Preserve ID; inspect exact name/resources before reuse. Not a production Element.',
    line: 3,
    valid: true,
  },
  {
    asset_id: 'candidate-9951e9da18903f79',
    kind: 'reference_candidate_unreviewed',
    path_or_provider_id: 'inbox/andre-reference-photos/20230817_203913.jpg',
    path_base: 'workspace',
    source: 'present in reference inbox; provenance and real/synthetic classification pending review',
    sha256: '9951e9da18903f79a70b951ef8477916accbfc88ff3b557b833c609b6628ab09',
    approved: false,
    notes: 'Original left in place. No upload, image assessment or likeness approval performed.',
    line: 14,
    valid: true,
  },
];

export const SharedMediaView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [testAssetId, setTestAssetId] = useState('andre-photo-20230817_203913');
  const [resolutionResult, setResolutionResult] = useState<{
    status: 'idle' | 'success' | 'error';
    data?: any;
    message?: string;
  }>({ status: 'idle' });
  const [testOutputRelPath, setTestOutputRelPath] = useState('renders/take_01_v2.png');
  const [outputTestResult, setOutputTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const filteredAssets = useMemo(() => {
    return INITIAL_ASSETS.filter((item) => {
      const matchSearch =
        item.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path_or_provider_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKind = selectedKind === 'all' || item.kind === selectedKind;
      return matchSearch && matchKind;
    });
  }, [searchTerm, selectedKind]);

  const kinds = useMemo(() => {
    const set = new Set(INITIAL_ASSETS.map((a) => a.kind));
    return Array.from(set);
  }, []);

  const handleTestResolution = () => {
    const found = INITIAL_ASSETS.find((a) => a.asset_id === testAssetId.trim());
    if (!found) {
      setResolutionResult({
        status: 'error',
        message: `ValueError: asset ID absent or ambiguous: "${testAssetId}"`,
      });
      return;
    }
    if (found.path_base === 'provider') {
      setResolutionResult({
        status: 'error',
        message: `ValueError: provider ID "${found.path_or_provider_id}" is not a local file; no download attempted.`,
      });
      return;
    }
    // Simulate shared_media.py resolve_asset output
    setResolutionResult({
      status: 'success',
      data: {
        asset_id: found.asset_id,
        path: `/Movies_Projects/${found.path_or_provider_id}`,
        recorded_sha256: found.sha256 || null,
        hash_verified: false, // In shared_media.py, resolve checks existence/containment without dynamic re-hash
        approved: found.approved,
        path_base: found.path_base,
        lfs_pointer_checked: 'pass (not an unhydrated Git LFS pointer)',
      },
    });
  };

  const handleTestOutputPath = () => {
    const rel = testOutputRelPath.trim();
    if (
      !rel ||
      rel.startsWith('/') ||
      rel.includes('\\') ||
      rel.includes('..') ||
      rel.includes(':')
    ) {
      setOutputTestResult({
        status: 'error',
        message: 'ValueError: path must be relative without traversal ("..") or drive letters.',
      });
      return;
    }
    if (rel.startsWith('inbox/') || rel.startsWith('projects/andre-time-travel/')) {
      setOutputTestResult({
        status: 'error',
        message: 'ValueError: task output root must be separate from canonical media; overlap is forbidden.',
      });
      return;
    }
    setOutputTestResult({
      status: 'success',
      message: `Resolved isolated output target: .worktrees/lane-1/outputs/${rel} (canonical media left untouched, no overwrite allowed)`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#161b22] to-[#1c2128] border border-[#30363d] shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold text-white">
                Canonical Shared Media & Asset Registry
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Commit 9e0eb71 / 0bf1b5f
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                8-Column Schema v1
              </span>
            </div>
            <p className="text-sm text-[#8b949e]">
              Lightweight worktrees share a single canonical media root. No LFS smudge copies in worker lanes, strict root containment checks, and non-destructive derivative outputs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-mono text-[#c9d1d9] flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Catalog: 290 Assets</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-mono text-[#c9d1d9] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>16 Hashes Repaired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Highlights: 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
            <Layers className="w-4 h-4" />
            <span>Lightweight Worktrees</span>
          </div>
          <p className="text-xs text-[#8b949e]">
            The <code className="text-blue-300 font-mono">shared-media</code> profile creates git worktrees with sparse index exclusions. Worker lanes read from the canonical root without copying multi-gigabyte media or hydrating Git LFS pointers.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <FolderLock className="w-4 h-4" />
            <span>Strict Path Scoping (<code className="text-xs font-mono">scoped()</code>)</span>
          </div>
          <p className="text-xs text-[#8b949e]">
            Path containment enforced in Python stdlib: forbids traversal (<code className="text-purple-300 font-mono">..</code>), drive letters (<code className="text-purple-300 font-mono">C:</code>), and symlinks that escape the declared film or workspace roots.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Non-Destructive Derivative Outputs</span>
          </div>
          <p className="text-xs text-[#8b949e]">
            <code className="text-emerald-300 font-mono">output_path()</code> fails if derivative targets overlap the canonical media root or if the file already exists. Generated outputs require a new task version, never overwriting originals.
          </p>
        </div>
      </div>

      {/* Interactive Validator & Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolver Sandbox */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Canonical Asset Resolver Sandbox</h2>
            </div>
            <span className="text-[11px] font-mono text-[#8b949e]">scripts/shared_media.py</span>
          </div>

          <p className="text-xs text-[#8b949e]">
            Test resolution of an asset ID against the active registry. Ensures provider IDs cannot be accessed as local files, and checks that unhydrated LFS pointers are rejected.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={testAssetId}
              onChange={(e) => setTestAssetId(e.target.value)}
              placeholder="e.g. andre-photo-20230817_203913 or legacy-element-1"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleTestResolution}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
            >
              Resolve Asset
            </button>
          </div>

          {resolutionResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono ${
                resolutionResult.status === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/20 border-red-500/30 text-red-300'
              }`}
            >
              {resolutionResult.status === 'success' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Asset Resolved Successfully (Read-Only)</span>
                  </div>
                  <pre className="text-[11px] overflow-x-auto text-[#c9d1d9] bg-[#0d1117] p-2 rounded mt-2 border border-[#30363d]">
                    {JSON.stringify(resolutionResult.data, null, 2)}
                  </pre>
                  <p className="text-[11px] text-[#8b949e] mt-1">
                    * Note: <code className="text-emerald-400">hash_verified: false</code> is intentional per commit 9e0eb71: resolve verifies containment and existence without unmetered CPU re-hashing on every call.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-400">Resolution Rejected</div>
                    <div className="text-red-200 mt-0.5">{resolutionResult.message}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output Path Isolation Tester */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Derivative Output Isolation Check</h2>
            </div>
            <span className="text-[11px] font-mono text-[#8b949e]">output_path() Validator</span>
          </div>

          <p className="text-xs text-[#8b949e]">
            Ensures that AI generation outputs (renders, frames, models) are quarantined from the canonical originals directory to prevent destructive overwrites.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={testOutputRelPath}
              onChange={(e) => setTestOutputRelPath(e.target.value)}
              placeholder="e.g. renders/take_01_v2.png or ../inbox/escape.png"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#c9d1d9] focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleTestOutputPath}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
            >
              Test Path
            </button>
          </div>

          {outputTestResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono ${
                outputTestResult.status === 'success'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/20 border-red-500/30 text-red-300'
              }`}
            >
              {outputTestResult.status === 'success' ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-400">Safe Output Location</div>
                    <div className="text-[#c9d1d9] mt-0.5">{outputTestResult.message}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-400">Path Guard Triggered</div>
                    <div className="text-red-200 mt-0.5">{outputTestResult.message}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs space-y-1">
            <div className="font-semibold text-gray-300">CLI Usage Reference:</div>
            <code className="block text-emerald-400 font-mono text-[11px]">
              .venv/bin/python scripts/manage.py assets validate
            </code>
            <code className="block text-emerald-400 font-mono text-[11px]">
              .venv/bin/python scripts/manage.py assets resolve --asset-id andre-photo-20230817_203913
            </code>
            <code className="block text-purple-400 font-mono text-[11px]">
              agent-parley media doctor --repo /PATH/Movies_Projects --sample inbox/andre-reference-photos/20230817_203913.jpg
            </code>
          </div>
        </div>
      </div>

      {/* Asset Registry Table */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" />
              <span>Canonical 8-Column Asset Registry Explorer</span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              From <code className="text-blue-300">projects/andre-time-travel/asset-registry.csv</code> (Schema: asset_id, kind, path_or_provider_id, path_base, source, sha256, approved, notes)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8b949e]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, path, or note..."
                className="pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500 w-64"
              />
            </div>

            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Kinds ({INITIAL_ASSETS.length})</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-[#30363d] rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d]">
              <tr>
                <th className="px-3 py-2">Line</th>
                <th className="px-3 py-2">Asset ID</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Path / Provider ID</th>
                <th className="px-3 py-2">Base</th>
                <th className="px-3 py-2">SHA-256 Digest</th>
                <th className="px-3 py-2">Approved</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {filteredAssets.map((asset) => (
                <tr key={asset.asset_id} className="hover:bg-[#1f242c]/50 transition">
                  <td className="px-3 py-2.5 text-[#8b949e]">{asset.line}</td>
                  <td className="px-3 py-2.5 font-bold text-white">
                    <button
                      onClick={() => {
                        setTestAssetId(asset.asset_id);
                        handleTestResolution();
                      }}
                      className="hover:text-purple-400 hover:underline text-left"
                      title="Click to test in resolver"
                    >
                      {asset.asset_id}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {asset.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#c9d1d9] max-w-xs truncate" title={asset.path_or_provider_id}>
                    {asset.path_or_provider_id}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        asset.path_base === 'film'
                          ? 'bg-purple-500/20 text-purple-300'
                          : asset.path_base === 'workspace'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {asset.path_base}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#8b949e]">
                    {asset.sha256 ? (
                      <span title={asset.sha256}>
                        {asset.sha256.slice(0, 8)}...{asset.sha256.slice(-8)}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {asset.approved ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                        true
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400">
                        false
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[#8b949e] max-w-sm truncate" title={asset.notes}>
                    {asset.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
