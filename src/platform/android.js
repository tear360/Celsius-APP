/**
 * Bridge Android (Capacitor). S'appuie sur @capacitor/app, @capacitor/preferences
 * et le plugin natif "Celsius" (android/app/src/main/java/.../CelsiusPlugin.java)
 * qui gere le telechargement, l'installation d'APK et le lancement d'une app.
 */
import { registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CONFIG } from '../config.js';
import { fetchLatestRelease } from '../lib/github.js';
import { isNewer } from '../lib/semver.js';

const Celsius = registerPlugin('Celsius');

export const platform = 'android';
export const isDesktop = false;

export async function info() {
  const res = await App.getInfo();
  return {
    platform: 'android',
    version: res.version,
    build: res.build,
    nativeVersion: res.nativeVersion,
  };
}

export async function setupNative() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#070a16' });
  } catch {
    /* ignore */
  }
  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* ignore */
  }
}

export const kvGet = async (key) => {
  const { value } = await Preferences.get({ key });
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const kvSet = (key, value) => Preferences.set({ key, value: JSON.stringify(value) });
export const kvRemove = (key) => Preferences.remove({ key });

export async function systemInfo() {
  return Celsius.systemInfo();
}

// Android : l'etat vit dans les Preferences systeme, rien a reparcourir.
export async function stateInfo() {
  return { path: 'Preferences (Capacitor)', degraded: false };
}

export async function detectInstalled(list) {
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!item?.id || !item.androidPackage) continue;
    if (await isPackageInstalled(item.androidPackage)) {
      out.push({
        id: item.id,
        platform: 'android',
        path: null,
        version: await installedVersionOf(item.androidPackage),
      });
    }
  }
  return out;
}

export async function openInstallSettings() {
  return Celsius.openInstallSettings();
}

let counter = 0;
const nextTaskId = () => `t${Date.now().toString(36)}${(counter += 1)}`;

export async function install({ appId, asset, version, platform: target }) {
  const want = target || 'android';
  if (want !== 'android') {
    throw new Error(
      `Impossible d installer une cible « ${want} » depuis Android : choisis la ligne Android de la fiche.`,
    );
  }
  if (!asset?.url) throw new Error('Aucun APK pour cette app');
  const taskId = nextTaskId();
  const fileName = sanitize(asset.name);
  await Celsius.download({
    taskId,
    url: asset.url,
    fileName,
    appId,
    version,
  });
  return { taskId, fileName };
}

export async function cancel(taskId) {
  return Celsius.cancelDownload({ taskId });
}

export async function launch({ platform: target, packageName }) {
  if (target !== 'android' || !packageName) {
    throw new Error('Package Android inconnu pour cette app');
  }
  return Celsius.launchPackage({ packageName });
}

export async function uninstall({ platform: target, packageName }) {
  if (target !== 'android' || !packageName) throw new Error('Package Android inconnu');
  return Celsius.uninstallPackage({ packageName });
}

export async function isPackageInstalled(packageName) {
  if (!packageName) return false;
  try {
    const res = await Celsius.isPackageInstalled({ packageName });
    return Boolean(res?.installed);
  } catch {
    return false;
  }
}

export async function installedVersionOf(packageName) {
  if (!packageName) return null;
  try {
    const res = await Celsius.isPackageInstalled({ packageName });
    return res?.installed ? res.version || null : null;
  } catch {
    return null;
  }
}

export async function appStatus({ androidPackage }) {
  return { installed: androidPackage ? await isPackageInstalled(androidPackage) : false, running: false };
}

export async function closeApp() {
  return { closed: false, reason: 'non-applicable' };
}

export async function uninstallApp() {
  return { ok: false, reason: 'utiliser-les-reglages' };
}

export async function pickExecutable() {
  throw new Error('Non disponible sur Android');
}

export async function openExternal(url) {
  await Celsius.openExternal({ url });
}

export async function revealPath() {
  /* le gestionnaire de fichiers gere ce cas sur Android */
}

export async function checkSelfUpdate({ includePrereleases = false } = {}) {
  const current = (await info()).version;
  const release = await fetchLatestRelease(CONFIG.selfRepo, {});
  if (!release) return { current, available: false };
  const usable = includePrereleases || !release.prerelease;
  const available = usable && isNewer(release.version, current);
  const asset = CONFIG.defaultApkAsset.map((re) => {
    const found = release.assets.find((a) => re.test(a.name));
    return found || null;
  }).find(Boolean);
  return {
    current,
    available,
    version: release.version,
    tag: release.tag,
    notes: release.body,
    date: release.publishedAt,
    url: release.url,
    asset: asset || null,
    required: true,
  };
}

export async function applySelfUpdate() {
  const res = await checkSelfUpdate({});
  if (!res.available || !res.asset) throw new Error('Aucune mise a jour disponible');
  const taskId = nextTaskId();
  await Celsius.download({
    taskId,
    url: res.asset.url,
    fileName: sanitize(res.asset.name),
    appId: 'celsius',
    version: res.version,
    autoInstall: true,
  });
  return { taskId };
}

export async function startBackgroundUpdateCheck() {
  /* Verification au demarrage : le listener est enregistre dans App.jsx */
}

/**
 * Capacitor renvoie une Promise de PluginListenerHandle, pas la fonction
 * de desabonnement. On expose donc toujours une fonction : le cleanup des
 * effets React appelle le retour sans verifier son type.
 */
const subscribe = (event, cb) => {
  let cancelled = false;
  let handle = null;
  const ready = Celsius.addListener(event, cb).then((h) => {
    handle = h;
  });
  ready.catch(() => {});
  return () => {
    cancelled = true;
    if (handle) {
      handle.remove?.();
      return;
    }
    ready.then((h) => h?.remove?.()).catch(() => {});
    if (cancelled) return;
  };
};

export const onDownloadProgress = (cb) => subscribe('downloadProgress', cb);
export const onTaskState = (cb) => subscribe('taskState', cb);
export const onSelfUpdateEvent = (cb) => subscribe('updateState', cb);

export async function haptic(style = 'light') {
  try {
    if (style === 'medium') await Haptics.impact({ style: ImpactStyle.Medium });
    else if (style === 'heavy') await Haptics.impact({ style: ImpactStyle.Heavy });
    else await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

export async function exitApp() {
  await App.exitApp();
}

function sanitize(name) {
  return String(name || 'download.bin').replace(/[^A-Za-z0-9._-]/g, '_');
}
