import React from 'react';
import { CelsiusMark, IconGrid, IconHome, IconLibrary, IconSearch, IconSettings, IconUpdate } from './Icons.jsx';
import { CONFIG } from '../config.js';

export function TitleBar({ version, updateAvailable }) {
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
