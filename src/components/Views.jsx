import { useStore } from '../state/store.jsx';
import { Carousel, Card, QuickRow, SectionCard, Tile } from './Store.jsx';
import {
  IconAndroid,
  IconBox,
  IconDownload,
  IconGrid,
  IconLibrary,
  IconRefresh,
  IconSettings,
  IconStar,
  IconUpdate,
  IconWindows,
} from './Icons.jsx';

export function Home({ openApp, currentPlatform, onNavigate }) {
  const { state, refresh, visibleApps, doInstall, launchApp } = useStore();
  const loading = state.status === 'loading' && state.apps.length === 0;
  const updates = state.apps.filter((a) => a.needsUpdate);
  const library = state.apps.filter((a) =>
    ['windows', 'android'].some((p) => a.platforms[p]?.installed),
  );

  const slides = state.apps.slice(0, 4).map((app) => {
    const target = app.platforms[currentPlatform]?.available ? currentPlatform : 'windows';
    const entry = app.platforms[target] || {};
    const installed = entry.installed;
    return {
      app,
      kicker: entry.status === 'outdated' ? 'Mise a jour disponible' : entry.installed ? 'Deja installee' : 'Disponible',
      primaryLabel: entry.status === 'outdated' ? 'Mettre a jour' : installed ? 'Ouvrir' : 'Installer',
      onPrimary: () => {
        if (installed && entry.status !== 'outdated') launchApp(app, target);
        else doInstall(app, target);
      },
      secondary: { label: 'Voir la fiche', onClick: () => openApp(app.id) },
    };
  });

  return (
    <>
      <QuickRow
        items={[
          {
            key: 'updates',
            label: 'Mises a jour',
            Icon: IconUpdate,
            onClick: () => onNavigate('updates'),
          },
          {
            key: 'library',
            label: 'Ma bibliotheque',
            Icon: IconLibrary,
            onClick: () => onNavigate('library'),
          },
          { key: 'explore', label: 'Explorer', Icon: IconGrid, onClick: () => onNavigate('explore'), plain: true },
          {
            key: 'refresh',
            label: 'Actualiser',
            Icon: IconRefresh,
            onClick: () => refresh(),
            plain: true,
          },
          {
            key: 'settings',
            label: 'Reglages',
            Icon: IconSettings,
            onClick: () => onNavigate('settings'),
            plain: true,
          },
        ]}
      />

      <Carousel slides={slides} />

      <div className="sections">
        {updates.length > 0 && (
          <SectionCard
            title="Mises a jour"
            subtitle={`${updates.length} application(s) peuvent etre mise(s) a jour`}
            more="Tout voir"
            onMore={() => onNavigate('updates')}
          >
            <div className="rail">
              {updates.map((app) => (
                <Tile key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
              ))}
            </div>
          </SectionCard>
        )}

        {library.length > 0 && (
          <SectionCard
            title="Mes applications"
            subtitle="Ce que tu as installe sur cet appareil"
            more="Bibliotheque"
            onMore={() => onNavigate('library')}
          >
            <div className="rail">
              {library.map((app) => (
                <Tile key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title={loading ? 'Chargement…' : 'Toutes les applications'}
          subtitle={loading ? 'Lecture du catalogue GitHub' : `${state.apps.length} reference(s) au catalogue`}
        >
          {loading ? (
            <div className="rail">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="skeleton" key={i} style={{ flex: '0 0 138px', height: 176 }} />
              ))}
            </div>
          ) : visibleApps.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <div className="rail">
              {visibleApps.map((app) => (
                <Tile key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
              ))}
            </div>
          )}
        </SectionCard>

        {visibleApps.length > 0 && (
          <div className="grid">
            {visibleApps.map((app) => (
              <Card key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function Explore({ mobile, openApp, currentPlatform }) {
  const { state, dispatch, visibleApps } = useStore();
  return (
    <>
      {mobile && (
        <div className="search" style={{ margin: '0 16px 12px' }}>
          <input
            value={state.search}
            placeholder="Rechercher une application..."
            onChange={(e) => dispatch({ type: 'search', value: e.target.value })}
          />
        </div>
      )}
      <div className="sections" style={{ paddingTop: 18 }}>
        <SectionCard
          title="Catalogue"
          subtitle={`${visibleApps.length} resultat${visibleApps.length > 1 ? 's' : ''}`}
        >
          {visibleApps.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <div className="grid" style={{ padding: '0 8px 12px' }}>
              {visibleApps.map((app) => (
                <Card key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

export function Updates({ openApp, currentPlatform }) {
  const { state } = useStore();
  const updates = state.apps.filter((a) => a.needsUpdate);
  return (
    <div className="sections" style={{ paddingTop: 18 }}>
      <SectionCard
        title="Mises a jour disponibles"
        subtitle={
          updates.length
            ? `${updates.length} application(s) en attente`
            : 'Rien a installer pour le moment'
        }
      >
        {updates.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <IconUpdate size={26} />
            </div>
            <h3>Tout est a jour</h3>
            <p>
              Celsius compare la derniere release GitHub de chaque app avec la version installee
              chez toi.
            </p>
          </div>
        ) : (
          <div className="grid" style={{ padding: '0 8px 12px' }}>
            {updates.map((app) => (
              <Card key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function Library({ openApp, currentPlatform, onNavigate }) {
  const { library, detectInstalled, state } = useStore();
  return (
    <div className="sections" style={{ paddingTop: 18 }}>
      <SectionCard
        title="Mes applications"
        subtitle={`${library.length} application(s) sur cet appareil`}
        more="Reglages"
        onMore={() => onNavigate('settings')}
      >
        {library.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <IconBox size={26} />
            </div>
            <h3>Bibliotheque vide</h3>
            <p>
              Les applications installees depuis Celsius apparaissent ici. Si tu penses en avoir deja
              installe certaines, rescanne le disque.
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
              <button className="btn btn--primary" onClick={() => onNavigate('explore')}>
                Parcourir le catalogue
              </button>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ padding: '0 8px 12px' }}>
            {library.map((app) => (
              <Card key={app.id} app={app} onOpen={openApp} currentPlatform={currentPlatform} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function EmptyCatalog() {
  const { dispatch } = useStore();
  return (
    <div className="empty">
      <div className="empty__icon">
        <IconBox size={26} />
      </div>
      <h3>Aucune application</h3>
      <p>
        Le catalogue est defini dans <span className="kbd">public/apps.json</span> du depot. Ajoute une
        entree, puis utilise « Recharger le catalogue » dans les reglages.
      </p>
      <button className="btn btn--primary" onClick={() => dispatch({ type: 'view', view: 'settings' })}>
        <IconDownload size={15} /> Recharger le catalogue
      </button>
    </div>
  );
}

export { IconAndroid, IconStar, IconWindows };
