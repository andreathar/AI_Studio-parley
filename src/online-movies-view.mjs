import { validateObservation } from './shared/moviesObservation.mjs';
export function observationViewState(envelope, now = Date.now()) {
    if (!envelope || typeof envelope !== 'object' || Object.keys(envelope).sort().join(',') !== 'expiresAt,observation,state' ||
        !['offline', 'stale', 'current'].includes(envelope.state) || !Number.isFinite(Date.parse(envelope.expiresAt)))
        throw Error('Observation response refused');
    if (now >= Date.parse(envelope.expiresAt))
        return { state: 'expired', observation: null };
    const observation = envelope.observation === null ? null : validateObservation(envelope.observation);
    if (!observation)
        return { state: 'offline', observation: null };
    const age = now - Date.parse(observation.observedAt);
    if (age < -30000)
        throw Error('Observation response refused');
    return { state: envelope.state === 'offline' ? 'offline' : age > 90000 ? 'stale' : envelope.state, observation };
}
const node = (tag, text) => { const result = document.createElement(tag); if (text !== undefined)
    result.textContent = text; return result; };
const labels = { offline: 'Sem observação disponível', stale: 'Observação desatualizada', current: 'Observação recebida', expired: 'Piloto encerrado', unauthorized: 'Informe o código de leitura do piloto' };
function grid(headings, rows) {
    const table = node('table'), head = node('thead'), body = node('tbody'), row = node('tr');
    for (const heading of headings) {
        const cell = node('th', heading);
        cell.scope = 'col';
        row.append(cell);
    }
    head.append(row);
    for (const values of rows) {
        const tr = node('tr');
        for (const value of values)
            tr.append(node('td', String(value)));
        body.append(tr);
    }
    table.append(head, body);
    const wrapper = node('div');
    wrapper.className = 'lm-table-wrap';
    wrapper.append(table);
    return wrapper;
}
export function mountOnlineMoviesView(root) {
    root.replaceChildren();
    root.className = 'local-movies';
    const header = node('header');
    header.className = 'lm-header';
    header.append(node('strong', 'AGENT PARLEY · MOVIES'), node('h1', 'Observador de produção'), node('p', 'Somente leitura. Participantes, papéis e tarefas são entidades distintas. Mídia disponível apenas localmente.'));
    const form = node('form'), input = node('input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.maxLength = 128;
    input.setAttribute('aria-label', 'Código de leitura');
    const login = node('button', 'Entrar'), logout = node('button', 'Sair');
    login.type = 'submit';
    logout.type = 'button';
    form.append(input, login, logout);
    header.append(form);
    const status = node('p', labels.unauthorized);
    status.className = 'lm-notice';
    status.setAttribute('role', 'status');
    const body = node('main');
    root.append(header, status, body);
    let closed = false, busy = false, timer = null, controller = null, last = null, generation = 0;
    function display(state) {
        status.textContent = labels[state] || labels.offline;
        body.replaceChildren();
        if (!last)
            return;
        const o = last;
        body.append(node('p', `Movies_Projects · observado em ${o.observedAt} · coordenador: ${o.coordinator.state}`));
        body.append(node('h2', `Participantes observados (${o.participants.length})`), grid(['Participante', 'Provider', 'Estado observado', 'Papel de filme'], o.participants.map(p => [p.id, p.provider, p.state, p.filmRoleId ?? 'Não atribuído'])));
        body.append(node('h2', `Papéis definidos (${o.filmRoles.length})`), node('p', o.filmRoles.join(' · ')));
        body.append(node('h2', `Tarefas de produção (${o.productionTasks.length})`), grid(['ID', 'Status', 'Papel responsável', 'Dependências'], o.productionTasks.map(t => [t.id, t.status, t.ownerRole, t.dependsOn.join(', ') || '—'])));
        body.append(node('p', `${o.counts.chapters} capítulos · ${o.counts.assets} registros de assets. Nenhum arquivo de mídia é enviado ao observador.`));
    }
    function stop() { if (timer)
        clearInterval(timer); timer = null; }
    async function call(method, path, headers = {}) {
        const current = new AbortController();
        controller = current;
        const timeout = setTimeout(() => current.abort(), 8000);
        try {
            return await fetch(path, { method, headers, credentials: 'same-origin', cache: 'no-store', signal: current.signal });
        }
        finally {
            clearTimeout(timeout);
            if (controller === current)
                controller = null;
        }
    }
    async function poll() {
        if (closed || busy)
            return;
        busy = true;
        const requestGeneration = generation;
        try {
            const response = await call('GET', '/api/movies-observer/snapshot');
            if (closed || requestGeneration !== generation)
                return;
            if (response.status === 401) {
                last = null;
                stop();
                display('unauthorized');
                return;
            }
            if (response.status === 410) {
                last = null;
                stop();
                display('expired');
                return;
            }
            if (!response.ok) {
                display('offline');
                return;
            }
            const value = observationViewState(await response.json());
            if (closed || requestGeneration !== generation)
                return;
            last = value.observation;
            display(value.state);
            if (value.state === 'expired')
                stop();
        }
        catch {
            if (!closed && requestGeneration === generation)
                display('offline');
        }
        finally {
            if (requestGeneration === generation)
                busy = false;
        }
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy || closed)
            return;
        const credential = input.value;
        input.value = '';
        busy = true;
        const requestGeneration = ++generation;
        try {
            const response = await call('POST', '/api/movies-observer/session', { 'Authorization': `Bearer ${credential}` });
            if (closed || requestGeneration !== generation)
                return;
            if (response.status !== 204) {
                last = null;
                display(response.status === 410 ? 'expired' : 'unauthorized');
                return;
            }
            stop();
            timer = setInterval(poll, 15000);
        }
        catch {
            if (!closed && requestGeneration === generation)
                display('offline');
        }
        finally {
            if (requestGeneration === generation)
                busy = false;
        }
        await poll();
    });
    logout.addEventListener('click', async () => {
        stop();
        last = null;
        ++generation;
        busy = false;
        controller?.abort();
        try {
            await call('DELETE', '/api/movies-observer/session');
        }
        catch { }
        display('unauthorized');
    });
    timer = setInterval(poll, 15000);
    void poll();
    return () => { closed = true; ++generation; stop(); controller?.abort(); root.replaceChildren(); };
}
