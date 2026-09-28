import { useStore } from '../state/store.jsx';
import { AppIcon } from './AppIcon.jsx';
import { IconDownload, IconPlay, IconStar } from './Icons.jsx';
import { formatCount } from '../lib/format.js';

function platformLabel(app) {
  if (app.platforms.windows?.installed && app.platforms.android?.installed) return null;
  if (app.platforms.windows?.installed) return 'Windows';
  if (app.platforms.android?.installed) return 'Android';
  return null;
}

export function AppCard({ app, onOpen }) {
  const { doInstall, launchApp } = useStore();
  const target = app.platforms.android?.available ? 'android' : 'windows';
  const entry = app.platforms[target] || {};
  const installed = entry.installed;
  const outdated = entry.status === 'outdated';
  const running = Boolean(app.needsUpdate);
  const canInstall = entry.available;

  return (
    <div className="card" onClick={() => onOpen(app.id)}>
      <div className="card__top">
        <AppIcon app={app} size="md" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card__title">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {app.name}
            </span>
            {app.custom && <span className="badge">perso</span>}
            {app.prerelease && <span className="badge badge--pre">pre</span>}
            {running && <span className="badge badge--update">MAJ</span>}
          </div>
          <div className="card__desc">{app.tagline || 'Aucune description'}</div>
        </div>
      </div>

      <div className="card__foot">
        <div className="card__meta">
          {app.version && <span>v{app.version}</span>}
          {app.version && <i className="sep" />}
          {platformLabel(app) && <span>{platformLabel(app)}</span>}
          {platformLabel(app) && <i className="sep" />}
          {app.sizeLabel && <span>{app.sizeLabel}</span>}
          {app.downloads > 0 && (
            <>
              <i className="sep" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <IconStar size={11} /> {formatCount(app.downloads)}
              </span>
            </>
          )}
        </div>
        <div className="card__actions" onClick={(e) => e.stopPropagation()}>
          {installed ? (
            <button
              className="btn btn--sm btn--ok"
              onClick={() => launchApp(app, target)}
              title={outdated ? 'Lancer' : 'Lancer l\'application'}
            >
              <IconPlay size={13} /> Lancer
            </button>
          ) : null}
          {canInstall && (
            <button
              className={`btn btn--sm ${outdated ? '' : 'btn--primary'}`}
              onClick={() => doInstall(app, target)}
            >
              {outdated ? (
                'Mettre a jour'
              ) : (
                <>
                  <IconDownload size={13} /> Installer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
