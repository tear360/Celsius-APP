import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { CONFIG } from '../config.js';
import {
  IconChevron,
  IconExternal,
  IconInfo,
  IconSearch,
  IconUpdate,
} from './Icons.jsx';

const ISSUE_TYPES = [
  { id: 'bug', label: 'Bug' },
  { id: 'app-installer', label: 'Une app ne s installe pas' },
  { id: 'app-update', label: 'Une app ne se met pas a jour' },
  { id: 'android', label: 'Probleme sur Android' },
  { id: 'windows', label: 'Probleme sur Windows' },
  { id: 'feature', label: 'Suggestion / amelioration' },
  { id: 'other', label: 'Autre' },
];

/** Construit l'URL "nouvelle issue" GitHub, pre-remplie avec la version locale. */
function issueUrl(type, version, system) {
  const os = system ? `${system.os} (${system.arch}, ${system.cores} coeurs)` : 'inconnu';
  const body = [
    '### Description',
    '',
    '<!-- decris ce qui se passe -->',
    '',
    '### Version de Celsius',
    `${version || 'inconnue'}`,
    '',
    '### Systeme',
    `${os}`,
    '',
    '### Etapes pour reproduire',
    '1.',
    '2.',
    '3.',
    '',
    '### Journal / message d erreur',
    '```',
    '',
    '```',
  ].join('\n');
  const params = new URLSearchParams({ title: `[${type}] `, body });
  return `${CONFIG.issueBase}?${params.toString()}`;
}

export function Settings() {
  const { state, saveSettings, refresh, checkSelf, openExternal, detectInstalled } = useStore();
  const s = state.settings;
  const self = state.selfUpdate;
  const selfPhase = state.selfUpdatePhase;
  const source = state.catalog.source;
  const appVersion = state.appInfo?.version;
  const [issueOpen, setIssueOpen] = useState(false);
  const issueRef = useRef(null);

  useEffect(() => {
    if (!issueOpen) return undefined;
    const onDown = (e) => {
      if (issueRef.current && !issueRef.current.contains(e.target)) setIssueOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIssueOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [issueOpen]);

  return (
    <div className="detail" style={{ maxWidth: 1080, padding: '18px 22px 30px' }}>
      <div className="panel">
        <h3>General</h3>
        <Toggle
          label="Verifier les mises a jour au demarrage"
          hint="Consulte la derniere release GitHub de Celsius au lancement."
          value={s.autoCheckUpdates}
          onChange={(v) => saveSettings({ autoCheckUpdates: v })}
        />
        <Toggle
          label="Inclure les pre-releases"
          hint="Les versions taglees comme pre-release apparaissent dans le catalogue et pour les MAJ."
          value={s.includePrereleases}
          onChange={(v) => saveSettings({ includePrereleases: v })}
        />
        <Toggle
          label="Confirmer avant d'executer un installeur"
          hint="Demande confirmation avant de telecharger puis lancer un .exe tiers."
          value={s.confirmInstall}
          onChange={(v) => saveSettings({ confirmInstall: v })}
        />
        <Toggle
          label="Demarrer en plein ecran"
          hint="Ouvre la fenetre en occupe tout l'ecran."
          value={s.startMaximized}
          onChange={(v) => saveSettings({ startMaximized: v })}
        />
      </div>

      <div className="panel">
        <h3>Ma bibliotheque</h3>
        <p style={{ margin: '0 0 12px', color: 'var(--text-dim)', fontSize: 13 }}>
          Celsius retient les versions installees pour te proposer les mises a jour. Si la
          bibliotheque semble oubliee apres une reinstallation, rescanne le disque : les
          applications du catalogue deja presentes sur ce PC seront retrouvees.
        </p>
        {state.stateInfo?.degraded && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,200,87,.12)',
              border: '1px solid rgba(255,200,87,.3)',
              color: '#ffd98a',
              fontSize: 12.5,
            }}
          >
            Le fichier d'etat principal etait illisible au demarrage : les donnees ont ete
            restaurees depuis la copie de secours.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={detectInstalled}
            disabled={Boolean(state.busy.detect)}
          >
            {state.busy.detect ? <span className="spinner" /> : <IconSearch size={14} />}
            {state.busy.detect ? 'Analyse…' : 'Rechercher les apps installees'}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {Object.keys(state.installed).length} entree(s) enregistree(s)
          </span>
        </div>
        {state.stateInfo?.path && (
          <div className="hint" style={{ marginTop: 12, wordBreak: 'break-all' }}>
            Fichier d'etat : <span className="kbd">{state.stateInfo.path}</span>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>
          <IconInfo size={15} /> Selection des fichiers
        </h3>
        <div className="prose selectable">
          {`Pour chaque app, Celsius parcourt les assets de la release et applique ces regles dans l'ordre :

  1. "Windows-Setup" + .exe   ->  installeur
  2. "Windows" + .zip         ->  version portable (decompressee automatiquement)
  3. n'importe quel .exe/.msi ->  installeur
  4. "Android" + .apk         ->  APK Android

Si les assets portent d'autres noms, le champ "assets" de apps.json
permet de surcharger ces regles pour une app.`}
        </div>
      </div>

      <div className="panel">
        <h3>A propos de Celsius</h3>
        <div className="statgrid" style={{ marginBottom: 14 }}>
          <div className="stat">
            <div className="stat__label">Version</div>
            <div className="stat__value">{state.appInfo?.version || '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Plateforme</div>
            <div className="stat__value">
              {state.appInfo?.platform === 'android' ? 'Android' : 'Windows'}
            </div>
          </div>
          <div className="stat">
            <div className="stat__label">Apps</div>
            <div className="stat__value">{state.apps.length}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Catalogue</div>
            <div className="stat__value">
              {source === 'remote' ? 'GitHub' : source === 'embedded' ? 'Inclus' : '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => refresh()}>
            Recharger le catalogue
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => openExternal(CONFIG.repoUrl)}>
            <IconExternal size={14} /> Code source
          </button>
        <div className="dropdown" ref={issueRef}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setIssueOpen((v) => !v)}
            aria-expanded={issueOpen}
          >
            Signaler un probleme
            <IconChevron
              size={14}
              style={{
                transform: issueOpen ? 'rotate(90deg)' : 'none',
                transition: 'transform .16s',
              }}
            />
          </button>
          {issueOpen && (
            <>
              <div className="dropdown__scrim" onClick={() => setIssueOpen(false)} />
              <div className="dropdown__menu">
                <div className="dropdown__label">Ouvrir une issue</div>
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    className="dropdown__item"
                    onClick={() => {
                      setIssueOpen(false);
                      openExternal(issueUrl(t.id, appVersion, state.systemInfo));
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      <div className="panel">
        <h3>Mise a jour de Celsius</h3>
        {selfPhase === 'checking' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="spinner" /> <span style={{ color: 'var(--muted)' }}>Verification…</span>
          </div>
        ) : self?.available ? (
          <>
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              <b style={{ color: 'var(--ok)' }}>Celsius v{self.version}</b> est disponible
              {self.date ? ` — publiee le ${new Date(self.date).toLocaleDateString('fr-FR')}` : ''}.
            </div>
            <button className="btn btn--primary" onClick={() => checkSelf({ manual: true })}>
              <IconUpdate size={15} /> Mettre a jour maintenant
            </button>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
              Celsius est a jour ({state.appInfo?.version || '—'}).
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => checkSelf({ manual: true })}>
              Verifier maintenant
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <div className="switch">
      <div className="switch__text">
        <b>{label}</b>
        <span>{hint}</span>
      </div>
      <button
        className={`toggle ${value ? 'toggle--on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      />
    </div>
  );
}
