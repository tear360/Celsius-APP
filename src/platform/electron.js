/**
 * Bridge Electron. Toutes les methodes exposures par electron/preload.cjs
 * sur window.celsiusBridge. En mode dev (serveur Vite) le bridge existe aussi,
 * les chemins sont resolus par le process principal.
 */
const bridge = typeof window !== 'undefined' ? window.celsiusBridge : null;

function required() {
  if (!bridge) {
    throw new Error(
      "Celsius doit tourner dans l'application Electron (pas dans un navigateur).",
    );
  }
  return bridge;
}

const noopUnsubscribe = () => {};

export const platform = 'windows';

export const isDesktop = true;

export const info = () => required().info();

export const kvGet = (key) => required().kvGet(key);
export const kvSet = (key, value) => required().kvSet(key, value);
export const kvRemove = (key) => required().kvRemove(key);

export const install = (payload) => required().install(payload);
export const cancel = (taskId) => required().cancel(taskId);
export const launch = (payload) => required().launch(payload);
export const uninstall = (payload) => required().uninstall(payload);
export const pickExecutable = (appName) => required().pickExecutable(appName);
export const openExternal = (url) => required().openExternal(url);
export const revealPath = (path) => required().revealPath(path);
export const systemInfo = () => required().systemInfo();

export const checkSelfUpdate = (opts) => required().checkSelfUpdate(opts);
export const applySelfUpdate = (mode) => required().applySelfUpdate(mode);
export const startBackgroundUpdateCheck = () => required().startBackgroundUpdateCheck();

export const onDownloadProgress = (cb) => bridge?.onDownloadProgress(cb) ?? noopUnsubscribe;
export const onTaskState = (cb) => bridge?.onTaskState(cb) ?? noopUnsubscribe;
export const onSelfUpdateEvent = (cb) => bridge?.onSelfUpdateEvent(cb) ?? noopUnsubscribe;

export const haptic = async () => {
  /* pas de haptique sur Windows */
};
