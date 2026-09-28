/**
 * Tests du moteur de catalogue : regles de selection des assets, calcul
 * du statut installed / a jour / MAJ, et repli en cas de release absente.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import { buildAppEntry } from '../src/lib/github.js';

const catalog = JSON.parse(fs.readFileSync(new URL('../public/apps.json', import.meta.url), 'utf8'));

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const def = {
  id: 'demo',
  name: 'Demo',
  repo: 'tear360/demo',
  assets: {
    windows: [
      { match: 'Windows-Setup-.*\\.exe$', kind: 'installer' },
      { match: 'Windows-.*\\.zip$', kind: 'portable' },
      { match: '\\.exe$', kind: 'installer' },
    ],
    android: [{ match: 'Android-.*\\.apk$', kind: 'apk' }],
  },
};

const release = {
  version: '1.4.5',
  tag: 'v1.4.5',
  name: 'v1.4.5',
  body: 'notes',
  prerelease: false,
  publishedAt: '2026-09-28T10:00:00Z',
  url: 'https://example.test',
  assets: [
    { name: 'Demo-Android-v1.4.5.apk', size: 10, url: 'a' },
    { name: 'Demo-Linux-deb-v1.4.5.deb', size: 11, url: 'b' },
    { name: 'Demo-iOS-unsigned-v1.4.5.ipa', size: 12, url: 'c' },
    { name: 'Demo-Windows-v1.4.5.tar.gz', size: 13, url: 'd' },
    { name: 'Demo-Windows-Setup-v1.4.5.exe', size: 14, url: 'e' },
  ],
};

test('le bon asset est choisi sur chaque plateforme', () => {
  const app = buildAppEntry(def, release, {});
  assert.strictEqual(app.platforms.windows.asset.name, 'Demo-Windows-Setup-v1.4.5.exe');
  assert.strictEqual(app.platforms.windows.asset.kind, 'installer');
  assert.strictEqual(app.platforms.android.asset.name, 'Demo-Android-v1.4.5.apk');
  assert.strictEqual(app.platforms.android.asset.kind, 'apk');
});

test('les assets hors platforme sont ignores (deb, ipa, tar.gz)', () => {
  const app = buildAppEntry(def, release, {});
  const names = Object.values(app.platforms).map((p) => p.asset?.name);
  for (const junk of ['Demo-Linux-deb-v1.4.5.deb', 'Demo-iOS-unsigned-v1.4.5.ipa', 'Demo-Windows-v1.4.5.tar.gz']) {
    assert.ok(!names.includes(junk), `${junk} ne doit pas etre retenu`);
  }
});

test('statut absent quand rien n est installe', () => {
  const app = buildAppEntry(def, release, {});
  assert.strictEqual(app.platforms.windows.status, 'absent');
  assert.strictEqual(app.needsUpdate, false);
});

test('statut a jour quand la version installee est la derniere', () => {
  const app = buildAppEntry(def, release, {
    windows: { version: '1.4.5' },
    android: { version: '1.4.5' },
  });
  assert.strictEqual(app.platforms.windows.status, 'up-to-date');
  assert.strictEqual(app.needsUpdate, false);
});

test('statut MAJ quand la version installee est plus ancienne', () => {
  const app = buildAppEntry(def, release, { windows: { version: '1.3.0' } });
  assert.strictEqual(app.platforms.windows.status, 'outdated');
  assert.strictEqual(app.platforms.windows.updateVersion, '1.4.5');
  assert.strictEqual(app.needsUpdate, true);
});

test('une version installee plus recente n est pas signalee obsolete', () => {
  const app = buildAppEntry(def, release, { windows: { version: '2.0.0' } });
  assert.strictEqual(app.platforms.windows.status, 'up-to-date');
});

test('release absente : l app reste listable mais signalee en erreur', () => {
  const app = buildAppEntry(def, null, {});
  assert.strictEqual(app.version, null);
  assert.strictEqual(app.error, 'introuvable');
  assert.strictEqual(app.platforms.windows.available, false);
  assert.strictEqual(app.name, 'Demo', 'la carte reste affichee');
});

test('release sans asset Windows : plateforme indisponible, pas de crash', () => {
  const partial = { ...release, assets: release.assets.filter((a) => a.name.endsWith('.apk')) };
  const app = buildAppEntry(def, partial, {});
  assert.strictEqual(app.platforms.windows.available, false);
  assert.strictEqual(app.platforms.android.available, true);
});

test('regex invalide ignoree sans casser la selection', () => {
  const broken = {
    ...def,
    assets: { ...def.assets, windows: [{ match: '([unclosed', kind: 'installer' }, ...def.assets.windows] },
  };
  const app = buildAppEntry(broken, release, {});
  assert.strictEqual(app.platforms.windows.asset.name, 'Demo-Windows-Setup-v1.4.5.exe');
});

test('le catalogue livre est valide', () => {
  assert.ok(Array.isArray(catalog.apps), 'apps doit etre un tableau');
  const ids = new Set();
  for (const a of catalog.apps) {
    for (const k of ['id', 'name', 'repo']) {
      assert.ok(a[k], `champ ${k} manquant sur ${a.id}`);
    }
    assert.ok(/^[^/]+\/[^/]+$/.test(a.repo), `repo invalide: ${a.repo}`);
    assert.ok(!ids.has(a.id), `id duplique: ${a.id}`);
    ids.add(a.id);
    for (const plat of ['windows', 'android']) {
      for (const r of a.assets?.[plat] || []) {
        assert.doesNotThrow(() => new RegExp(r.match, 'i'), `regex invalide: ${r.match}`);
        assert.ok(['installer', 'portable', 'apk'].includes(r.kind), `kind inconnu: ${r.kind}`);
      }
    }
  }
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
