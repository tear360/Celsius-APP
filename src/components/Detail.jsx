import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { preferredPlatform } from '../lib/platform-target.js';
import { AppIcon } from './AppIcon.jsx';
import { formatBytes, formatCount, formatDate, stripHtml } from '../lib/format.js';
import {
  IconAndroid,
  IconBack,
  IconDownload,
  IconExternal,
  IconPlay,
  IconStar,
  IconTrash,
  IconWrench,
  IconWindows,
} from './Icons.jsx';

const PLATFORMS = [
  { key: 'windows', label: 'Windows', Icon: IconWindows },
  { key: 'android', label: 'Android', Icon: IconAndroid },
];

export function Detail({ app, currentPlatform }) {
  const { state, dispatch, doInstall, launchApp, uninstallApp, repairApp, openExternal } = useStore();
  const [expanded, setExpanded] = useState(false);

  if (!app) return null;

  const target = preferredPlatform(app, currentPlatform);
  const entry = app.platforms[target] || {};
  const installed = entry.installed;
  const repairing = Boolean(state.busy[`repair:${app.id}`]);
  const task = Object.values(state.tasks).find((t) => t.appId === app.id && t.platform === target);
  const long = (app.description || '').length > 240;

  const platformRow = PLATFORMS.map(({ key, label, Icon }) => {
    const e = app.platforms[key];
    if (!e) return null;
    return (
      <div className="assetrow" key={key}>
        <Icon size={17} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {e.installed
              ? `Installe v${e.installed.version ?? '?'}${
                  e.status === 'outdated' ? ` — MAJ v${app.version} disponible` : ''
                }`
              : e.asset
                ? `Disponible v${app.version} — ${formatBytes(e.asset.size)}`
                : 'Aucun binaire dans cette release'}
          </div>
        </div>
        {e.installed && (
          <span className={`badge ${e.status === 'outdated' ? 'badge--update' : ''}`}>
            {e.status === 'outdated' ? 'MAJ' : 'OK'}
          </span>
        )}
        {e.asset ? (
          <button
            className="btn btn--sm btn--primary"
            onClick={() => doInstall(app, key)}
            disabled={e.status === 'up-to-date'}
          >
            {e.status === 'outdated' ? 'MAJ' : e.installed ? 'Reinstaller' : 'Installer'}
          </button>
        ) : (
          <span className="badge badge--danger">indisponible</span>
        )}
      </div>
    );
  });

  return (
    <>
      <div className="detailhead">
        <div className="detailhead__top">
          <button
            className="iconbtn"
            onClick={() => dispatch({ type: 'view', view: 'explore' })}
            title="Retour"
            aria-label="Retour"
          >
            <IconBack size={20} />
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            {app.publishedAt ? `Mise a jour ${formatDate(app.publishedAt)}` : 'Catalogue'}
          </span>
        </div>

        <div className="detailhead__row">
          <AppIcon app={app} size="xl" />
          <div className="detailhead__body">
            <h1 className="detailhead__title">
              {app.name}
              {app.prerelease && <span className="badge badge--pre">pre-release</span>}
            </h1>
            <p className="detailhead__tagline">{app.tagline || 'Aucune description fournie.'}</p>
            <div className="detailhead__meta">
              {app.version && <span>v{app.version}</span>}
              {app.sizeLabel && (
                <>
                  <i className="sep" />
                  <span>{app.sizeLabel}</span>
                </>
              )}
              {app.downloads > 0 && (
                <>
                  <i className="sep" />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconStar size={11} /> {formatCount(app.downloads)}
                  </span>
                </>
              )}
              <i className="sep" />
              <span>
                {entry.available ? 'Disponible' : 'Aucun binaire'} sur{' '}
                {target === 'android' ? 'Android' : 'Windows'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <PrimaryAction
                app={app}
                entry={entry}
                target={target}
                onInstall={doInstall}
                onLaunch={launchApp}
              />
              {app.changelog && (
                <button
                  className="installbtn installbtn--ghost"
                  onClick={() => openExternal(app.releaseUrl || `https://github.com/${app.repo}/releases`)}
                  title="Voir les releases sur GitHub"
                >
                  <IconExternal size={16} /> Releases
                </button>
              )}
              {installed && target === 'windows' && (
                <button
                  className="installbtn installbtn--ghost"
                  onClick={() => repairApp(app, target)}
                  disabled={repairing}
                >
                  {repairing ? <span className="spinner" /> : <IconWrench size={16} />} Reparer
                </button>
              )}
              {installed && (
                <button
                  className="installbtn installbtn--danger"
                  onClick={() => uninstallApp(app, target)}
                >
                  <IconTrash size={16} /> Desinstaller
                </button>
              )}
            </div>

            {task && (
              <div className="installprogress">
                <div className="progressinline">
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${task.percent || 8}%` }} />
                  </div>
                  <span className="progressinline__text">
                    {task.received ? formatBytes(task.received) : '0 o'} /{' '}
                    {task.total ? formatBytes(task.total) : '?'} — {Math.round(task.percent || 0)} %
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rings" style={{ padding: '0 22px' }}>
        <div className="ring">
          <div className="ring__disc">
            {app.downloads > 0 ? formatCount(app.downloads) : '0'}
            <small>telech.</small>
          </div>
          <div className="ring__label">Telechargements</div>
        </div>
        <div className="ring">
          <div className="ring__disc">
            {app.version ? `v${app.version}` : '—'}
          </div>
          <div className="ring__label">Version</div>
        </div>
        <div className="ring">
          <div className="ring__disc">{app.sizeLabel || '—'}</div>
          <div className="ring__label">Taille du telechargement</div>
        </div>
        <div className="ring">
          <div className="ring__disc ring__disc--icon">
            {target === 'android' ? <IconAndroid size={24} /> : <IconWindows size={24} />}
          </div>
          <div className="ring__label">Plateforme</div>
        </div>
      </div>

      {app.description && (
        <div className="about">
          <div className={`about__text ${long && !expanded ? 'about__text--clamped' : ''}`}>
            {app.description}
          </div>
          {long && (
            <button className="about__more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Lire moins' : 'Lire la suite'}
            </button>
          )}
        </div>
      )}

      <div className="about" style={{ paddingTop: 0 }}>
        <div className="panel">
          <h3>Plateformes</h3>
          {platformRow}
        </div>
      </div>

      {app.changelog && (
        <div className="about" style={{ paddingTop: 0 }}>
          <div className="panel">
            <h3>Dernieres modifications — v{app.version}</h3>
            <div className="about__text">{stripHtml(app.changelog)}</div>
          </div>
        </div>
      )}
    </>
  );
}

function PrimaryAction({ entry, target, onInstall, onLaunch, app }) {
  if (!entry.available) {
    return (
      <button className="installbtn" disabled>
        Aucun binaire
      </button>
    );
  }
  if (entry.installed) {
    return (
      <>
        <button className="installbtn installbtn--ok" onClick={() => onLaunch(app, target)}>
          <IconPlay size={17} /> Ouvrir
        </button>
        {entry.status === 'outdated' && (
          <button className="installbtn" onClick={() => onInstall(app, target)}>
            <IconDownload size={17} /> Mettre a jour vers v{app.version}
          </button>
        )}
      </>
    );
  }
  return (
    <button className="installbtn" onClick={() => onInstall(app, target)}>
      <IconDownload size={17} /> Installer
    </button>
  );
}
