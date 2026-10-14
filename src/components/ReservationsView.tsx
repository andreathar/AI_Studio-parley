import React, { useState } from 'react';
import { Reservation, Lane } from '../types';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Clock, 
  Lock, 
  AlertOctagon, 
  CheckCircle,
  FolderTree
} from 'lucide-react';

interface ReservationsViewProps {
  reservations: Reservation[];
  lanes: Lane[];
  onFileReservation: (path: string, owner: string, reason: string, ttlSeconds: number) => Promise<{ success: boolean; error?: string }>;
  onReleaseReservation: (id: string) => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({
  reservations,
  lanes,
  onFileReservation,
  onReleaseReservation,
}) => {
  const [showFileModal, setShowFileModal] = useState(false);
  const [targetPath, setTargetPath] = useState('');
  const [targetOwner, setTargetOwner] = useState(lanes[0]?.id || '');
  const [targetReason, setTargetReason] = useState('');
  const [targetTtl, setTargetTtl] = useState(1800);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPath.trim() || !targetOwner) return;
    setConflictError(null);

    const res = await onFileReservation(targetPath.trim(), targetOwner, targetReason.trim(), targetTtl);
    if (!res.success) {
      setConflictError(res.error || 'Conflict detected');
    } else {
      setShowFileModal(false);
      setTargetPath('');
      setTargetReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
            ADVISORY RESOURCE RESERVATIONS & LEASES
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Lanes declare advisory file paths (e.g. <code>src/auth.ts</code>) or resources (e.g. <code>port:5432</code>) to prevent race conditions
          </p>
        </div>
        <button
          onClick={() => {
            setConflictError(null);
            setShowFileModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>File New Reservation</span>
        </button>
      </div>

      {/* Leases Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Resource / Path</th>
                <th className="py-3 px-3 font-semibold">Lease Owner</th>
                <th className="py-3 px-4 font-semibold">Declared Purpose / Reason</th>
                <th className="py-3 px-3 font-semibold">Acquired</th>
                <th className="py-3 px-3 font-semibold">TTL (s)</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8b949e]">
                    No active reservations held. All paths and ports are currently free.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-[#1f242c] transition">
                    <td className="py-3.5 px-4 font-bold text-[#e6edf3] flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[#58a6ff]">{res.path}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30 font-semibold">
                        {res.owner}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#8b949e] max-w-sm">
                      {res.reason}
                    </td>
                    <td className="py-3.5 px-3 text-[#8b949e]">
                      {res.acquiredAt.slice(11, 19)}
                    </td>
                    <td className="py-3.5 px-3 text-[#8b949e]">
                      {res.ttlSeconds}s
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onReleaseReservation(res.id)}
                        className="px-2.5 py-1 rounded bg-[#da3633]/20 hover:bg-[#da3633]/30 text-[#f85149] border border-[#da3633]/30 text-xs transition flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Release</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* File Reservation Modal */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold font-mono text-[#e6edf3] mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#58a6ff]" />
              FILE ADVISORY LEASE
            </h3>

            {conflictError && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-500/40 rounded text-xs font-mono text-red-300 flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[#8b949e] mb-1 font-semibold">
                  RESOURCE OR FILE PATH
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. src/auth/session.ts or port:5432"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    OWNING LANE
                  </label>
                  <select
                    value={targetOwner}
                    onChange={(e) => setTargetOwner(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  >
                    {lanes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    LEASE TTL (SECONDS)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="86400"
                    value={targetTtl}
                    onChange={(e) => setTargetTtl(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] mb-1 font-semibold">
                  PURPOSE / REASON
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modifying authorization logic for multi-tenancy"
                  value={targetReason}
                  onChange={(e) => setTargetReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium transition"
                >
                  File Lease
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
