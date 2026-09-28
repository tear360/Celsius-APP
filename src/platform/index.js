// Selecteur de bridge : Electron sur Windows, Capacitor sur Android.
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';

let mod;
if (native && isAndroid) {
  mod = await import('./android.js');
} else {
  mod = await import('./electron.js');
}

export const platform = mod.platform;
export const isDesktop = mod.isDesktop;
export const isAndroidPlatform = mod.platform === 'android';
export const info = mod.info;
export const kvGet = mod.kvGet;
export const kvSet = mod.kvSet;
export const kvRemove = mod.kvRemove;
export const install = mod.install;
export const cancel = mod.cancel;
export const launch = mod.launch;
export const uninstall = mod.uninstall;
export const pickExecutable = mod.pickExecutable;
export const openExternal = mod.openExternal;
export const revealPath = mod.revealPath;
export const systemInfo = mod.systemInfo;
export const checkSelfUpdate = mod.checkSelfUpdate;
export const applySelfUpdate = mod.applySelfUpdate;
export const startBackgroundUpdateCheck = mod.startBackgroundUpdateCheck;
export const onDownloadProgress = mod.onDownloadProgress;
export const onTaskState = mod.onTaskState;
export const onSelfUpdateEvent = mod.onSelfUpdateEvent;
export const haptic = mod.haptic;
export const setupNative = mod.setupNative ?? (async () => {});
export const isPackageInstalled = mod.isPackageInstalled ?? (async () => false);
export const installedVersionOf = mod.installedVersionOf ?? (async () => null);
export const openInstallSettings = mod.openInstallSettings ?? (async () => {});
export const exitApp = mod.exitApp ?? (async () => {});
