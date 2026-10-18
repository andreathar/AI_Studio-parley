const SCHEMA = 'movies-ai-studio/offline-comparison/v2';
const STATES = ['completed', 'in_progress', 'blocked', 'pending', 'todo'];
const LABELS = { completed: 'Concluída', in_progress: 'Em andamento', blocked: 'Bloqueada', pending: 'Pendente', todo: 'A fazer' };
const fail = () => { throw new Error('Snapshot Movies inválido ou incompatível. Exporte novamente no computador local.'); };
const text = (x, max = 300) => typeof x === 'string' && x.length > 0 && x.length <= max;
const count = x => Number.isSafeInteger(x) && x >= 0 && x <= 1_000_000;
const ids = x => Array.isArray(x) && x.length <= 2000 && x.every(v => text(v, 96)) && new Set(x).size === x.length;

export function localOrigin(location) {
  return location.protocol === 'file:' ||
    (['http:', 'https:'].includes(location.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname));
}

export function validateSnapshot(input) {
  try {
    if (input.schema !== SCHEMA || input.mode !== 'offline_read_only' || input.runtimeCoordinator !== null ||
        !text(input.observedAt) || !Number.isFinite(Date.parse(input.observedAt))) fail();
    const m = input.movies, a = input.appSource, c = input.comparison;
    if (m.projectId !== 'andre-time-travel' || !ids(m.taskIds) || !ids(m.roleIds) || !ids(m.chapterIds) ||
        !count(m.assetRecords) || !Array.isArray(m.tasks) || m.tasks.length !== m.taskIds.length) fail();
    const tasks = m.tasks.map(t => {
      if (!/^T\d{2,}$/.test(t.id) || !text(t.title) || !STATES.includes(t.status) || !m.roleIds.includes(t.ownerRole)) fail();
      return { id: t.id, title: t.title, status: t.status, ownerRole: t.ownerRole };
    });
    if (new Set(tasks.map(t => t.id)).size !== tasks.length || tasks.some((t, i) => t.id !== m.taskIds[i])) fail();
    const taskStates = Object.fromEntries(STATES.map(s => [s, tasks.filter(t => t.status === s).length]));
    if (Object.entries(m.taskStates).some(([s, n]) => !STATES.includes(s) || taskStates[s] !== n) ||
        STATES.some(s => (m.taskStates[s] ?? 0) !== taskStates[s])) fail();
    if (!text(a.packageVersion, 64) || !ids(a.demoLaneIds) || !ids(a.demoIssueIds) ||
        !ids(c.commonTaskIds) || !ids(c.exportSourceMismatches) || !count(c.checkedExportSources) || !count(c.unverifiedExportSources)) fail();
    if (!Array.isArray(input.sources) || input.sources.length > 100) fail();
    const sources = input.sources.map(s => {
      if (!['movies', 'app'].includes(s.scope) || !text(s.path) || s.path.startsWith('/') ||
          s.path.includes('\\') || s.path.split('/').some(p => ['.', '..', ''].includes(p)) || !/^[a-f0-9]{64}$/.test(s.sha256)) fail();
      return { scope: s.scope, path: s.path, sha256: s.sha256 };
    });
    return {
      schema: SCHEMA, mode: 'offline_read_only', runtimeCoordinator: null, observedAt: input.observedAt,
      movies: { projectId: m.projectId, tasks, taskIds: tasks.map(t => t.id), taskStates,
        roleIds: [...m.roleIds], chapterIds: [...m.chapterIds], assetRecords: m.assetRecords },
      appSource: { packageVersion: a.packageVersion, demoLaneIds: [...a.demoLaneIds], demoIssueIds: [...a.demoIssueIds] },
      comparison: { commonTaskIds: [...c.commonTaskIds], exportSourceMismatches: [...c.exportSourceMismatches],
        checkedExportSources: c.checkedExportSources, unverifiedExportSources: c.unverifiedExportSources }, sources,
    };
  } catch { return fail(); }
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function table(headings, rows) {
  const wrapper = element('div', undefined, 'lm-table-wrap');
  const node = element('table');
  const head = element('tr');
  for (const value of headings) { const cell = element('th', value); cell.scope = 'col'; head.append(cell); }
  node.append(element('thead')); node.tHead.append(head);
  const body = element('tbody');
  for (const values of rows) {
    const row = element('tr');
    for (const value of values) row.append(element('td', String(value)));
    body.append(row);
  }
  node.append(body); wrapper.append(node);
  return wrapper;
}

export function mountLocalMoviesView(root, initialSnapshot = null) {
  root.replaceChildren(); root.className = 'local-movies';
  if (!localOrigin(window.location)) {
    root.append(element('p', 'O modo Movies local só pode abrir neste computador. Nenhum arquivo foi lido.'));
    return () => root.replaceChildren();
  }
  let snapshot = null, activeTab = 'tasks', disposed = false;
  const header = element('header', undefined, 'lm-header');
  const brand = element('div'); brand.append(element('strong', 'AGENT PARLEY'), element('span', 'MOVIES LOCAL · SOMENTE LEITURA', 'lm-badge'));
  const title = element('h1', 'Produção do filme');
  const description = element('p', 'Snapshot local. Sem dispatch, sincronização Git, modelo pago ou acesso ao coordenador.');
  const label = element('label', 'Importar JSON local', 'lm-import');
  const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.setAttribute('aria-label', 'Importar snapshot Movies');
  label.append(file); header.append(brand, title, description, label);
  const notice = element('p', 'Selecione o JSON gerado por scripts/movies_snapshot.py. O arquivo é lido pelo navegador e não é enviado.', 'lm-notice');
  const error = element('p', '', 'lm-error'); error.setAttribute('role', 'alert');
  const content = element('main'); root.append(header, notice, error, content);

  function render() {
    content.replaceChildren();
    if (!snapshot) return;
    const m = snapshot.movies;
    const stamp = element('p', `andre-time-travel · observado em ${snapshot.observedAt}`, 'lm-stamp');
    const cards = element('section', undefined, 'lm-cards');
    for (const [value, name] of [[m.tasks.length, 'Tarefas canônicas'], [m.assetRecords, 'Registros de assets'], [m.roleIds.length, 'Papéis definidos'], [m.chapterIds.length, 'Capítulos']]) {
      const card = element('article'); card.append(element('strong', String(value)), element('span', name)); cards.append(card);
    }
    const nav = element('nav'); nav.setAttribute('aria-label', 'Seções do snapshot');
    for (const [key, name] of [['tasks', 'Tarefas'], ['roles', 'Papéis'], ['comparison', 'Comparação com demo'], ['sources', 'Proveniência']]) {
      const button = element('button', name); button.type = 'button'; button.setAttribute('aria-pressed', String(key === activeTab));
      button.addEventListener('click', () => { activeTab = key; render(); }); nav.append(button);
    }
    const panel = element('section', undefined, 'lm-panel'); content.append(stamp, cards, nav, panel);
    if (activeTab === 'tasks') {
      panel.append(element('h2', 'Tarefas de Movies_Projects'));
      const filters = element('div', undefined, 'lm-filters');
      const search = element('input'); search.type = 'search'; search.placeholder = 'Buscar ID, título ou papel'; search.setAttribute('aria-label', 'Buscar tarefas');
      const select = element('select'); select.setAttribute('aria-label', 'Filtrar status');
      for (const [value, name] of [['', 'Todos os status'], ...STATES.map(s => [s, `${LABELS[s]} (${m.taskStates[s]})`])]) {
        const option = element('option', name); option.value = value; select.append(option);
      }
      filters.append(search, select); const rows = element('div');
      function renderRows() {
        const query = search.value.toLocaleLowerCase();
        const filtered = m.tasks.filter(t => (!select.value || t.status === select.value) && `${t.id} ${t.title} ${t.ownerRole}`.toLocaleLowerCase().includes(query));
        rows.replaceChildren(element('p', `${filtered.length} de ${m.tasks.length} tarefas`, 'lm-stamp'),
          table(['ID', 'Tarefa', 'Status de produção', 'Papel responsável'], filtered.map(t => [t.id, t.title, LABELS[t.status], t.ownerRole])));
      }
      search.addEventListener('input', renderRows); select.addEventListener('change', renderRows);
      panel.append(filters, rows); renderRows();
    } else if (activeTab === 'roles') {
      panel.append(element('h2', 'Papéis definidos, sem inferir sessões'),
        element('p', 'Esses papéis vêm da registry canônica. Não representam lanes ativas, permissões concedidas nem aceite de uma atribuição.'),
        table(['Papel', 'Sessão / atividade'], m.roleIds.map(id => [id, 'Não consultada'])));
    } else if (activeTab === 'comparison') {
      const a = snapshot.appSource, c = snapshot.comparison;
      panel.append(element('h2', 'Demonstração × Movies canônico'),
        table(['Campo', 'Demo no checkout AI Studio', 'Movies neste snapshot'], [
          ['Tarefas', a.demoIssueIds.join(', '), m.taskIds.join(', ')],
          ['Lanes / papéis', a.demoLaneIds.join(', '), `${m.roleIds.length} papéis; sessões não consultadas`],
          ['Domínio', 'Catálogo de filmes TMDB / watchlist', 'Produção audiovisual: roteiro, cobertura, edição e QC'],
          ['Mídia', 'Seed de demonstração', `${m.assetRecords} registros; bytes permanecem no armazenamento canônico`],
          ['Budget / liveness', 'Valores seed; não comprovam execução', 'Não consultados'],
        ]), element('p', `IDs comuns: ${c.commonTaskIds.length}. Hashes do export conferidos: ${c.checkedExportSources}; divergentes: ${c.exportSourceMismatches.length}; não verificados: ${c.unverifiedExportSources}.`, 'lm-notice'));
    } else {
      panel.append(element('h2', 'Proveniência do snapshot'),
        element('p', 'Hashes das fontes delimitadas. Não atestam bytes de mídia, aprovações artísticas ou revisão implantada no site público.'),
        table(['Escopo', 'Fonte relativa', 'SHA-256'], snapshot.sources.map(s => [s.scope, s.path, s.sha256])));
    }
  }

  function load(input) {
    const next = validateSnapshot(input);
    if (disposed) return;
    snapshot = next; error.textContent = '';
    notice.textContent = 'Dados canônicos carregados. Nenhuma API do app ou coordenador é consultada; a mídia continua na raiz Movies.';
    render();
  }
  file.addEventListener('change', async () => {
    try {
      const picked = file.files?.[0]; if (!picked) return;
      if (picked.size > 1024 * 1024) throw new Error('Snapshot acima do limite de 1 MiB.');
      load(JSON.parse(await picked.text()));
    } catch { if (!disposed) error.textContent = 'Snapshot inválido. Os dados anteriores foram preservados; exporte novamente.'; }
    file.value = '';
  });
  if (initialSnapshot) {
    try { load(initialSnapshot); } catch { error.textContent = 'Snapshot inicial inválido. Importe um export local válido.'; }
  }
  return () => { disposed = true; root.replaceChildren(); };
}
