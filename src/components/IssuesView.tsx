import React, { useState } from 'react';
import { Issue, Lane } from '../types';
import { 
  CheckSquare, 
  Plus, 
  AlertCircle, 
  GitPullRequest, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  Flame,
  ArrowRight
} from 'lucide-react';

interface IssuesViewProps {
  issues: Issue[];
  lanes: Lane[];
  onClaimIssue: (issueId: string, laneId: string) => void;
  onUpdateStatus: (issueId: string, status: Issue['status']) => void;
  onCreateIssue: (title: string, priority: Issue['priority'], assignee?: string) => void;
}

export const IssuesView: React.FC<IssuesViewProps> = ({
  issues,
  lanes,
  onClaimIssue,
  onUpdateStatus,
  onCreateIssue,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Issue['priority']>('normal');
  const [newAssignee, setNewAssignee] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateIssue(newTitle.trim(), newPriority, newAssignee || undefined);
    setNewTitle('');
    setNewAssignee('');
    setShowCreateModal(false);
  };

  const getPriorityBadge = (priority: Issue['priority']) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'normal':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">NORMAL</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">LOW</span>;
    }
  };

  const getStatusBadge = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-600/20 text-gray-300 border border-gray-600/30">OPEN</span>;
      case 'claimed':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">CLAIMED</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">IN PROGRESS</span>;
      case 'review':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">REVIEW</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">COMPLETED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
            WORK ITEMS & ATOMIC CLAIMS
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Planned issues are claimed by exactly one lane at a time, preventing duplicate execution and churn
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work Item</span>
        </button>
      </div>

      {/* Issues Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Issue</th>
                <th className="py-3 px-4 font-semibold">Title</th>
                <th className="py-3 px-3 font-semibold">Priority</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Claimed Assignee</th>
                <th className="py-3 px-3 font-semibold">Churn Alert</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-[#1f242c] transition">
                  <td className="py-3.5 px-4 font-bold text-[#58a6ff]">
                    {issue.id}
                  </td>
                  <td className="py-3.5 px-4 text-[#e6edf3] font-medium max-w-sm">
                    {issue.title}
                  </td>
                  <td className="py-3.5 px-3">
                    {getPriorityBadge(issue.priority)}
                  </td>
                  <td className="py-3.5 px-3">
                    {getStatusBadge(issue.status)}
                  </td>
                  <td className="py-3.5 px-3">
                    {issue.assignee ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30 font-semibold">
                        <UserCheck className="w-3 h-3" />
                        {issue.assignee}
                      </span>
                    ) : (
                      <span className="text-[#6e7681] italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    {issue.churnCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {issue.churnCount} flapped
                      </span>
                    ) : (
                      <span className="text-[#6e7681]">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Claim Dropdown if open or reassign */}
                      <select
                        value={issue.assignee || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            onClaimIssue(issue.id, e.target.value);
                          }
                        }}
                        className="py-1 px-2 text-[11px] font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff]"
                      >
                        <option value="">-- Claim to Lane --</option>
                        {lanes.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.state})
                          </option>
                        ))}
                      </select>

                      {/* Status Update */}
                      <select
                        value={issue.status}
                        onChange={(e) => onUpdateStatus(issue.id, e.target.value as Issue['status'])}
                        className="py-1 px-2 text-[11px] font-mono bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff]"
                      >
                        <option value="open">Open</option>
                        <option value="claimed">Claimed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold font-mono text-[#e6edf3] mb-4">
              CREATE NEW WORK ITEM
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[#8b949e] mb-1 font-semibold">
                  ISSUE TITLE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement lease expiration cleanup worker"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    PRIORITY
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Issue['priority'])}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    INITIAL CLAIM (OPTIONAL)
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {lanes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium transition"
                >
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
