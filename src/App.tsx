import { apiFetch, hasWriteToken, setWriteToken, clearWriteToken } from './lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lane, 
  Issue, 
  Reservation, 
  Message, 
  Plan, 
  Budget, 
  Problem, 
  CoordinationEvent, 
  TopSummary,
  Provider
} from './types';
import { 
  initialLanes, 
  initialIssues, 
  initialReservations, 
  initialMessages, 
  initialPlans, 
  initialBudget, 
  initialProblems, 
  initialEvents 
} from './data/initialData';
import { Header } from './components/Header';
import { TopStatusView } from './components/TopStatusView';
import { LanesView } from './components/LanesView';
import { IssuesView } from './components/IssuesView';
import { MailDrawer } from './components/MailDrawer';
import { ReservationsView } from './components/ReservationsView';
import { PlansView } from './components/PlansView';
import { TerminalView } from './components/TerminalView';
import { VideoPlayerView } from './components/VideoPlayerView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { ArchitectureView } from './components/ArchitectureView';
import { SharedMediaView } from './components/SharedMediaView';
import { KlingStudioView } from './components/KlingStudioView';
import { ConnectProjectView } from './components/ConnectProjectView';
import { MoviesProjectBanner } from './components/MoviesProjectBanner';
import { SpawnLaneModal } from './components/SpawnLaneModal';
import { BudgetModal } from './components/BudgetModal';
import { ConfigModal } from './components/ConfigModal';
import { 
  moviesProjectLanes, 
  moviesProjectIssues, 
  moviesProjectReservations, 
  moviesProjectMessages, 
  moviesProjectPlans, 
  moviesProjectBudget, 
  moviesProjectProblems, 
  moviesProjectEvents 
} from './data/moviesProjectData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('top');
  const [activeProject, setActiveProject] = useState<string>('movies_projects');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [targetBaseBranch, setTargetBaseBranch] = useState<string>('develop');

  const [lanes, setLanes] = useState<Lane[]>(moviesProjectLanes);
  const [issues, setIssues] = useState<Issue[]>(moviesProjectIssues);
  const [reservations, setReservations] = useState<Reservation[]>(moviesProjectReservations);
  const [messages, setMessages] = useState<Message[]>(moviesProjectMessages);
  const [plans, setPlans] = useState<Plan[]>(moviesProjectPlans);
  const [budget, setBudget] = useState<Budget>(moviesProjectBudget);
  const [problems, setProblems] = useState<Problem[]>(moviesProjectProblems);
  const [events, setEvents] = useState<CoordinationEvent[]>(moviesProjectEvents);

  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [composeTargetLane, setComposeTargetLane] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [writeUnlocked, setWriteUnlocked] = useState<boolean>(hasWriteToken());
  const [writeTokenInput, setWriteTokenInput] = useState('');
  useEffect(() => {
    const onUnauthorized = () => { setWriteUnlocked(false); setActionError('Acesso de escrita não autorizado (401). Desbloqueie com a credencial para escrever.'); };
    window.addEventListener('agent-parley:unauthorized', onUnauthorized);
    return () => window.removeEventListener('agent-parley:unauthorized', onUnauthorized);
  }, []);

  // Compute live summary
  const summary: TopSummary = {
    lanesTotal: lanes.length,
    lanesWorking: lanes.filter((l) => l.state === 'working').length,
    lanesIdle: lanes.filter((l) => l.state === 'idle').length,
    lanesStopped: lanes.filter((l) => l.state === 'stopped').length,
    issuesOpen: issues.filter((i) => i.status === 'open').length,
    issuesClaimed: issues.filter((i) => i.status === 'claimed' || i.status === 'in_progress').length,
    issuesInReview: issues.filter((i) => i.status === 'review').length,
    issuesCompleted: issues.filter((i) => i.status === 'completed').length,
    activeLeases: reservations.length,
    budgetUsedPercent: Math.round((budget.tokensUsed / budget.tokenCap) * 100),
    unresolvedProblems: problems.length,
  };

  // Sync state with backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.lanes) setLanes(data.lanes);
        if (data.issues) setIssues(data.issues);
        if (data.reservations) setReservations(data.reservations);
        if (data.budget) setBudget(data.budget);
        if (data.problems) setProblems(data.problems);
        if (data.events) setEvents(data.events);
      }
    } catch {
      // Fallback to local state if offline
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    fetchPlans();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchMessages, fetchPlans]);

  // Actions
  const handleWakeLane = async (id: string) => {
    try {
      await apiFetch(`/api/lanes/${id}/wake`, { method: 'POST' });
    } catch {}
    setLanes((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, state: 'working', idleSeconds: 0, lastEvent: 'wake: operator signal' } : l
      )
    );
    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'wake',
        lane: id,
        detail: 'Woken by operator signal',
      },
      ...prev,
    ]);
  };

  const handleStopLane = async (id: string) => {
    try {
      await apiFetch(`/api/lanes/${id}/stop`, { method: 'POST' });
    } catch {}
    setLanes((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, state: 'stopped', lastEvent: 'stop: operator retire' } : l
      )
    );
    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'refusal',
        lane: id,
        detail: 'Stopped and retired by operator',
      },
      ...prev,
    ]);
  };

  const handleSpawnLane = async (name: string, provider: Provider, branch?: string) => {
    const id = `lane-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newLane: Lane = {
      id,
      name,
      provider,
      state: 'working',
      branch: branch || `parley/${name}`,
      worktree: `.worktrees/${id}`,
      lastEvent: 'lane: initialized',
      lastEventTs: Date.now(),
      ownedIssues: [],
      unreadMail: 0,
      unacknowledgedMail: 0,
      leases: [],
      denials: 0,
      calls: 0,
      tokens: 0,
      idleSeconds: 0,
      currentTask: 'Initialized worktree and waiting for issue assignment',
      reviewStatus: 'none',
      liveness: true,
      contextUsagePercent: 0,
    };

    try {
      await apiFetch('/api/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, provider, branch }),
      });
    } catch {}

    setLanes((prev) => [...prev, newLane]);
    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'wake',
        lane: id,
        detail: `Spawned and initialized lane with provider ${provider}`,
      },
      ...prev,
    ]);
  };

  const handleClaimIssue = async (issueId: string, laneId: string) => {
    try {
      const res = await apiFetch(`/api/issues/${encodeURIComponent(issueId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laneId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(
          `Não foi possível atribuir ${issueId} à lane ${laneId}: ${data?.error ?? `erro HTTP ${res.status}`}`
        );
        return;
      }
    } catch {
      setActionError(`Não foi possível atribuir ${issueId} à lane ${laneId}: sem resposta do servidor.`);
      return;
    }
    setActionError(null);

    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, assignee: laneId, status: 'in_progress' } : i
      )
    );
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id === laneId && !l.ownedIssues.includes(issueId)) {
          return { ...l, ownedIssues: [...l.ownedIssues, issueId] };
        }
        return l;
      })
    );
    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'claim',
        lane: laneId,
        detail: `Atomic claim acquired on ${issueId}`,
      },
      ...prev,
    ]);
  };

  const handleUpdateIssueStatus = async (issueId: string, status: Issue['status']) => {
    try {
      const res = await apiFetch(`/api/issues/${encodeURIComponent(issueId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(
          `Não foi possível atualizar ${issueId}: ${data?.error ?? `erro HTTP ${res.status}`}`
        );
        return;
      }
    } catch {
      setActionError(`Não foi possível atualizar ${issueId}: sem resposta do servidor.`);
      return;
    }
    setActionError(null);

    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status } : i))
    );
  };

  const handleCreateIssue = async (title: string, priority: Issue['priority'], assignee?: string) => {
    const id = `#${100 + issues.length + 1}`;
    const newIssue: Issue = {
      id,
      title,
      status: assignee ? 'in_progress' : 'open',
      assignee: assignee || null,
      priority,
      churnCount: 0,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    try {
      await apiFetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, assignee }),
      });
    } catch {}

    setIssues((prev) => [...prev, newIssue]);
    if (assignee) {
      setLanes((prev) =>
        prev.map((l) =>
          l.id === assignee && !l.ownedIssues.includes(id)
            ? { ...l, ownedIssues: [...l.ownedIssues, id] }
            : l
        )
      );
    }
  };

  const handleFileReservation = async (
    path: string,
    owner: string,
    reason: string,
    ttlSeconds: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, owner, reason, ttlSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      setReservations((prev) => [...prev, data]);
      setLanes((prev) =>
        prev.map((l) => (l.id === owner ? { ...l, leases: [...l.leases, path] } : l))
      );
      return { success: true };
    } catch (err: any) {
      // Local fallback conflict check
      const existing = reservations.find((r) => r.path === path);
      if (existing) {
        return { success: false, error: `Conflict: ${path} held by ${existing.owner}` };
      }
      const newRes: Reservation = {
        id: `res-${Date.now()}`,
        path,
        owner,
        reason,
        acquiredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ttlSeconds,
      };
      setReservations((prev) => [...prev, newRes]);
      return { success: true };
    }
  };

  const handleReleaseReservation = async (id: string) => {
    const res = reservations.find((r) => r.id === id);
    try {
      await apiFetch(`/api/reservations/${id}`, { method: 'DELETE' });
    } catch {}
    setReservations((prev) => prev.filter((r) => r.id !== id));
    if (res) {
      setLanes((prev) =>
        prev.map((l) =>
          l.id === res.owner ? { ...l, leases: l.leases.filter((lp) => lp !== res.path) } : l
        )
      );
    }
  };

  const handleSendMessage = async (
    from: string,
    to: string[],
    subject: string,
    body: string,
    ackRequired: boolean
  ) => {
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, body, ackRequired }),
      });
      const data = await res.json();
      setMessages((prev) => [data, ...prev]);
    } catch {
      const newMsg: Message = {
        id: messages.length + 1,
        from,
        to,
        subject,
        body,
        threadId: `th-${Date.now().toString(36)}`,
        ackRequired,
        acknowledged: false,
        read: false,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      setMessages((prev) => [newMsg, ...prev]);
    }
    fetchStatus();
  };

  const handleAcknowledgeMessage = async (id: number) => {
    try {
      await apiFetch(`/api/messages/${id}/ack`, { method: 'POST' });
    } catch {}
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, acknowledged: true } : m))
    );
    // Dismiss corresponding unacknowledged mail problem if applicable
    setProblems((prev) => prev.filter((p) => !p.detail.includes(`Message #${id}`)));
  };

  const handleApprovePlan = async (id: string) => {
    try {
      await apiFetch(`/api/plans/${id}/approve`, { method: 'POST' });
    } catch {}
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
    );
  };

  const handleRejectPlan = async (id: string) => {
    try {
      await apiFetch(`/api/plans/${id}/reject`, { method: 'POST' });
    } catch {}
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
    );
  };

  const handleToggleBudgetEnforce = async () => {
    try {
      const res = await apiFetch('/api/budget/toggle', { method: 'POST' });
      const data = await res.json();
      setBudget(data);
    } catch {
      setBudget((prev) => ({ ...prev, enforced: !prev.enforced }));
    }
  };

  const handleUpdateBudget = async (tokenCap: number, callsCap: number, hoursCap: number) => {
    try {
      const res = await apiFetch('/api/budget/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenCap, callsCap, hoursCap }),
      });
      const data = await res.json();
      setBudget(data);
    } catch {
      setBudget((prev) => ({ ...prev, tokenCap, callsCap, hoursCap }));
    }
  };

  const handleDismissProblem = async (id: string) => {
    try {
      await apiFetch(`/api/problems/${id}`, { method: 'DELETE' });
    } catch {}
    setProblems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleExecuteCommand = async (command: string): Promise<string> => {
    const res = await apiFetch('/api/cli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    fetchStatus();
    return data.output;
  };

  const handleRunDemo = () => {
    setActiveTab('terminal');
    handleExecuteCommand('agent-parley demo');
  };

  const handleComposeMessageTo = (laneId: string) => {
    setComposeTargetLane(laneId);
    setActiveTab('mail');
  };

  const handleSwitchProject = async (targetProj: string) => {
    setActiveProject(targetProj);
    if (targetProj === 'movies_projects') {
      setLanes(moviesProjectLanes);
      setIssues(moviesProjectIssues);
      setReservations(moviesProjectReservations);
      setMessages(moviesProjectMessages);
      setPlans(moviesProjectPlans);
      setBudget(moviesProjectBudget);
      setProblems(moviesProjectProblems);
      setEvents(moviesProjectEvents);
    } else {
      setLanes(initialLanes);
      setIssues(initialIssues);
      setReservations(initialReservations);
      setMessages(initialMessages);
      setPlans(initialPlans);
      setBudget(initialBudget);
      setProblems(initialProblems);
      setEvents(initialEvents);
    }
    try {
      await apiFetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: targetProj }),
      });
    } catch {}
  };

  const handleSyncRepo = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/api/projects/movies/sync', { method: 'POST' });
      if (res.ok) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        fetchStatus();
      }
    } catch {
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col font-sans selection:bg-[#1f6feb] selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        budget={budget}
        onOpenSpawnModal={() => setIsSpawnModalOpen(true)}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onRunDemo={handleRunDemo}
      />

      <MoviesProjectBanner
        activeProject={activeProject}
        onSwitchProject={handleSwitchProject}
        onSyncRepo={handleSyncRepo}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        targetBaseBranch={targetBaseBranch}
        onSetTargetBaseBranch={setTargetBaseBranch}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 font-mono text-xs">
          {writeUnlocked ? (
            <>
              <span className="text-emerald-400">Escrita desbloqueada nesta sessão</span>
              <button type="button" className="text-[#8b949e] underline" onClick={() => { clearWriteToken(); setWriteUnlocked(false); }}>Bloquear</button>
            </>
          ) : (
            <>
              <span className="text-[#8b949e]">Leituras públicas; escrita requer credencial:</span>
              <input type="password" value={writeTokenInput} onChange={(e) => setWriteTokenInput(e.target.value)} placeholder="Credencial de escrita" className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[#e6edf3]" />
              <button type="button" className="font-semibold text-[#58a6ff]" onClick={() => { if (writeTokenInput.trim()) { setWriteToken(writeTokenInput.trim()); setWriteTokenInput(''); setWriteUnlocked(true); setActionError(null); } }}>Desbloquear escrita</button>
            </>
          )}
        </div>
        {actionError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/20 px-3 py-2 font-mono text-xs text-red-400"
          >
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="font-semibold">
              Fechar
            </button>
          </div>
        )}

        {activeTab === 'top' && (
          <TopStatusView
            summary={summary}
            lanes={lanes}
            issues={issues}
            reservations={reservations}
            budget={budget}
            problems={problems}
            events={events}
            onWakeLane={handleWakeLane}
            onStopLane={handleStopLane}
            onDismissProblem={handleDismissProblem}
            onSelectTab={setActiveTab}
            onComposeMessageTo={handleComposeMessageTo}
          />
        )}

        {activeTab === 'connect' && (
          <ConnectProjectView
            onSelectTab={setActiveTab}
            onExecuteCommand={handleExecuteCommand}
          />
        )}

        {activeTab === 'lanes' && (
          <LanesView
            lanes={lanes}
            onWakeLane={handleWakeLane}
            onStopLane={handleStopLane}
            onOpenSpawnModal={() => setIsSpawnModalOpen(true)}
            onComposeMessageTo={handleComposeMessageTo}
          />
        )}

        {activeTab === 'issues' && (
          <IssuesView
            issues={issues}
            lanes={lanes}
            onClaimIssue={handleClaimIssue}
            onUpdateStatus={handleUpdateIssueStatus}
            onCreateIssue={handleCreateIssue}
          />
        )}

        {activeTab === 'mail' && (
          <MailDrawer
            messages={messages}
            lanes={lanes}
            onAcknowledgeMessage={handleAcknowledgeMessage}
            onSendMessage={handleSendMessage}
            initialTargetLane={composeTargetLane}
          />
        )}

        {activeTab === 'reservations' && (
          <ReservationsView
            reservations={reservations}
            lanes={lanes}
            onFileReservation={handleFileReservation}
            onReleaseReservation={handleReleaseReservation}
          />
        )}

        {activeTab === 'plans' && (
          <PlansView
            plans={plans}
            onApprovePlan={handleApprovePlan}
            onRejectPlan={handleRejectPlan}
          />
        )}

        {activeTab === 'shared_media' && <SharedMediaView />}

        {activeTab === 'kling_studio' && (
          <KlingStudioView
            onSaveToRegistry={(data) => {
              apiFetch('/api/kling/save-to-registry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
            }}
            onDispatchTask={(task) => {
              apiFetch('/api/lanes/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: task.task_id,
                  provider: 'codex',
                  worktree: 'worktrees/task-kling-release',
                  branch: 'parley/kling-release-pass',
                  task: `Run ${task.tool} for ${task.args.asset_id}`,
                }),
              });
            }}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalView onExecuteCommand={handleExecuteCommand} />
        )}

        {activeTab === 'video' && <VideoPlayerView />}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView onOpenConfigModal={() => setIsConfigModalOpen(true)} />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] py-4 bg-[#161b22] text-[#8b949e] font-mono text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#c9d1d9]">Agent Parley</span>
            <span>—</span>
            <span>Local MCP transport and parallel Git worktree governance</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Port: 3000</span>
            <span>Host: 0.0.0.0</span>
            <span className="text-emerald-400">Daemon: Healthy</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SpawnLaneModal
        isOpen={isSpawnModalOpen}
        onClose={() => setIsSpawnModalOpen(false)}
        onSpawnLane={handleSpawnLane}
      />

      <BudgetModal
        budget={budget}
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onToggleEnforce={handleToggleBudgetEnforce}
        onUpdateBudget={handleUpdateBudget}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};

export default App;
