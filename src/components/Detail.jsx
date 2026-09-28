import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { AppIcon } from './AppIcon.jsx';
import {
  IconAndroid,
  IconBack,
  IconChevron,
  IconDownload,
  IconExternal,
  IconGit,
  IconOpen,
  IconPlay,
  IconTrash,
  IconWindows,
} from './Icons.jsx';
import { formatBytes, formatDate, formatRelative, stripHtml } from '../lib/format.js';

const PLATFORMS = [
  { key: 'windows', label: 'Windows', Icon: IconWindows },
  { key: 'android', label: 'Android', Icon: IconAndroid },
];

export function Detail({ app, mobile }) {
  const { state, dispatch, loadHistory, doInstall, launchApp, uninstallApp, openExternal } = useStore();
  const history = state.history[app.id];
  const busy = Boolean(state.busy[`history:${app.id}`]);
  const [openRelease, setOpenRelease] = useState(null);

  useEffect(() => {
    if (app?.id) loadHistory(app.id);
  }, [app?.id, loadHistory]);

  if (!app) return null;

  const pick = () => (app.platforms.windows?.available ? 'windows' : 'android');
  const targetInstalled = Boolean(app.platforms[pick()]?.installed);

  return (
    <div className={`detail ${mobile ? 'detail--mobile' : ''}`}>
      {!mobile && (
        <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: 'view', view: 'explore' })}>
          <IconBack size={15} /> Retour
        </button>
      )}

      <div className="detail__hero">
        <AppIcon app={app} size="xl" />
        <div className="detail__headline">
          <h1 className="detail__name">
            {app.name}
            {app.prerelease && <span className="badge badge--pre">pre-release</span>}
            {app.custom && <span className="badge">ajoute a la main</span>}
          </h1>
          <p className="detail__tagline">{app.tagline || 'Aucune description fournie.'}</p>
          <div className="detail__cta">
            <PrimaryAction app={app} onInstall={doInstall} onLaunch={launchApp} target={pick()} />
            <button
              className="btn btn--ghost"
              onClick={() => openExternal(app.releaseUrl || `https://github.com/${app.repo}/releases`)}
              title="Voir les releases sur GitHub"
            >
              <IconExternal size={15} /> Releases
            </button>
            {targetInstalled && (
              <button className="btn btn--danger" onClick={() => uninstallApp(app, pick())}>
                <IconTrash size={15} /> Desinstaller
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="statgrid">
        <div className="stat">
          <div className="stat__label">Version</div>
          <div className="stat__value">{app.version ? `v${app.version}` : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Categorie</div>
          <div className="stat__value">{app.category}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Taille</div>
          <div className="stat__value">{app.sizeLabel || '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Publie</div>
          <div className="stat__value">{formatRelative(app.publishedAt)}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Depots</div>
          <div className="stat__value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconGit size={14} /> {app.repo}
          </div>
        </div>
      </div>

      {app.description && (
        <div className="panel">
          <h3>A propos</h3>
          <div className="prose selectable">{app.description}</div>
        </div>
      )}

      <div className="panel">
        <h3>Plateformes</h3>
        {PLATFORMS.map(({ key, label, Icon }) => {
          const entry = app.platforms[key];
          if (!entry) return null;
          return (
            <div className="assetrow" key={key}>
              <Icon size={17} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {entry.installed
                    ? `Installe v${entry.installed.version}${
                        entry.status === 'outdated' ? ` — MAJ v${app.version} disponible` : ''
                      }`
                    : entry.asset
                      ? `Disponible v${app.version} — ${formatBytes(entry.asset.size)}`
                      : 'Aucun binaire dans cette release'}
                </div>
              </div>
              {entry.installed && (
                <span className={`badge ${entry.status === 'outdated' ? 'badge--update' : ''}`}>
                  {entry.status === 'outdated' ? 'MAJ' : 'OK'}
                </span>
              )}
              {entry.asset ? (
                <button
                  className="btn btn--sm btn--primary"
                  onClick={() => doInstall(app, key)}
                  disabled={entry.status === 'up-to-date'}
                >
                  {entry.status === 'outdated' ? (
                    'MAJ'
                  ) : entry.installed ? (
                    'Reinstaller'
                  ) : (
                    <>
                      <IconDownload size={13} /> Installer
                    </>
                  )}
                </button>
              ) : (
                <span className="badge badge--danger">indisponible</span>
              )}
            </div>
          );
        })}
      </div>

      {app.changelog && (
        <div className="panel">
          <h3>Dernieres modifications — v{app.version}</h3>
          <div className="prose selectable">{app.changelog}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => openExternal(app.releaseUrl)}
            >
              <IconOpen size={14} /> Ouvrir sur GitHub
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="section__head">
          <h2>Historique des versions</h2>
          {busy && <span className="spinner" />}
        </div>
        {!history && busy && <div className="skeleton" style={{ height: 90 }} />}
        {history?.length === 0 && (
          <div className="panel" style={{ color: 'var(--muted)' }}>
            Aucune release historique trouvee.
          </div>
        )}
        {(history || []).map((rel) => {
          const isOpen = openRelease === rel.id;
          return (
            <div className="release" key={rel.id} style={{ marginBottom: 8 }}>
              <button className="release__head" onClick={() => setOpenRelease(isOpen ? null : rel.id)}>
                <span
                  className="badge"
                  style={{
                    background: 'var(--grad)',
                    color: '#1a0b12',
                    minWidth: 58,
                    justifyContent: 'center',
                  }}
                >
                  v{rel.version}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-dim)' }}>
                  {rel.name && rel.name !== rel.tag ? rel.name : formatDate(rel.publishedAt)}
                </span>
                {rel.prerelease && <span className="badge badge--pre">pre</span>}
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {rel.assets.length} fichier{rel.assets.length > 1 ? 's' : ''}
                </span>
                <IconChevron
                  size={15}
                  style={{
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform .18s',
                    color: 'var(--muted)',
                  }}
                />
              </button>
              {isOpen && (
                <>
                  <div className="release__body selectable">
                    {stripHtml(rel.body) || 'Aucune note de version.'}
                  </div>
                  {rel.assets.length > 0 && (
                    <div style={{ padding: '10px 14px 14px' }}>
                      {rel.assets.map((a) => (
                        <div className="assetrow" key={a.name}>
                          <span className="assetrow__name" title={a.name}>
                            {a.name}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            {formatBytes(a.size)}
                          </span>
                          <button
                            className="btn btn--sm btn--ghost"
                            onClick={() => openExternal(a.url)}
                          >
                            <IconDownload size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrimaryAction({ app, onInstall, onLaunch, target }) {
  const entry = app.platforms[target];
  if (!entry?.available) {
    return (
      <button className="btn btn--lg" disabled>
        Aucun binaire
      </button>
    );
  }
  if (entry.installed) {
    return (
      <>
        <button className="btn btn--lg btn--ok" onClick={() => onLaunch(app, target)}>
          <IconPlay size={16} /> Lancer
        </button>
        {entry.status === 'outdated' && (
          <button className="btn btn--lg btn--primary" onClick={() => onInstall(app, target)}>
            <IconDownload size={16} /> Mettre a jour vers v{app.version}
          </button>
        )}
      </>
    );
  }
  return (
    <button className="btn btn--lg btn--primary" onClick={() => onInstall(app, target)}>
      <IconDownload size={16} /> Installer
    </button>
  );
}
