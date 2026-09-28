const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

const isNewer = (a, b) => {
  const parse = (v) => {
    const m = String(v || '')
      .trim()
      .replace(/^v/i, '')
      .match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    return m ? [Number(m[1] || 0), Number(m[2] || 0), Number(m[3] || 0)] : null;
  };
  const va = parse(a);
  const vb = parse(b);
  if (!va || !vb) return false;
  for (let i = 0; i < 3; i += 1) {
    if (va[i] !== vb[i]) return va[i] > vb[i];
  }
  return false;
};

const supported = () => app.isPackaged;

let ready = false;
let downloadedVersion = null;

function init({ onEvent }) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = null;

  autoUpdater.on('error', (err) => onEvent({ phase: 'error', error: err?.message || String(err) }));
  autoUpdater.on('update-available', (info) =>
    onEvent({ phase: 'available', version: info?.version }),
  );
  autoUpdater.on('update-not-available', () => {
    autoUpdater.autoDownload = false;
    onEvent({ phase: 'up-to-date' });
  });
  autoUpdater.on('download-progress', (p) =>
    onEvent({ phase: 'download-progress', percent: p.percent, transferred: p.transferred }),
  );
  autoUpdater.on('update-downloaded', (info) => {
    ready = true;
    downloadedVersion = info?.version || null;
    autoUpdater.autoDownload = false;
    onEvent({ phase: 'downloaded', version: downloadedVersion });
  });
}

/**
 * Verifie la presence d'une mise a jour.
 * download=false : simple controle (utilise au demarrage, ne telecharge rien).
 * download=true  : telecharge immediatement (action explicite de l'utilisateur).
 */
async function start({ download = false } = {}) {
  if (!supported()) return { skipped: true };
  autoUpdater.autoDownload = Boolean(download);
  try {
    return await autoUpdater.checkForUpdates();
  } catch (err) {
    autoUpdater.autoDownload = false;
    throw err;
  }
}

function quitAndInstall() {
  // (isSilent, isForceRunAfter) : sans /S l'assistant NSIS s'ouvre a chaque
  // mise a jour, ce qui donne l'impression d'une reinstalle a l'utilisateur.
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
}

const isReady = () => ready && supported();
const getDownloaded = () => downloadedVersion;

module.exports = {
  init,
  start,
  quitAndInstall,
  isReady,
  supported,
  isNewer,
  getDownloaded,
};
