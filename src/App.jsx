import { useEffect } from 'react';
import { StoreProvider, useStore } from './state/store.jsx';
import { TitleBar, Sidebar, BottomNav, TopBar } from './components/Shell.jsx';
import { Home, Explore, Updates, Library } from './components/Views.jsx';
import { Settings } from './components/Panels.jsx';
import { Detail } from './components/Detail.jsx';
import { DownloadDock, Toast } from './components/Dock.jsx';
import { ModalHost } from './components/Modal.jsx';
import { Splash } from './components/Splash.jsx';
import { IconBack, IconRefresh } from './components/Icons.jsx';
import { isDesktop } from './platform/index.js';

const TITLES = {
  home: ['Celsius', 'Le store des apps de TEAR36'],
  explore: ['Explorer', 'Tout le catalogue, filtre par categorie'],
  updates: ['Mises a jour', 'Ce qui a change depuis ta version installee'],
  library: ['Bibliotheque', 'Tes applications installees'],
  settings: ['Reglages', 'Catalogue, mise a jour, a propos'],
  detail: ['Fiche application', ''],
};

function Shell() {
  const { state, dispatch, refresh, checkSelf, openExternal, selected } = useStore();
  const mobile = !isDesktop;
  const view = state.view;

  const openApp = (id) => {
    if (state.apps.some((a) => a.id === id)) dispatch({ type: 'select', id });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        refresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refresh]);

  const [title, subtitle] = TITLES[view] || TITLES.home;
  const updateAvailable = state.selfUpdate?.available;
  const updateCount = state.apps.filter((a) => a.needsUpdate).length;

  let content = null;
  if (view === 'home') {
    content = <Home mobile={mobile} openApp={openApp} openExternal={openExternal} />;
  } else if (view === 'explore') {
    content = <Explore mobile={mobile} openApp={openApp} />;
  } else if (view === 'updates') {
    content = <Updates openApp={openApp} />;
  } else if (view === 'library') {
    content = <Library openApp={openApp} />;
  } else if (view === 'settings') {
    content = <Settings mobile={mobile} />;
  } else if (view === 'detail') {
    content = selected ? <Detail app={selected} mobile={mobile} /> : null;
  }

  return (
    <div className="shell">
      {!mobile && (
        <TitleBar version={state.appInfo?.version || '—'} updateAvailable={updateAvailable} />
      )}
      <div className="body">
        {!mobile && (
          <Sidebar
            view={view}
            onNavigate={(v) => dispatch({ type: 'view', view: v })}
            updateCount={updateCount}
            version={state.appInfo?.version || '—'}
            status={state.status}
          />
        )}
        <main className="main">
          {mobile ? (
            <>
              <div className="mobile-head">
                {view === 'detail' ? (
                  <button
                    className="iconbtn"
                    onClick={() => dispatch({ type: 'view', view: 'explore' })}
                  >
                    <IconBack size={20} />
                  </button>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1>{view === 'detail' && selected ? selected.name : title}</h1>
                  {view !== 'detail' && subtitle ? (
                    <div className="topbar__sub">{subtitle}</div>
                  ) : null}
                </div>
                <button className="iconbtn" onClick={() => refresh()} title="Actualiser">
                  <IconRefresh size={19} />
                </button>
              </div>
              <div className="mobile-body">{content}</div>
            </>
          ) : (
            <>
              <TopBar
                title={view === 'detail' && selected ? selected.name : title}
                subtitle={view === 'detail' ? selected?.repo : subtitle}
                showSearch={view === 'explore' || view === 'home'}
                search={state.search}
                onSearch={(value) => dispatch({ type: 'search', value })}
                action={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {updateAvailable && (
                      <button className="btn btn--sm" onClick={() => checkSelf()}>
                        Mise a jour disponible
                      </button>
                    )}
                    <button
                      className="iconbtn"
                      onClick={() => refresh()}
                      title="Actualiser le catalogue"
                    >
                      <IconRefresh size={17} />
                    </button>
                  </div>
                }
              />
              <div className="scroll">{content}</div>
            </>
          )}
        </main>
      </div>
      {mobile && (
        <BottomNav
          view={view}
          onNavigate={(v) => dispatch({ type: 'view', view: v })}
          updateCount={updateCount}
        />
      )}
      <DownloadDock mobile={mobile} />
      <Toast />
      <ModalHost />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Splash />
      <Shell />
    </StoreProvider>
  );
}
