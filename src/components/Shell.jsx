import { useEffect, useState } from 'react';
import { CelsiusMark, IconGrid, IconHome, IconLibrary, IconSearch, IconSettings, IconUpdate } from './Icons.jsx';
import { CONFIG } from '../config.js';
import { windowAction, windowState, onWindowState } from '../platform/index.js';

export function TitleBar({ version, updateAvailable }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    windowState().then((s) => setMaximized(Boolean(s?.maximized))).catch(() => {});
    return onWindowState((s) => setMaximized(Boolean(s?.maximized)));
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <CelsiusMark size={16} />
        </span>
        Celsius
      </div>
      <div className="titlebar__spacer" />
      <div className="titlebar__meta">
        {updateAvailable && <span className="badge badge--update">MAJ dispo</span>}
        <span>v{version}</span>
      </div>
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
              <path
                d="M2.5 2.5h5v5h-5z M0.5 0.5h5v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
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
    </div>
  );
}

const NAV = [
  { key: 'home', label: 'Accueil', Icon: IconHome },
  { key: 'explore', label: 'Explorer', Icon: IconGrid },
  { key: 'updates', label: 'Mises a jour', Icon: IconUpdate },
  { key: 'library', label: 'Bibliotheque', Icon: IconLibrary },
  { key: 'settings', label: 'Reglages', Icon: IconSettings },
];

const MOBILE_NAV = [
  { key: 'home', label: 'Accueil', Icon: IconHome },
  { key: 'explore', label: 'Explorer', Icon: IconGrid },
  { key: 'updates', label: 'Mises a jour', Icon: IconUpdate },
  { key: 'library', label: 'Biblio', Icon: IconLibrary },
  { key: 'settings', label: 'Reglages', Icon: IconSettings },
];

export function Sidebar({ view, onNavigate, updateCount, version, status }) {
  return (
    <nav className="sidebar">
      <div className="sidebar__label">Store</div>
      {NAV.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`navitem ${view === key ? 'navitem--active' : ''}`}
          onClick={() => onNavigate(key)}
        >
          <Icon size={17} />
          {label}
          {key === 'updates' && updateCount > 0 && (
            <span className="navitem__badge">{updateCount}</span>
          )}
        </button>
      ))}

      <div className="sidebar__footer">
        <div className="sidebar__version">
          <span className={`dot ${status === 'loading' ? 'dot--busy' : ''}`} />
          {status === 'loading' ? 'Synchronisation…' : 'Connecte a GitHub'}
        </div>
        <div className="sidebar__version" style={{ opacity: 0.75 }}>
          {CONFIG.vendor} · v{version}
        </div>
      </div>
    </nav>
  );
}

export function BottomNav({ view, onNavigate, updateCount }) {
  return (
    <nav className="bottomnav">
      {MOBILE_NAV.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={`bottomnav__item ${view === key ? 'bottomnav__item--active' : ''}`}
          onClick={() => onNavigate(key)}
        >
          <Icon size={21} />
          <span>{label}</span>
          {key === 'updates' && updateCount > 0 && <span className="bottomnav__dot">{updateCount}</span>}
        </button>
      ))}
    </nav>
  );
}

export function TopBar({ title, subtitle, showSearch, search, onSearch, action }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="topbar__sub">{subtitle}</div>}
      </div>
      {showSearch && (
        <div className="search" style={{ marginLeft: 'auto' }}>
          <IconSearch size={16} />
          <input
            value={search}
            placeholder="Rechercher..."
            onChange={(e) => onSearch(e.target.value)}
            spellCheck={false}
          />
          {search && (
            <button className="search__clear" onClick={() => onSearch('')}>
              x
            </button>
          )}
        </div>
      )}
      {action}
    </div>
  );
}
