import React, { useState } from 'react';
import { Message, Lane } from '../types';
import { 
  Mail, 
  Send, 
  Check, 
  CheckCheck, 
  Clock, 
  User, 
  AlertCircle,
  Inbox,
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface MailDrawerProps {
  messages: Message[];
  lanes: Lane[];
  onAcknowledgeMessage: (id: number) => void;
  onSendMessage: (from: string, to: string[], subject: string, body: string, ackRequired: boolean) => void;
  initialTargetLane?: string | null;
}

export const MailDrawer: React.FC<MailDrawerProps> = ({
  messages,
  lanes,
  onAcknowledgeMessage,
  onSendMessage,
  initialTargetLane,
}) => {
  const [selectedThread, setSelectedThread] = useState<number | null>(messages[0]?.id || null);
  const [showCompose, setShowCompose] = useState(false);
  const [filterLane, setFilterLane] = useState<string>('all');

  // Compose form states
  const [composeFrom, setComposeFrom] = useState('operator');
  const [composeTo, setComposeTo] = useState(initialTargetLane || (lanes[0]?.id || ''));
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAck, setComposeAck] = useState(false);

  const filteredMessages = messages.filter((m) => {
    if (filterLane === 'all') return true;
    return m.from === filterLane || m.to.includes(filterLane);
  });

  const activeMessage = messages.find((m) => m.id === selectedThread) || messages[0];

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim() || !composeTo) return;
    onSendMessage(composeFrom, [composeTo], composeSubject.trim(), composeBody.trim(), composeAck);
    setComposeSubject('');
    setComposeBody('');
    setShowCompose(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Compose */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#e6edf3]">
            INTER-AGENT COORDINATION MAIL
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Lanes exchange handoffs, wakes, review comments, and structured acknowledgments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-[#8b949e]" />
            <select
              value={filterLane}
              onChange={(e) => setFilterLane(e.target.value)}
              className="py-1 px-2.5 text-xs bg-[#161b22] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff]"
            >
              <option value="all">All Lanes & Operator</option>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="operator">Operator</option>
            </select>
          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose Mail</span>
          </button>
        </div>
      </div>

      {/* Main Mail Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden min-h-[500px]">
        {/* Messages List Column */}
        <div className="border-r border-[#30363d] overflow-y-auto max-h-[600px] divide-y divide-[#21262d]">
          {filteredMessages.map((msg) => {
            const isSelected = activeMessage?.id === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => setSelectedThread(msg.id)}
                className={`p-4 cursor-pointer transition font-mono text-xs ${
                  isSelected ? 'bg-[#1f242c] border-l-2 border-[#1f6feb]' : 'hover:bg-[#12161c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#e6edf3] flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#58a6ff]" />
                    {msg.from} → {msg.to.join(', ')}
                  </span>
                  <span className="text-[10px] text-[#8b949e]">#{msg.id}</span>
                </div>

                <div className="text-xs font-semibold text-[#c9d1d9] truncate mb-1">
                  {msg.subject}
                </div>

                <div className="text-[11px] text-[#8b949e] truncate mb-2">
                  {msg.body}
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#6e7681]">{msg.timestamp.slice(11, 19)}</span>
                  {msg.ackRequired && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        msg.acknowledged
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {msg.acknowledged ? 'ACKNOWLEDGED' : 'ACK OWED'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Content View */}
        <div className="md:col-span-2 p-6 flex flex-col justify-between">
          {activeMessage ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="border-b border-[#30363d] pb-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="text-lg font-bold font-mono text-[#e6edf3]">
                    {activeMessage.subject}
                  </h3>
                  {activeMessage.ackRequired && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        activeMessage.acknowledged
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {activeMessage.acknowledged ? 'ACKNOWLEDGED' : 'REQUIRES ACKNOWLEDGMENT'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#8b949e]">
                  <div>
                    From: <strong className="text-[#58a6ff]">{activeMessage.from}</strong>
                  </div>
                  <div>
                    To: <strong className="text-[#58a6ff]">{activeMessage.to.join(', ')}</strong>
                  </div>
                  <div>
                    Thread: <span className="text-[#c9d1d9]">{activeMessage.threadId}</span>
                  </div>
                  <div className="text-[11px] text-[#6e7681]">
                    {activeMessage.timestamp}
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="font-mono text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117] p-5 rounded-lg border border-[#30363d] whitespace-pre-wrap">
                {activeMessage.body}
              </div>

              {/* Acknowledge Button */}
              {activeMessage.ackRequired && !activeMessage.acknowledged && (
                <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg flex items-center justify-between gap-4">
                  <div className="text-xs font-mono text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>This lane message requires explicit operator or peer acknowledgment.</span>
                  </div>
                  <button
                    onClick={() => onAcknowledgeMessage(activeMessage.id)}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Acknowledge Message</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#8b949e] font-mono text-xs">
              <Inbox className="w-12 h-12 text-[#30363d] mb-3" />
              <span>No message selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold font-mono text-[#e6edf3] mb-4">
              DISPATCH COORDINATION MAIL
            </h3>
            <form onSubmit={handleComposeSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    FROM
                  </label>
                  <select
                    value={composeFrom}
                    onChange={(e) => setComposeFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  >
                    <option value="operator">operator</option>
                    {lanes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8b949e] mb-1 font-semibold">
                    TO (RECIPIENT LANE)
                  </label>
                  <select
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                  >
                    {lanes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] mb-1 font-semibold">
                  SUBJECT
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wake signal: issue #104 ready for integration"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8b949e] mb-1 font-semibold">
                  MESSAGE BODY (MARKDOWN)
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide instructions, schema diffs, or handoff context..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ackReq"
                  checked={composeAck}
                  onChange={(e) => setComposeAck(e.target.checked)}
                  className="rounded bg-[#0d1117] border-[#30363d] text-[#1f6feb] focus:ring-0"
                />
                <label htmlFor="ackReq" className="text-[#c9d1d9] cursor-pointer">
                  Require recipient lane acknowledgment (blocks unattended finish until ack'd)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium transition"
                >
                  Send Mail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
