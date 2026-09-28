const fs = require('node:fs');
const path = require('node:path');

const INSTALLER_HINT = /(setup|install|installer|update|updater|unins|uninstall|vc_redist|vcredist)/i;

const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Un .exe qui ressemble a un installeur n'est jamais l'application lancee. */
function looksLikeInstaller(filePath, appName) {
  const stem = path.basename(filePath, path.extname(filePath));
  const target = normalize(appName);
  // Le binaire qui porte exactement le nom de l'app est l'app, meme si le nom
  // contient un mot d'installeur (ex: une app nommee "Update").
  if (target && normalize(stem) === target) return false;
  return INSTALLER_HINT.test(stem);
}

function findExes(dir, depth, out) {
  if (depth < 0) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findExes(full, depth - 1, out);
    else if (/\.(exe|bat|cmd)$/i.test(e.name)) out.push(full);
  }
}

/**
 * Cherche l'executable reellement installe d'une application parmi `roots`.
 * Les installeurs/desinstalleurs sont exclus, et le nom du binaire prime
 * sur le nom du dossier quand les deux correspondent.
 * Renvoie le meilleur candidat ou null.
 */
function findInstalledExecutable(appName, roots, knownPath) {
  if (knownPath && fs.existsSync(knownPath) && !looksLikeInstaller(knownPath, appName)) {
    return knownPath;
  }
  const target = normalize(appName);
  if (!target) return null;

  let best = null;
  let bestScore = -1;

  const consider = (exe, parentName) => {
    if (looksLikeInstaller(exe, appName)) return;
    const base = normalize(path.basename(exe, path.extname(exe)));
    const parent = normalize(parentName);
    let score = 0;
    if (base === target) score += 100;
    else if (base.includes(target)) score += 60;
    else if (parent === target) score += 40;
    else if (parent.includes(target)) score += 25;
    else return;
    const rank = score * 1000 - Math.min(999, exe.length / 10);
    if (rank > bestScore) {
      best = exe;
      bestScore = rank;
    }
  };

  for (const root of roots) {
    let entries;
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }

    // 1) la racine peut etre le dossier d'installation lui-meme
    //    (%LOCALAPPDATA%\Programs\QuizRevise par exemple) : on laisse
    //    consider() trancher sur le nom du binaire.
    const rootName = path.basename(root);
    const direct = [];
    findExes(root, 2, direct);
    for (const exe of direct) consider(exe, rootName);

    // 2) un sous-dossier porte le nom de l'app
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirName = normalize(entry.name);
      if (!dirName.includes(target) && !target.includes(dirName)) continue;
      const exes = [];
      findExes(path.join(root, entry.name), 2, exes);
      for (const exe of exes) consider(exe, entry.name);
    }
  }
  return best;
}

module.exports = { findInstalledExecutable, looksLikeInstaller, normalize };
