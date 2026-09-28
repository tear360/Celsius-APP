/** Tests de la comparaison de versions (pilote l affichage des badges MAJ). */
import assert from 'node:assert';
import { compareVersions, isNewer, isPrerelease, parseVersion } from '../src/lib/semver.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('ordre numerique correct', () => {
  assert.strictEqual(compareVersions('1.0.1', '1.0.0'), 1);
  assert.strictEqual(compareVersions('1.0.0', '1.0.1'), -1);
  assert.strictEqual(compareVersions('1.10.0', '1.9.0'), 1);
  assert.strictEqual(compareVersions('2.0.0', '1.99.99'), 1);
  assert.strictEqual(compareVersions('1.2.3', '1.2.3'), 0);
});

test('le prefixe v est ignore', () => {
  assert.strictEqual(compareVersions('v1.4.5', '1.4.5'), 0);
  assert.strictEqual(isNewer('v1.4.6', 'v1.4.5'), true);
});

test('les parties manquantes valent zero', () => {
  assert.strictEqual(compareVersions('1.1', '1.1.0'), 0);
  assert.strictEqual(compareVersions('2', '1.9.9'), 1);
});

test('une pre-release est inferieure a la version finale', () => {
  assert.strictEqual(compareVersions('1.5.0-beta.1', '1.5.0'), -1);
  assert.strictEqual(compareVersions('1.5.0', '1.5.0-rc.1'), 1);
});

test('les pre-releases se comparent entre elles', () => {
  assert.strictEqual(compareVersions('1.5.0-beta.2', '1.5.0-beta.1'), 1);
  assert.strictEqual(compareVersions('1.5.0-alpha', '1.5.0-beta'), -1);
  assert.strictEqual(compareVersions('1.5.0-rc.1', '1.5.0-beta.9'), 1);
});

test('isNewer / isPrerelease', () => {
  assert.strictEqual(isNewer('1.0.1', '1.0.0'), true);
  assert.strictEqual(isNewer('1.0.0', '1.0.0'), false);
  assert.strictEqual(isNewer('1.0.0', null), true, 'sans version installee on propose tout');
  assert.strictEqual(isNewer(null, '1.0.0'), false);
  assert.strictEqual(isPrerelease('1.0.0-rc.1'), true);
  assert.strictEqual(isPrerelease('v1.0.0'), false);
});

test('entrees invalides ne plantent pas', () => {
  assert.strictEqual(parseVersion('pas une version'), null);
  assert.strictEqual(compareVersions('nope', '1.0.0'), 0);
  assert.strictEqual(compareVersions(null, undefined), 0);
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
