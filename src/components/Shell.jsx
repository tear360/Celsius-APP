import { useEffect, useState } from 'react';
import { CelsiusMark, IconRefresh, IconSearch } from './Icons.jsx';
import { CONFIG } from '../config.js';
import { windowAction, windowState, onWindowState } from '../platform/index.js';

const TABS = [
  { key: 'home', label: 'Accueil' },
  { key: 'explore', label: 'Explorer' },
  { key: 'updates', label: 'Mises a jour' },
  { key: 'library', label: 'Bibliotheque' },
  { key: 'settings', label: 'Reglages' },
];

export function CaptionButtons() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    windowState()
      .then((s) => setMaximized(Boolean(s?.maximized)))
      .catch(() => {});
    return onWindowState((s) => setMaximized(Boolean(s?.maximized)));
  }, []);

  return (
    <div className="caption">
      <button
        className="caption__btn"
        onClick={() => windowAction('minimize')}
        title="Reduire"
        aria-label="Reduire"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        className="caption__btn"
        onClick={() => windowAction('maximize')}
        title={maximized ? 'Restaurer' : 'Agrandir'}
        aria-label={maximized ? 'Restaurer' : 'Agrandir'}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.5 2.5h5v5h-5z M0.5 0.5h5v5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        className="caption__btn caption__btn--close"
        onClick={() => windowAction('close')}
        title="Fermer"
        aria-label="Fermer"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}

export function AppBar({ version, updateAvailable, search, onSearch, onRefresh, children }) {
  return (
    <div className="appbar">
      <div className="appbar__logo">
        <span className="appbar__logo-mark">
          <CelsiusMark size={18} />
        </span>
        <span>Celsius</span>
      </div>

      <div className="search">
        <IconSearch size={16} />
        <input
          value={search}
          placeholder="Rechercher une application..."
          onChange={(e) => onSearch(e.target.value)}
          spellCheck={false}
        />
        {search && (
          <button className="search__clear" onClick={() => onSearch('')} title="Effacer">
            x
          </button>
        )}
      </div>

      <div className="appbar__spacer" />
      {updateAvailable && <span className="badge badge--update">MAJ dispo</span>}
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>v{version}</span>
      <button className="iconbtn" onClick={onRefresh} title="Actualiser le catalogue">
        <IconRefresh size={17} />
      </button>
      {children}
    </div>
  );
}

export function TabBar({ view, onNavigate, updateCount, mobile }) {
  return (
    <nav className="tabs" style={mobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`tab ${view === t.key ? 'tab--active' : ''}`}
          onClick={() => onNavigate(t.key)}
        >
          {t.label}
          {t.key === 'updates' && updateCount > 0 && (
            <span className="tab__badge">{updateCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function Footer({ version, status }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 24px 16px',
        color: 'var(--muted)',
        fontSize: 11.5,
      }}
    >
      <span className={`dot ${status === 'loading' ? 'dot--busy' : ''}`} />
      {status === 'loading' ? 'Synchronisation…' : 'Connecte a GitHub'}
      <span style={{ marginLeft: 'auto', opacity: 0.75 }}>
        {CONFIG.vendor} · v{version}
      </span>
    </div>
  );
}
