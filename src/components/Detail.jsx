import { useStore } from '../state/store.jsx';
import { AppIcon } from './AppIcon.jsx';
import {
  IconAndroid,
  IconBack,
  IconDownload,
  IconExternal,
  IconPlay,
  IconTrash,
  IconWindows,
} from './Icons.jsx';
import { formatBytes, stripHtml } from '../lib/format.js';

const PLATFORMS = [
  { key: 'windows', label: 'Windows', Icon: IconWindows },
  { key: 'android', label: 'Android', Icon: IconAndroid },
];

export function Detail({ app, mobile }) {
  const { dispatch, doInstall, launchApp, uninstallApp, openExternal } = useStore();

  if (!app) return null;

  const pick = () => (app.platforms.windows?.available ? 'windows' : 'android');
  const targetInstalled = Boolean(app.platforms[pick()]?.installed);

  return (
    <div className={`detail ${mobile ? 'detail--mobile' : ''}`}>
      {!mobile && (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => dispatch({ type: 'view', view: 'explore' })}
        >
          <IconBack size={15} /> Retour
        </button>
      )}

      <div className="detail__hero">
        <AppIcon app={app} size="xl" />
        <div className="detail__headline">
          <h1 className="detail__name">
            {app.name}
            {app.prerelease && <span className="badge badge--pre">pre-release</span>}
          </h1>
          <p className="detail__tagline">{app.tagline || 'Aucune description fournie.'}</p>
          <div className="detail__cta">
            <PrimaryAction app={app} onInstall={doInstall} onLaunch={launchApp} target={pick()} />
            {app.changelog && (
              <button
                className="btn btn--ghost"
                onClick={() => openExternal(app.releaseUrl || `https://github.com/${app.repo}/releases`)}
                title="Voir les releases sur GitHub"
              >
                <IconExternal size={15} /> Releases
              </button>
            )}
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
          <div className="stat__label">Taille</div>
          <div className="stat__value">{app.sizeLabel || '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Mise a jour</div>
          <div className="stat__value">
            {app.version
              ? new Date(app.publishedAt || Date.now()).toLocaleDateString('fr-FR')
              : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Telechargements</div>
          <div className="stat__value">{app.downloads || 0}</div>
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
                    ? `Installe v${entry.installed.version ?? '?'}${
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
          <div className="prose selectable">{stripHtml(app.changelog)}</div>
        </div>
      )}
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
