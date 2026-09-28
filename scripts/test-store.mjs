/**
 * Tests de la persistance : une mise a jour remplace les fichiers de l'app, le
 * fichier d'etat peut devenir illisible. On verifie qu'aucune donnee n'est
 * perdue silencieusement et que la copie de secours permet de restaurer.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JsonStore, INSTALLED_KEY } = require('../electron/lib/json-store.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'celsius-store-'));
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const file = (name) => path.join(root, name);
const fallback = { [INSTALLED_KEY]: {}, 'celsius.settings': {} };
const readRaw = (p) => fs.readFileSync(p, 'utf8');

test('ecriture puis relecture', () => {
  const p = file('a.json');
  const s = new JsonStore(p, fallback);
  s.set(INSTALLED_KEY, { 'quiz:windows': { version: '1.0', installedAt: 1 } });
  const s2 = new JsonStore(p, fallback);
  assert.deepStrictEqual(s2.get(INSTALLED_KEY)['quiz:windows'], { version: '1.0', installedAt: 1 });
});

test('un fichier principal corrompu ne doit pas tout perdre', () => {
  const p = file('b.json');
  const s = new JsonStore(p, fallback);
  s.set(INSTALLED_KEY, { 'app:windows': { version: '2.0', installedAt: 10 } });
  s.set(INSTALLED_KEY, { 'app:windows': { version: '2.1', installedAt: 20 } });
  assert.ok(fs.existsSync(`${p}.bak`), 'une copie de secours doit exister');

  // L'installeur (ou un antivirus) tronque le fichier principal.
  fs.writeFileSync(p, '{ "celsius.installed": { "app:win', 'utf8');

  const revived = new JsonStore(p, fallback);
  const installed = revived.get(INSTALLED_KEY);
  assert.ok(installed && installed['app:windows'], 'la donnee doit etre restauree');
  assert.strictEqual(
    installed['app:windows'].version,
    '2.1',
    'la copie de secours est le miroir du dernier etat connu bon',
  );
  assert.strictEqual(revived.degraded, true, 'l etat doit etre signale degrade');
});

test('un fichier principal absent est reconstruit depuis la sauvegarde', () => {
  const p = file('c.json');
  const s = new JsonStore(p, fallback);
  s.set(INSTALLED_KEY, { 'x:windows': { version: '1.0', installedAt: 1 } });
  s.set('celsius.settings', { includePrereleases: true });
  fs.rmSync(p);

  const revived = new JsonStore(p, fallback);
  assert.ok(revived.get(INSTALLED_KEY)['x:windows'], 'l installation doit survivre');
  assert.strictEqual(revived.get('celsius.settings').includePrereleases, true);
});

test('les deux copies sont fusionnees, la plus recente gagne', () => {
  const p = file('d.json');
  fs.writeFileSync(
    p,
    JSON.stringify({ [INSTALLED_KEY]: { a: { version: '1', installedAt: 1 }, b: { version: '9', installedAt: 5 } } }),
    'utf8',
  );
  fs.writeFileSync(
    `${p}.bak`,
    JSON.stringify({ [INSTALLED_KEY]: { a: { version: '0', installedAt: 0 }, c: { version: '3', installedAt: 2 } } }),
    'utf8',
  );
  const s = new JsonStore(p, fallback);
  const installed = s.get(INSTALLED_KEY);
  assert.strictEqual(installed.a.version, '1', 'la valeur la plus recente gagne');
  assert.strictEqual(installed.c.version, '3', 'une cle absente du principal est ajoutee');
  assert.ok(installed.b, 'les cles du principal sont conservees');
});

test('un fichier vide ou du bruit ne casse rien', () => {
  const p = file('e.json');
  fs.writeFileSync(p, '   ', 'utf8');
  const s = new JsonStore(p, fallback);
  assert.deepStrictEqual(s.get(INSTALLED_KEY), {});

  const p2 = file('f.json');
  fs.writeFileSync(p2, 'pas du json', 'utf8');
  assert.deepStrictEqual(new JsonStore(p2, fallback).get(INSTALLED_KEY), {});
});

test('une donnee ajoutee apres restauration est persistee', () => {
  const p = file('g.json');
  const s = new JsonStore(p, fallback);
  s.set(INSTALLED_KEY, { keep: { version: '5', installedAt: 5 } });
  fs.writeFileSync(p, 'corrompu', 'utf8');
  s.set(INSTALLED_KEY, { keep: { version: '5', installedAt: 5 }, added: { version: '6', installedAt: 6 } });
  assert.deepStrictEqual(
    Object.keys(JSON.parse(readRaw(p))[INSTALLED_KEY]).sort(),
    ['added', 'keep'],
    'le fichier principal reparait complet',
  );
});

test('aucun fichier .tmp laisse derriere', () => {
  const leftovers = fs.readdirSync(root).filter((f) => f.endsWith('.tmp'));
  assert.deepStrictEqual(leftovers, []);
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
