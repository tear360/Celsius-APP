import React from 'react';
import { useStore } from '../state/store.jsx';
import { openInstallSettings } from '../platform/index.js';
import { AppIcon } from './AppIcon.jsx';
import { IconClose } from './Icons.jsx';
import { formatBytes } from '../lib/format.js';

export function DownloadDock({ mobile }) {
  const { state, dispatch, cancelTask } = useStore();
  const tasks = Object.values(state.tasks);
  if (!tasks.length) return null;
  return (
    <div className={mobile ? 'mobile-dock' : 'dock'}>
      {tasks.map((t) => (
        <div className="dockcard" key={t.id}>
          <div className="dockcard__head">
            {state.apps.find((a) => a.id === t.appId) ? (
              <AppIcon app={state.apps.find((a) => a.id === t.appId)} size="sm" />
            ) : (
              <span className="spinner" />
            )}
            <div className="dockcard__name">{t.appName || 'Telechargement'}</div>
            {t.phase !== 'error' && (
              <button className="iconbtn" onClick={() => cancelTask(t.id)} title="Annuler">
                <IconClose size={14} />
              </button>
            )}
          </div>

          {t.phase === 'error' ? (
            <div style={{ color: '#ff92a6', fontSize: 12.5 }}>{t.error}</div>
          ) : (
            <>
              <div className={`bar ${t.percent ? '' : 'bar--indeterminate'}`}>
                <div
                  className="bar__fill"
                  style={{ width: `${t.percent || 12}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(t.percent || 0)}
                />
              </div>
              <div className="dockcard__foot">
                {t.phase === 'installing' ? (
                  <>
                    <span className="spinner" />
                    <span>{mobile ? 'Installation…' : 'Lancement de l’installeur…'}</span>
                  </>
                ) : t.phase === 'awaiting-install' ? (
                  <span>Valide l’installation sur ton appareil</span>
                ) : t.phase === 'needs-permission' ? (
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => openInstallSettings?.()}
                  >
                    Autoriser l’installation
                  </button>
                ) : t.phase === 'done' ? (
                  <span style={{ color: 'var(--ok)' }}>Installe avec succes</span>
                ) : t.phase === 'queued' ? (
                  <>
                    <span className="spinner" />
                    <span>Preparation…</span>
                  </>
                ) : (
                  <>
                    <span>
                      {t.received ? formatBytes(t.received) : '0 o'} /{' '}
                      {t.total ? formatBytes(t.total) : '?'}
                    </span>
                    <span style={{ marginLeft: 'auto' }}>{Math.round(t.percent || 0)} %</span>
                  </>
                )}
              </div>
              {t.assetName && t.phase === 'downloading' && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: 'var(--muted)',
                    marginTop: 5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={t.assetName}
                >
                  {t.assetName}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function Toast() {
  const { state } = useStore();
  if (!state.toast) return null;
  return (
    <div className={`toast toast--${state.toast.kind}`} role="status">
      {state.toast.text}
    </div>
  );
}
