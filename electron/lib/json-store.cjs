const fs = require('node:fs');
const path = require('node:path');

const INSTALLED_KEY = 'celsius.installed';

/**
 * Magasin JSON avec tolerance aux pannes.
 *
 * Une mise a jour remplace les fichiers de l'application ; le fichier d'etat
 * peut etre momentanement indisponible (verrou, antivirus, ecriture interrompue).
 * On ne doit jamais transformer un fichier illisible en "zero donnee" puis
 * ecraser l'original : chaque ecriture conserve donc une copie de secours, et
 * la lecture fusionne les enregistrements d'installation des deux copies.
 */
class JsonStore {
  constructor(filePath, fallback = {}) {
    this.filePath = filePath;
    this.backupPath = `${filePath}.bak`;
    this.fallback = fallback;
    this.cache = null;
    this.degraded = false;
  }

  readFileSafe(target) {
    try {
      const raw = fs.readFileSync(target, 'utf8');
      if (!raw.trim()) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Fusionne les enregistrements d'installation : la copie la plus recente
   * gagne, ce qui permet de restaurer une cle perdue par une ecriture
   * interrompue ou remplacee par l'installeur.
   */
  mergeInstalled(primary, backup) {
    const merged = { ...(backup?.[INSTALLED_KEY] || {}) };
    for (const [key, value] of Object.entries(primary?.[INSTALLED_KEY] || {})) {
      const current = merged[key];
      if (!current || (value?.installedAt || 0) > (current?.installedAt || 0)) {
        merged[key] = value;
      }
    }
    return { ...backup, [INSTALLED_KEY]: merged };
  }

  read() {
    if (this.cache) return this.cache;

    const primary = this.readFileSafe(this.filePath);
    const backup = this.readFileSafe(this.backupPath);

    if (!primary && !backup) {
      this.cache = { ...this.fallback };
      return this.cache;
    }

    // Le fichier principal gagne pour les reglages (valeur la plus recente),
    // les installations sont fusionnees pour ne jamais perdre d'entree.
    const base = primary || backup;
    const settings = { ...this.fallback, ...(backup || {}), ...(primary || {}) };
    this.cache =
      primary && backup ? { ...settings, ...this.mergeInstalled(primary, backup) } : { ...this.fallback, ...base };

    // Signale une degradation : l'UI pourra proposer une reanalyse.
    this.degraded = Boolean(backup) && (!primary || !this.readFileSafe(this.filePath));
    if (this.degraded) {
      console.warn('[celsius] etat principal illisible, restauration depuis la copie de secours');
    }
    return this.cache;
  }

  write(patch) {
    const next = { ...this.read(), ...patch };
    this.cache = next;
    const json = JSON.stringify(next, null, 2);
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

      // Ecriture atomique : on ne laisse jamais de fichier a moitie ecrit.
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, json, 'utf8');
      fs.renameSync(tmp, this.filePath);
      this.degraded = false;

      // Miroir du dernier etat connu bon, pose apres le rename : si le fichier
      // principal est ensuite supprime ou tronque par une mise a jour, la copie
      // contient bien les donnees les plus recentes.
      try {
        fs.copyFileSync(this.filePath, this.backupPath);
      } catch {
        /* la copie de secours est un bonus, pas un bloquant */
      }
    } catch (err) {
      console.error('[celsius] ecriture de l etat impossible', err);
    }
    return next;
  }

  get(key) {
    return this.read()[key];
  }

  set(key, value) {
    return this.write({ [key]: value });
  }

  remove(key) {
    const next = { ...this.read() };
    delete next[key];
    this.cache = next;
    return this.write({});
  }

  /** Chemin du fichier d'etat, affiche dans les reglages. */
  get location() {
    return this.filePath;
  }
}

module.exports = { JsonStore, INSTALLED_KEY };
