import { useStore } from '../state/store.jsx';
import { AppCard } from './AppCard.jsx';
import { IconBox, IconSearch, IconUpdate } from './Icons.jsx';

export function Home({ mobile, openApp, openExternal }) {
  const { state, updates, dispatch, refresh, visibleApps } = useStore();
  const featured = state.apps.find((a) => a.featured) || updates[0] || state.apps[0] || null;
  const loading = state.status === 'loading' && state.apps.length === 0;

  return (
    <>
      {featured && (
        <div className={`hero ${mobile ? 'hero--mobile' : ''}`}>
          <div className="hero__body">
            <div className="hero__kicker">
              {featured.needsUpdate ? 'Mise a jour disponible' : 'A la une'}
            </div>
            <h2>{featured.name}</h2>
            <p>{featured.tagline || featured.description?.split('\n')[0] || featured.repo}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => openApp(featured.id)}>
                {featured.needsUpdate ? 'Mettre a jour' : 'Voir la fiche'}
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => openExternal(`https://github.com/${featured.repo}`)}
                title="Ouvrir la page GitHub"
              >
                {featured.repo}
              </button>
            </div>
          </div>
        </div>
      )}

      {updates.length > 0 && (
        <div className="section">
          <div className="section__head">
            <IconUpdate size={17} />
            <h2>Mises a jour</h2>
            <span className="count">{updates.length}</span>
            <button className="section__action" onClick={() => dispatch({ type: 'view', view: 'updates' })}>
              Tout voir
            </button>
          </div>
          <div className="grid">
            {updates.map((app) => (
              <AppCard key={app.id} app={app} onOpen={openApp} />
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section__head">
          <h2>Toutes les applications</h2>
          <span className="count">{state.apps.length}</span>
          <button className="section__action" onClick={() => refresh()}>
            Actualiser
          </button>
        </div>
        {loading ? (
          <div className="grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        ) : visibleApps.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid">
            {visibleApps.map((app) => (
              <AppCard key={app.id} app={app} onOpen={openApp} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function Explore({ mobile, openApp }) {
  const { state, dispatch, visibleApps } = useStore();
  const categories = state.catalog.categories || [];
  return (
    <>
      <div className={`search ${mobile ? 'mobile-only' : ''}`} style={mobile ? { margin: '0 16px 10px' } : undefined}>
        <IconSearch size={16} />
        <input
          value={state.search}
          placeholder="Rechercher une application..."
          onChange={(e) => dispatch({ type: 'search', value: e.target.value })}
        />
        {state.search && (
          <button className="search__clear" onClick={() => dispatch({ type: 'search', value: '' })}>
            x
          </button>
        )}
      </div>

      <div className="section" style={{ marginBottom: 20 }}>
        <div className="chips">
          <button
            className={`chip ${state.category === 'all' ? 'chip--active' : ''}`}
            onClick={() => dispatch({ type: 'category', value: 'all' })}
          >
            Toutes
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`chip ${state.category === c ? 'chip--active' : ''}`}
              onClick={() => dispatch({ type: 'category', value: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section__head">
          <h2>
            {state.category === 'all' ? 'Catalogue' : state.category}
          </h2>
          <span className="count">{visibleApps.length} resultat{visibleApps.length > 1 ? 's' : ''}</span>
        </div>
        {visibleApps.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid">
            {visibleApps.map((app) => (
              <AppCard key={app.id} app={app} onOpen={openApp} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function Updates({ openApp }) {
  const { updates } = useStore();
  return (
    <div className="section">
      <div className="section__head">
        <IconUpdate size={17} />
        <h2>Mises a jour disponibles</h2>
        <span className="count">{updates.length}</span>
      </div>
      {updates.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">
            <IconUpdate size={26} />
          </div>
          <h3>Tout est a jour</h3>
          <p>
            Celsius compare la derniere release GitHub de chaque app avec la version installee
            chez toi. Rien a installer pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid grid--wide">
          {updates.map((app) => (
            <AppCard key={app.id} app={app} onOpen={openApp} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Library({ openApp }) {
  const { library, dispatch } = useStore();
  return (
    <div className="section">
      <div className="section__head">
        <h2>Mes applications</h2>
        <span className="count">{library.length}</span>
      </div>
      {library.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">
            <IconBox size={26} />
          </div>
          <h3>Bibliotheque vide</h3>
          <p>Les applications que tu installes depuis Celsius apparaissent ici, avec leur version.</p>
          <button className="btn btn--primary" onClick={() => dispatch({ type: 'view', view: 'explore' })}>
            Parcourir le catalogue
          </button>
        </div>
      ) : (
        <div className="grid">
          {library.map((app) => (
            <AppCard key={app.id} app={app} onOpen={openApp} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyCatalog() {
  return (
    <div className="empty">
      <div className="empty__icon">
        <IconBox size={26} />
      </div>
      <h3>Aucune application</h3>
      <p>
        Le catalogue est defini dans <span className="kbd">public/apps.json</span> du depot. Ajoute
        une entree, puis utilise « Recharger » dans les reglages.
      </p>
    </div>
  );
}
