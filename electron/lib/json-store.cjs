const fs = require('node:fs');
const path = require('node:path');

/** Petit magasin JSON synchrone, atomique, dans userData. */
class JsonStore {
  constructor(filePath, fallback = {}) {
    this.filePath = filePath;
    this.fallback = fallback;
    this.cache = null;
  }

  read() {
    if (this.cache) return this.cache;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.cache = { ...this.fallback, ...JSON.parse(raw) };
    } catch {
      this.cache = { ...this.fallback };
    }
    return this.cache;
  }

  write(patch) {
    const next = { ...this.read(), ...patch };
    this.cache = next;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[celsius] ecriture impossible', err);
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
}

module.exports = { JsonStore };
