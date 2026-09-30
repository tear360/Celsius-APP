import { useEffect } from 'react';
import { StoreProvider, useStore } from './state/store.jsx';
import { AppBar, CaptionButtons, Footer, TabBar } from './components/Shell.jsx';
import { Explore, Home, Library, Updates } from './components/Views.jsx';
import { Settings } from './components/Panels.jsx';
import { Detail } from './components/Detail.jsx';
import { DownloadDock, Toast } from './components/Dock.jsx';
import { ModalHost } from './components/Modal.jsx';
import { Splash } from './components/Splash.jsx';
import { isAndroidPlatform, isDesktop } from './platform/index.js';

function Shell() {
  const { state, dispatch, refresh, checkSelf, selected } = useStore();
  const mobile = !isDesktop;
  const currentPlatform = isAndroidPlatform ? 'android' : 'windows';
  const view = state.view;

  const openApp = (id) => {
    if (state.apps.some((a) => a.id === id)) dispatch({ type: 'select', id });
  };
  const navigate = (v) => dispatch({ type: 'view', view: v });

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

  const updateCount = state.apps.filter((a) => a.needsUpdate).length;

  let content = null;
  if (view === 'home') {
    content = <Home openApp={openApp} currentPlatform={currentPlatform} onNavigate={navigate} />;
  } else if (view === 'explore') {
    content = <Explore mobile={mobile} openApp={openApp} currentPlatform={currentPlatform} />;
  } else if (view === 'updates') {
    content = <Updates openApp={openApp} currentPlatform={currentPlatform} />;
  } else if (view === 'library') {
    content = (
      <Library openApp={openApp} currentPlatform={currentPlatform} onNavigate={navigate} />
    );
  } else if (view === 'settings') {
    content = <Settings />;
  } else if (view === 'detail') {
    content = selected ? (
      <Detail app={selected} mobile={mobile} currentPlatform={currentPlatform} />
    ) : null;
  }

  const showChrome = view !== 'detail';

  return (
    <div className="shell">
      <Splash />

      <AppBar
        version={state.appInfo?.version || '—'}
        updateAvailable={state.selfUpdate?.available}
        search={state.search}
        onSearch={(value) => dispatch({ type: 'search', value })}
        onRefresh={() => refresh()}
      >
        {!mobile && state.selfUpdate?.available && (
          <button className="btn btn--sm" onClick={() => checkSelf()}>
            Mise a jour disponible
          </button>
        )}
        {!mobile && <CaptionButtons />}
      </AppBar>

      {showChrome && (
        <TabBar
          view={view}
          onNavigate={navigate}
          updateCount={updateCount}
          mobile={mobile}
        />
      )}

      <div className={mobile ? 'mobile-body' : 'scroll'}>
        {content}
        {!mobile && showChrome && (
          <Footer version={state.appInfo?.version || '—'} status={state.status} />
        )}
      </div>

      <DownloadDock mobile={mobile} />
      <Toast />
      <ModalHost />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
