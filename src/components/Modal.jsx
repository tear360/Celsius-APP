import React, { useEffect } from 'react';
import { useStore } from '../state/store.jsx';
import { IconCheck, IconDownload, IconInfo, IconUpdate } from './Icons.jsx';
import { formatBytes, formatDate } from '../lib/format.js';

export function ModalHost() {
  const { state, dispatch } = useStore();
  const m = state.modal;

  useEffect(() => {
    if (!m) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dispatch({ type: 'modal', modal: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [m, dispatch]);

  if (!m) return null;
  const close = () => dispatch({ type: 'modal', modal: null });

  return (
    <div className="overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {m.kind === 'confirm' && (
          <>
            <h3>{m.title}</h3>
            <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: 13.5 }}>{m.body}</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={close}>
                Annuler
              </button>
              <button
                className="btn btn--primary"
                onClick={async () => {
                  await m.onConfirm?.();
                  close();
                }}
              >
                {m.confirmLabel || 'Confirmer'}
              </button>
            </div>
          </>
        )}

        {m.kind === 'update' && <UpdateModal update={m.update} onClose={close} />}
      </div>
    </div>
  );
}

function UpdateModal({ update, onClose }) {
  const { state, openExternal, applySelf, toast } = useStore();
  const [busy, setBusy] = React.useState(false);
  if (!update) return null;
  const ready = update.readyToInstall || state.selfUpdatePhase === 'downloaded';
  const downloading = state.selfUpdatePhase === 'downloading' || state.selfUpdatePhase === 'checking';

  const start = async () => {
    setBusy(true);
    try {
      const res = await applySelf();
      if (res?.quitting) onClose();
    } catch (err) {
      toast(err?.message || String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '26%',
          background: 'var(--grad)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 14,
        }}
      >
        <IconUpdate size={24} />
      </div>
      <h3>Celsius v{update.version} est disponible</h3>
      <p style={{ color: 'var(--text-dim)', margin: '0 0 6px', fontSize: 13 }}>
        Tu as la version {update.current || '—'}.
        {update.date ? ` Publiee le ${formatDate(update.date)}.` : ''}
        {update.asset?.size ? ` ${formatBytes(update.asset.size)}.` : ''}
      </p>

      {update.notes && (
        <div
          className="panel"
          style={{
            marginTop: 12,
            maxHeight: 220,
            overflow: 'auto',
            fontSize: 12.5,
            color: 'var(--text-dim)',
            whiteSpace: 'pre-wrap',
          }}
        >
          <span className="selectable">{update.notes}</span>
        </div>
      )}

      <div className="modal__actions">
        <button className="btn btn--ghost" onClick={onClose}>
          Plus tard
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => openExternal(update.url || 'https://github.com/tear360/Celsius-APP/releases')}
        >
          <IconInfo size={15} /> Notes
        </button>
        {ready ? (
          <button className="btn btn--primary" onClick={start} disabled={busy}>
            <IconCheck size={15} /> Redemarrer et installer
          </button>
        ) : (
          <button className="btn btn--primary" onClick={start} disabled={busy || downloading}>
            {downloading || busy ? <span className="spinner" /> : <IconDownload size={15} />}
            {downloading ? 'Telechargement…' : 'Mettre a jour'}
          </button>
        )}
      </div>
    </>
  );
}
