import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { preferredPlatform } from '../lib/platform-target.js';
import { AppIcon } from './AppIcon.jsx';
import { formatCount } from '../lib/format.js';
import { IconDots, IconDownload, IconPlay, IconStar } from './Icons.jsx';

/**
 * Tuile style Play Store : grande icone, nom sur deux lignes, pastille ⋮,
 * ligne de meta (version / telechargements) et bouton d'action.
 */
export function Tile({ app, onOpen, currentPlatform }) {
  const { doInstall, launchApp } = useStore();
  const target = preferredPlatform(app, currentPlatform);
  const entry = app.platforms[target] || {};
  const installed = entry.installed;
  const outdated = entry.status === 'outdated';
  const [menu, setMenu] = useState(false);

  const label = !entry.available
    ? 'Indisponible'
    : outdated
      ? 'MAJ'
      : installed
        ? 'Ouvrir'
        : 'Installer';

  return (
    <div className="tile" onClick={() => onOpen(app.id)}>
      <div className="tile__top">
        <AppIcon app={app} size="lg" />
        <button
          className="tile__menu"
          title="Details"
          onClick={(e) => {
            e.stopPropagation();
            setMenu((v) => !v);
          }}
        >
          <IconDots size={15} />
        </button>
      </div>

      <div className="tile__name">{app.name}</div>

      <div className="tile__meta">
        {app.version && <span>v{app.version}</span>}
        {app.downloads > 0 && (
          <>
            <i className="sep" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconStar size={10} /> {formatCount(app.downloads)}
            </span>
          </>
        )}
        {outdated && (
          <>
            <i className="sep" />
            <span style={{ color: 'var(--ok)', fontWeight: 700 }}>MAJ</span>
          </>
        )}
      </div>

      <button
        className={`tile__action ${outdated || !installed ? 'tile__action--primary' : 'tile__action--ok'}`}
        disabled={!entry.available || entry.status === 'up-to-date'}
        title={menu ? app.tagline : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (installed && !outdated) launchApp(app, target);
          else doInstall(app, target);
        }}
      >
        {installed && !outdated ? <IconPlay size={12} /> : <IconDownload size={12} />} {label}
      </button>
    </div>
  );
}

/** Carte "classique" pour les grilles denses. */
export function Card({ app, onOpen, currentPlatform }) {
  const { doInstall, launchApp } = useStore();
  const target = preferredPlatform(app, currentPlatform);
  const entry = app.platforms[target] || {};
  const installed = entry.installed;
  const outdated = entry.status === 'outdated';

  return (
    <div className="card" onClick={() => onOpen(app.id)}>
      <div className="card__top">
        <AppIcon app={app} size="md" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card__title">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {app.name}
            </span>
            {outdated && <span className="badge badge--update">MAJ</span>}
          </div>
          <div className="card__desc">{app.tagline || 'Aucune description'}</div>
        </div>
      </div>
      <div className="card__foot">
        <div className="card__meta">
          {app.version && <span>v{app.version}</span>}
          {app.sizeLabel && (
            <>
              <i className="sep" />
              <span>{app.sizeLabel}</span>
            </>
          )}
        </div>
        <div className="card__actions" onClick={(e) => e.stopPropagation()}>
          {entry.available && (
            <button
              className={`btn btn--sm ${outdated || !installed ? 'btn--primary' : 'btn--ok'}`}
              disabled={entry.status === 'up-to-date'}
              onClick={() => (installed && !outdated ? launchApp(app, target) : doInstall(app, target))}
            >
              {installed && !outdated ? 'Lancer' : outdated ? 'MAJ' : 'Installer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickRow({ items }) {
  return (
    <div className="quickrow">
      {items.map((q) => (
        <button key={q.key} className="quick" onClick={q.onClick}>
          <span className={`quick__ring ${q.plain ? 'quick__ring--plain' : ''}`}>
            <q.Icon size={20} />
          </span>
          {q.label}
        </button>
      ))}
    </div>
  );
}

export function SectionCard({ title, subtitle, more, onMore, children }) {
  return (
    <div className="sectioncard">
      <div className="sectioncard__head">
        <div>
          <h3 className="sectioncard__title">{title}</h3>
          {subtitle && <div className="sectioncard__sub">{subtitle}</div>}
        </div>
        {more && (
          <button className="sectioncard__more" onClick={onMore}>
            {more}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function Carousel({ slides, pager }) {
  const [page, setPage] = useState(0);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    setPage(Math.min(slides.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  };

  if (!slides.length) return null;

  return (
    <div className="carousel">
      <div className="carousel__track" onScroll={onScroll}>
        {slides.map((s, i) => (
          <div className="slide" key={s.app.id + i}>
            <AppIcon app={s.app} size="xl" />
            <div className="slide__body">
              <div className="slide__kicker">{s.kicker}</div>
              <h2 className="slide__title">{s.app.name}</h2>
              <p className="slide__text">{s.app.tagline || s.app.repo}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn--primary" onClick={s.onPrimary}>
                  {s.primaryLabel}
                </button>
                {s.secondary && (
                  <button className="btn btn--ghost" onClick={s.secondary.onClick}>
                    {s.secondary.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="carousel__pager">
          {page + 1}/{slides.length}
        </div>
      )}
      {slides.length > 1 && (
        <div className="carousel__dots">
          {slides.map((s, i) => (
            <span key={s.app.id + i} className={`carousel__dot ${i === page ? 'carousel__dot--on' : ''}`} />
          ))}
        </div>
      )}
      {pager}
    </div>
  );
}
