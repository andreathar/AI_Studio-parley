async function bootstrap() {
  const root = document.getElementById('root')!;
  if(document.documentElement.dataset.moviesObserver==='1' || new URLSearchParams(window.location.search).has('movies-observer')) {
    const {mountOnlineMoviesView}=await import('./online-movies-view.mjs');
    await import('./local-movies.css');
    mountOnlineMoviesView(root);
    return;
  }
  if (new URLSearchParams(window.location.search).has('movies-local')) {
    const { localOrigin, mountLocalMoviesView } = await import('./local-movies-view.mjs');
    if (!localOrigin(window.location)) {
      root.textContent = 'O modo Movies local só pode abrir neste computador. Nenhum arquivo foi lido.';
      return;
    }
    await import('./local-movies.css');
    const initialSnapshot = new URLSearchParams(window.location.search).has('preview-snapshot')
      ? await fetch('/snapshot.json', { cache: 'no-store' }).then(response => {
          if (!response.ok) throw new Error('Snapshot local indisponível.');
          return response.json();
        })
      : null;
    mountLocalMoviesView(root, initialSnapshot);
    return;
  }
  const [React, ReactDOM, { default: App }] = await Promise.all([
    import('react'), import('react-dom/client'), import('./App'),
    import('./index.css'),
  ]);
  ReactDOM.createRoot(root).render(React.createElement(React.StrictMode, null, React.createElement(App)));
}

void bootstrap();
