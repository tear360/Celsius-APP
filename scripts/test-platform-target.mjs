/**
 * Le bug Android le plus vicieux : la fiche d'app choisissait Windows en
 * priorite, ce qui declenchait « Cible non geree sur android » sur le bouton
 * principal. Ces tests verrouillent le comportement attendu.
 */
import assert from 'node:assert';
import { preferredPlatform } from '../src/lib/platform-target.js';

const app = {
  platforms: {
    windows: { available: true, asset: { name: 'X-Setup.exe' } },
    android: { available: true, asset: { name: 'X.apk' } },
  },
};

const onlyAndroid = {
  platforms: { windows: { available: false }, android: { available: true } },
};

const onlyWindows = {
  platforms: { windows: { available: true }, android: { available: false } },
};

const none = { platforms: { windows: { available: false }, android: { available: false } } };

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('sur Android, on vise Android meme si Windows est disponible', () => {
  assert.strictEqual(preferredPlatform(app, 'android'), 'android');
});

test('sur Windows, on vise Windows meme si Android est disponible', () => {
  assert.strictEqual(preferredPlatform(app, 'windows'), 'windows');
});

test('on bascule si la plateforme locale n a pas de binaire', () => {
  assert.strictEqual(preferredPlatform(onlyAndroid, 'windows'), 'android');
  assert.strictEqual(preferredPlatform(onlyWindows, 'android'), 'windows');
});

test('aucun binaire : on reste sur la plateforme locale', () => {
  assert.strictEqual(preferredPlatform(none, 'android'), 'android');
  assert.strictEqual(preferredPlatform(none, 'windows'), 'windows');
});

test('plateforme inconnue : defaut windows', () => {
  assert.strictEqual(preferredPlatform(app, undefined), 'windows');
  assert.strictEqual(preferredPlatform(app, 'linux'), 'windows');
});

test('entree defensive (app vide)', () => {
  assert.strictEqual(preferredPlatform(null, 'android'), 'android');
  assert.strictEqual(preferredPlatform({}, 'windows'), 'windows');
});

test('le scenario exact du bug signale : Android + app bicanale', () => {
  // Ce que faisait l'ancien Detail.jsx : Windows en priorite inconditionnelle.
  const ancien = app.platforms.windows?.available ? 'windows' : 'android';
  assert.strictEqual(ancien, 'windows', 'l ancien code renvoyait bien windows');
  assert.strictEqual(
    preferredPlatform(app, 'android'),
    'android',
    'donc le nouveau code ne peut plus produire la cible windows sur Android',
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
console.log(failed ? `\n${failed} test(s) en echec` : `\n${tests.length} tests OK`);
process.exit(failed ? 1 : 0);
