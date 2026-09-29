import { useStore } from '../state/store.jsx';
import { AppCard } from './AppCard.jsx';
import { IconBox, IconSearch, IconUpdate } from './Icons.jsx';

export function Home({ openApp, currentPlatform }) {
  const { state, dispatch, refresh, visibleApps } = useStore();
  const loading = state.status === 'loading' && state.apps.length === 0;

  return (
    <>
      {state.apps.length > 0 && (
        <div className="section">
          <div className="section__head">
            <h2>Mises a jour</h2>
            <span className="count">{countUpdates(state.apps)}</span>
            <button
              className="section__action"
              onClick={() => dispatch({ type: 'view', view: 'updates' })}
            >
              Tout voir
            </button>
          </div>
          <UpdatesRow openApp={openApp} currentPlatform={currentPlatform} />
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
              <AppCard key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function countUpdates(apps) {
  return apps.filter((a) => a.needsUpdate).length;
}

function UpdatesRow({ openApp, currentPlatform }) {
  const { state } = useStore();
  const updates = state.apps.filter((a) => a.needsUpdate);
  if (!updates.length) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderRadius: 'var(--radius)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          fontSize: 13,
        }}
      >
        <IconUpdate size={17} />
        Tout est a jour.
      </div>
    );
  }
  return (
    <div className="grid">
      {updates.map((app) => (
        <AppCard key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
      ))}
    </div>
  );
}

export function Explore({ mobile, openApp, currentPlatform }) {
  const { state, dispatch, visibleApps } = useStore();
  return (
    <>
      {mobile && (
        <div className="search" style={{ margin: '0 16px 14px' }}>
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
      )}

      <div className="section">
        <div className="section__head">
          <h2>Catalogue</h2>
          <span className="count">
            {visibleApps.length} resultat{visibleApps.length > 1 ? 's' : ''}
          </span>
        </div>
        {visibleApps.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid">
            {visibleApps.map((app) => (
              <AppCard key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function Updates({ openApp, currentPlatform }) {
  const { state } = useStore();
  const updates = state.apps.filter((a) => a.needsUpdate);
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
            <AppCard key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Library({ openApp, currentPlatform }) {
  const { library, dispatch, detectInstalled, state } = useStore();
  return (
    <div className="section">
      <div className="section__head">
        <h2>Mes applications</h2>
        <span className="count">{library.length}</span>
        <button
          className="section__action"
          onClick={() => dispatch({ type: 'view', view: 'settings' })}
        >
          Gerer la bibliotheque
        </button>
      </div>
      {library.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">
            <IconBox size={26} />
          </div>
          <h3>Bibliotheque vide</h3>
          <p>
            Les applications que tu installes depuis Celsius apparaissent ici. Si tu penses en avoir
            deja installe certaines, rescanne le disque.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn--ghost"
              onClick={detectInstalled}
              disabled={Boolean(state.busy.detect)}
            >
              {state.busy.detect ? <span className="spinner" /> : null}
              Rechercher les apps installees
            </button>
            <button
              className="btn btn--primary"
              onClick={() => dispatch({ type: 'view', view: 'explore' })}
            >
              Parcourir le catalogue
            </button>
          </div>
        </div>
      ) : (
        <div className="grid">
          {library.map((app) => (
            <AppCard key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
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
        une entree, puis utilise « Recharger le catalogue » dans les reglages.
      </p>
    </div>
  );
}
