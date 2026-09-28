import React from 'react';
import { useStore } from '../state/store.jsx';
import { CONFIG } from '../config.js';
import { IconExternal, IconInfo, IconRefresh, IconUpdate } from './Icons.jsx';

export function Settings() {
  const { state, saveSettings, refresh, checkSelf, openExternal } = useStore();
  const s = state.settings;
  const self = state.selfUpdate;
  const selfPhase = state.selfUpdatePhase;
  const source = state.catalog.source;

  return (
    <div className="detail" style={{ maxWidth: 720 }}>
      <div className="panel">
        <h3>Catalogue</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span
            className={`dot ${source === 'remote' ? '' : source === 'embedded' ? 'dot--busy' : 'dot--off'}`}
          />
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            {source === 'remote'
              ? 'Catalogue lu depuis le depot GitHub'
              : source === 'embedded'
                ? 'Catalogue embarque (mode hors ligne)'
                : 'Source inconnue'}
          </span>
        </div>

        <div className="switch">
          <div className="switch__text">
            <b>Utiliser le catalogue distant</b>
            <span>
              Le catalogue est lu depuis apps.json dans le depot. Tu peux y ajouter une app sans
              reconstruire Celsius : tout le monde la recoit au prochain rafraichissement.
            </span>
          </div>
          <button
            className={`toggle ${s.useRemoteCatalog ? 'toggle--on' : ''}`}
            onClick={() => saveSettings({ useRemoteCatalog: !s.useRemoteCatalog })}
            aria-pressed={s.useRemoteCatalog}
          />
        </div>

        <div className="field">
          <label htmlFor="catalog">URL du catalogue</label>
          <CatalogInput
            value={s.catalogUrl}
            onCommit={(value) => saveSettings({ catalogUrl: value })}
          />
          <div className="hint">
            Doit renvoyer un JSON au meme schema que public/apps.json. Valide avec Entree pour
            appliquer et recharger.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => refresh()}>
            <IconRefresh size={14} /> Recharger
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => openExternal(CONFIG.catalogEditUrl)}
          >
            <IconExternal size={14} /> Modifier apps.json
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => saveSettings({ catalogUrl: CONFIG.catalogUrl })}
            disabled={s.catalogUrl === CONFIG.catalogUrl}
          >
            Reinitialiser l'URL
          </button>
        </div>
      </div>

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
      </div>

      <div className="panel">
        <h3>Jeton GitHub (optionnel)</h3>
        <div className="field" style={{ marginBottom: 8 }}>
          <input
            id="token"
            type="password"
            value={s.token}
            placeholder="ghp_…"
            onChange={(e) => saveSettings({ token: e.target.value.trim() })}
            spellCheck={false}
          />          <div className="hint">
            Necessaire uniquement pour les depots prives, et pour lever la limite de 60 requetes/h
            de l'API GitHub. Stocke uniquement sur ton appareil, jamais envoye ailleurs.
          </div>
        </div>
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

Surrogate si les assets portent d'autres noms, le champ "assets" de apps.json
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
            <div className="stat__label">Build</div>
            <div className="stat__value">{state.appInfo?.build || '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Apps</div>
            <div className="stat__value">{state.apps.length}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => openExternal(CONFIG.repoUrl)}>
            <IconExternal size={14} /> Code source
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => openExternal(CONFIG.supportUrl)}>
            Signaler un probleme
          </button>
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

function CatalogInput({ value, onCommit }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    else setDraft(value);
  };
  return (
    <input
      id="catalog"
      type="url"
      value={draft}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
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
