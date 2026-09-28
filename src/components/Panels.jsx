import { useStore } from '../state/store.jsx';
import { CONFIG } from '../config.js';
import { IconExternal, IconInfo, IconUpdate } from './Icons.jsx';

export function Settings() {
  const { state, saveSettings, refresh, checkSelf, openExternal } = useStore();
  const s = state.settings;
  const self = state.selfUpdate;
  const selfPhase = state.selfUpdatePhase;
  const source = state.catalog.source;

  return (
    <div className="detail" style={{ maxWidth: 720 }}>
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
