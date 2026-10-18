/** Same versioned read model for the isolated preview and future local UI. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function validate(value, projectId, cycleId) {
    if (!value || value.schema !== 'movies-workflow/read/v1' || value.projectId !== projectId || value.cycleId !== cycleId || !Number.isSafeInteger(value.stateVersion) || value.stateVersion < 0 || !Array.isArray(value.tasks) || !Array.isArray(value.assignments) || !Array.isArray(value.receipts))
        throw Error('Unexpected workflow observation');
    return value;
}
export function createWorkflowClient({ baseUrl, projectId, cycleId, fetch: request = globalThis.fetch }) {
    const endpoint=new URL(baseUrl,globalThis.location?.href??'http://127.0.0.1');
    if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!==`/api/workflow/v1/cycles/${cycleId}`||(globalThis.location&&globalThis.location.origin!==endpoint.origin))throw Error('Local same-origin workflow endpoint required');
    baseUrl=endpoint.href;
    const state = { snapshot: null, stale: true, notice: 'Aguardando leitura confirmada' };
    let busy = false;
    const refresh = async () => { try {
        const r = await request(baseUrl, { cache: 'no-store' });
        if (!r.ok)
            throw Error('Leitura indisponível');
        const v = validate(await r.json(), projectId, cycleId);
        if (state.snapshot && v.stateVersion < state.snapshot.stateVersion)
            throw Error('Revisão antiga');
        state.snapshot = v;
        state.stale = false;
        state.notice = 'Dados confirmados pelo backend';
        return v;
    }
    catch (e) {
        state.stale = true;
        state.notice = 'Leitura indisponível; última observação desatualizada';
        throw e;
    } };
    let pending = null;
    const send = async () => { if (busy || !pending)
        throw Error('Nenhum comando pendente'); busy = true; try {
        const r = await request(baseUrl + '/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) });
        if (!r.ok) {
            pending = null;
            state.stale = true;
            state.notice = r.status === 409 ? 'Conflito de revisão; atualize a leitura' : 'Comando recusado';
            throw Error(state.notice);
        }
        const result = await r.json();
        await refresh();
        if (result.stateVersion > state.snapshot.stateVersion)
            throw Error('Leitura anterior ao commit');
        pending = null;
        return result;
    }
    catch (e) {
        state.stale = true;
        throw e;
    }
    finally {
        busy = false;
    } };
    const command = async (type, data) => { if (busy || pending || state.stale || !state.snapshot)
        throw Error('Atualize ou reconcilie o comando pendente'); pending = { cycleId, expectedVersion: state.snapshot.stateVersion, idempotencyKey: crypto.randomUUID(), type, data }; return send(); };
    const retryPending = async () => send();
    return { state, refresh, command, retryPending };
}
export function renderWorkflow(snapshot, { stale = false, notice = 'Preview isolado; execução desativada' } = {}) {
    if (!snapshot)
        return `<main><h1>Novo ciclo Movies</h1><p role="status">Leitura indisponível; nenhum dado demo substitui a observação.</p></main>`;
    const rows = snapshot.tasks.map(t => { const a = snapshot.assignments.find(a => a.task_id === t.id); return `<tr><td>${escape(t.id)}</td><td>${escape(t.title)}</td><td>${escape(t.role)}</td><td>${escape(t.status)}</td><td>${escape(t.accountableActorId)}</td><td>${escape(t.dependsOn.join(', ') || '—')}</td><td>${escape(a?.transport_state || 'não enfileirado')}<br>ACK de transporte: ${a?.transport_ack ? 'confirmado' : 'não observado'}</td><td>${escape(a?.state || 'sem assignment')}</td></tr>`; }).join('');
    return `<main><p>MOVIES · NOVO CICLO · ${stale ? 'DESATUALIZADO' : 'LEITURA CONFIRMADA'}</p><h1>Sequência de trabalho</h1><p role="status">${escape(notice)}</p><p>Projeto ${escape(snapshot.projectId)} · ciclo ${escape(snapshot.cycleId)}</p><p>Estado ${escape(snapshot.status)} · grafo ${escape(snapshot.graphRevision)} · revisão ${escape(snapshot.stateVersion)}</p><p>${snapshot.tasks.length} tarefas · ${snapshot.assignments.length} atribuições · ${snapshot.receipts.length} recibos. Papéis definidos não são agentes iniciados. Sem aprovação criativa ou gasto herdado.</p><table><thead><tr><th>ID</th><th>Tarefa</th><th>Papel</th><th>Status</th><th>Responsável atual</th><th>Dependências</th><th>Transporte</th><th>Aceite da tarefa / execução</th></tr></thead><tbody>${rows}</tbody></table></main>`;
}
export function mountWorkflowView(root, client) {
    let disposed = false;
    const draw = () => { if (disposed)
        return; root.innerHTML = `<button type="button" data-refresh>Atualizar leitura</button>${renderWorkflow(client.state.snapshot, client.state)}`; root.querySelector('[data-refresh]')?.addEventListener('click', () => refresh()); };
    const refresh = async () => { try {
        await client.refresh();
    }
    catch { } draw(); };
    void refresh();
    return () => { disposed = true; };
}
