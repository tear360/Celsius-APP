/**
 * Test de findInstalledExecutable : simule les arborescences d'installation
 * Windows reelles (NSIS par utilisateur, Program Files, version portable)
 * et verifie qu'on retombe toujours sur l'application et jamais sur
 * l'installeur qui l'a installee.
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findInstalledExecutable, looksLikeInstaller } = require('../electron/lib/resolve.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'celsius-resolve-'));
const touch = (p) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'x');
  return p;
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

/* --- 1. NSIS par utilisateur (Programs\<Nom>) ------------------------- */
test('NSIS per-user : trouve l exe principal, pas l installeur', () => {
  const appData = path.join(root, 'appdata');
  const base = path.join(appData, 'Programs', 'QuizRevise');
  touch(path.join(base, 'QuizRevise.exe'));
  touch(path.join(base, 'Uninstall QuizRevise.exe'));
  touch(path.join(base, 'resources', 'app.asar'));

  const found = findInstalledExecutable('QuizRevise', [appData]);
  assert.strictEqual(found, path.join(base, 'QuizRevise.exe'));
});

/* --- 2. Programme Files avec nom de binaire different ----------------- */
test('Program Files : le nom du binaire prime sur celui du dossier', () => {
  const pf = path.join(root, 'pf');
  const base = path.join(pf, 'QuizRevise');
  touch(path.join(base, 'QuizRevise-v1.4.5-win-x64.exe'));
  touch(path.join(base, 'unins000.exe'));

  const found = findInstalledExecutable('QuizRevise', [pf]);
  assert.strictEqual(found, path.join(base, 'QuizRevise-v1.4.5-win-x64.exe'));
});

/* --- 3. L installeur telecharge ne doit jamais etre choisi -------------- */
test('l installeur du dossier Downloads n est pas retenu', () => {
  const dl = path.join(root, 'downloads');
  const setup = touch(path.join(dl, 'QuizRevise-Windows-Setup-v1.4.5.exe'));
  assert.strictEqual(looksLikeInstaller(setup, 'QuizRevise'), true);

  // Meme passe en knownPath, un installeur est refuse.
  const appData = path.join(root, 'appdata2');
  const base = path.join(appData, 'Programs', 'QuizRevise');
  const app = touch(path.join(base, 'QuizRevise.exe'));

  const found = findInstalledExecutable('QuizRevise', [appData], setup);
  assert.strictEqual(found, app, 'doit ignorer le Setup et trouver l application installee');
});

/* --- 4. knownPath valide : reutilise tel quel --------------------------- */
test('un chemin connu valide est reutilise sans recherche', () => {
  const dir = path.join(root, 'known');
  const app = touch(path.join(dir, 'MonApp.exe'));
  const found = findInstalledExecutable('MonApp', [root], app);
  assert.strictEqual(found, app);
});

/* --- 5. App absente : renvoie null (l UI ouvre le selecteur) ----------- */
test('application absente : null', () => {
  assert.strictEqual(findInstalledExecutable('PasInstallée', [root]), null);
});

/* --- 6. Accents / casse / separateurs ---------------------------------- */
test('insensible a la casse, aux accents et aux separateurs', () => {
  const dir = path.join(root, 'accents');
  const app = touch(path.join(dir, 'Mon-Application.exe'));
  const found = findInstalledExecutable('mon application', [dir]);
  assert.strictEqual(found, app);
});

/* --- 7. Version portable : ouvert .bat gagne si pas d exe -------------- */
test('version portable sans .exe', () => {
  const dir = path.join(root, 'portable', 'MonApp');
  const bat = touch(path.join(dir, 'MonApp.bat'));
  const found = findInstalledExecutable('MonApp', [path.join(root, 'portable')]);
  assert.strictEqual(found, bat);
});

/* --- 8. Deux apps installees : pas de confusion ----------------------- */
test('deux apps coexistent sans melange', () => {
  const base = path.join(root, 'deux');
  touch(path.join(base, 'Alpha', 'Alpha.exe'));
  touch(path.join(base, 'Betadeux', 'Betadeux.exe'));
  assert.strictEqual(findInstalledExecutable('Alpha', [base]), path.join(base, 'Alpha', 'Alpha.exe'));
  assert.strictEqual(
    findInstalledExecutable('Beta', [base]),
    path.join(base, 'Betadeux', 'Betadeux.exe'),
  );
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}
fs.rmSync(root, { recursive: true, force: true });
console.log(failed ? `\n${failed} test(s) en echec` : `\n${tests.length} tests OK`);
process.exit(failed ? 1 : 0);
