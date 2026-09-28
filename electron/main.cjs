const { app, BrowserWindow, ipcMain, shell, dialog, protocol, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { JsonStore } = require('./lib/json-store.cjs');
const { downloadToFile, safeFileName } = require('./lib/downloader.cjs');
const { findInstalledExecutable } = require('./lib/resolve.cjs');
const { readProductVersion } = require('./lib/version.cjs');
const updater = require('./lib/updater.cjs');

const APP_ID = 'com.tear360.celsius';
const IS_DEV = Boolean(process.env.CELSIUS_DEV_SERVER);
const DEV_SERVER = process.env.CELSIUS_DEV_SERVER || 'http://localhost:5173';
const DIST = path.join(__dirname, '..', 'dist');

const KV = {
  installed: 'celsius.installed',
  settings: 'celsius.settings',
  customApps: 'celsius.customApps',
};

let store = null;
let mainWindow = null;
const tasks = new Map();
let manualSelfInstaller = null;
let manualSelfReady = false;

/* ---------------------------------------------------------------- utils */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const send = (channel, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
};

function downloadsDir() {
  const dir = path.join(app.getPath('downloads') || os.homedir(), 'Celsius');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extractDir(appId) {
  const dir = path.join(app.getPath('userData'), 'apps', appId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function expandZip(zipPath, destDir) {
  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      const ps = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
        ],
        { windowsHide: true },
      );
      ps.on('error', reject);
      ps.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Extraction echouee (${code})`))));
    });
    return destDir;
  }
  throw new Error('Extraction ZIP non geree sur cette plateforme');
}

/** Racines ou Windows installe des logiciels. */
function installRoots() {
  return [
    path.join(app.getPath('appData'), 'Programs'),
    process.env.LOCALAPPDATA,
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
  ].filter(Boolean);
}

function resolveInstalledExe(appName, knownPath) {
  return findInstalledExecutable(appName, installRoots(), knownPath);
}

/* ------------------------------------------------------------- protocol */

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname || '/');
    if (rel === '/' || rel === '') rel = '/index.html';
    const target = path.normalize(path.join(DIST, rel));
    if (!target.startsWith(DIST)) {
      return new Response('Interdit', { status: 403 });
    }
    const sendFile = async (file) => {
      const data = await fs.promises.readFile(file);
      return new Response(new Uint8Array(data), {
        headers: {
          'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'cache-control': file.includes(`${path.sep}assets${path.sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        },
      });
    };
    try {
      return await sendFile(target);
    } catch {
      try {
        return await sendFile(path.join(DIST, 'index.html'));
      } catch {
        return new Response(
          'Bundle Celsius introuvable. Executez "npm run build" puis relancez.',
          { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
        );
      }
    }
  });
}

/* --------------------------------------------------------------- window */

function createWindow() {
  const settings = store.get(KV.settings) || {};
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: '#070a16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL(DEV_SERVER);
  } else {
    mainWindow.loadURL('app://bundle/index.html');
  }

  mainWindow.once('ready-to-show', () => {
    if (settings.startMaximized) mainWindow.maximize();
    mainWindow.show();
    sendWindowState();
  });

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = IS_DEV ? DEV_SERVER : 'app://bundle/';
    if (!url.startsWith(allowed)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return mainWindow;
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  send('celsius:windowState', { maximized: mainWindow.isMaximized() });
}

/* ------------------------------------------------------------ downloads */

async function runTask(task) {
  const controller = new AbortController();
  task.controller = controller;
  const dest = path.join(downloadsDir(), safeFileName(task.assetName));
  try {
    const started = Date.now();
    let lastReceived = 0;
    let lastAt = started;
    await downloadToFile(
      task.url,
      dest,
      ({ received, total, percent }) => {
        const now = Date.now();
        const speed = now > lastAt ? (received - lastReceived) / ((now - lastAt) / 1000) : 0;
        lastReceived = received;
        lastAt = now;
        send('celsius:download', {
          taskId: task.id,
          received,
          total: total || task.size || 0,
          percent,
          speed,
        });
      },
      controller.signal,
    );

    send('celsius:task', { taskId: task.id, phase: 'downloaded', path: dest });

    let launchPath = dest;
    if (task.kind === 'portable') {
      send('celsius:task', { taskId: task.id, phase: 'installing' });
      const dir = extractDir(task.appId);
      await expandZip(dest, dir);
      launchPath = resolveInstalledExe(task.appName, null) || dest;
    } else if (task.kind === 'installer' && process.platform === 'win32') {
      send('celsius:task', { taskId: task.id, phase: 'installing' });
      const child = spawn(dest, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.unref();
      // On ne memorise PAS l'installateur comme etant l'application : le dossier
      // d'installation n'existe qu'une fois l'assistant termine. Le vrai chemin
      // sera recherche au moment du lancement (voir celsius:launch).
      launchPath = null;
    } else {
      shell.showItemInFolder(dest);
    }

    send('celsius:task', { taskId: task.id, phase: 'done', path: launchPath });
  } catch (err) {
    const message = err?.message || String(err);
    send('celsius:task', {
      taskId: task.id,
      phase: /Annul/.test(message) ? 'cancelled' : 'error',
      error: message,
    });
  } finally {
    tasks.delete(task.id);
  }
}

/* --------------------------------------------------------- self update */

const RELEASES_API = 'https://api.github.com/repos/tear360/Celsius-APP/releases/latest';

async function latestCelsiusRelease() {
  const res = await fetch(RELEASES_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Celsius-Store',
    },
  });
  if (!res.ok) {
    const err = new Error(`GitHub a repondu ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function pickSetupAsset(release) {
  const assets = release.assets || [];
  return (
    assets.find((a) => /Celsius-Setup-.*\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.exe$/i.test(a.name)) ||
    null
  );
}

async function manualSelfUpdate() {
  const release = await latestCelsiusRelease();
  const asset = pickSetupAsset(release);
  if (!asset) throw new Error('Aucun installeur Windows dans la release');
  const dest = path.join(app.getPath('temp'), 'Celsius', safeFileName(asset.name));
  const controller = new AbortController();
  await downloadToFile(
    asset.browser_download_url,
    dest,
    ({ received, total, percent }) =>
      send('celsius:selfupdate', { phase: 'download-progress', percent, transferred: received, total }),
    controller.signal,
  );
  manualSelfInstaller = dest;
  manualSelfReady = true;
  send('celsius:selfupdate', { phase: 'downloaded', version: release.tag_name });
}

/* ----------------------------------------------------------------- ipc */

const pickExecutable = (appName) =>
  dialog
    .showOpenDialog(mainWindow, {
      title: `Choisir l'executable de ${appName || "l'application"}`,
      properties: ['openFile'],
      filters: [{ name: 'Executable', extensions: ['exe', 'bat', 'cmd', 'lnk'] }],
    })
    .then((res) => (res.canceled || !res.filePaths[0] ? null : res.filePaths[0]));

function registerIpc() {
  ipcMain.handle('celsius:info', () => ({
    platform: 'windows',
    version: app.getVersion(),
    build: `${process.platform}-${process.arch}`,
    electron: process.versions.electron,
    packaged: app.isPackaged,
  }));

  ipcMain.handle('celsius:systemInfo', () => ({
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0]?.model || 'inconnu',
    cores: os.cpus().length,
    ram: Math.round(os.totalmem() / 1024 ** 3),
    arch: os.arch(),
    home: os.homedir(),
    node: process.versions.node,
  }));

  /* --------------------------------------- re-detection sur le disque --- */

  ipcMain.handle('celsius:stateInfo', () => ({
    path: store?.location || null,
    degraded: Boolean(store?.degraded),
  }));

  /**
   * Retrouve sur le disque les applications du catalogue deja installees.
   * Sert de filet de securite : si l'etat a ete perdu (desinstallation
   * manuelle, nettoyage, fichier remplace), la bibliotheque se reconstruit
   * sans obliger l'utilisateur a reinstaller quoi que ce soit.
   */
  ipcMain.handle('celsius:detectInstalled', async (_e, list) => {
    const roots = installRoots();
    const items = Array.isArray(list) ? list.slice(0, 100) : [];
    const found = [];
    for (const item of items) {
      if (!item?.name) continue;
      const exe = findInstalledExecutable(item.name, roots, null);
      if (!exe) continue;
      found.push({
        id: item.id,
        platform: 'windows',
        path: exe,
        version: await readProductVersion(exe),
      });
    }
    return found;
  });

  ipcMain.handle('celsius:kvGet', (_e, key) => store.get(key) ?? null);
  ipcMain.handle('celsius:kvSet', (_e, key, value) => store.set(key, value));
  ipcMain.handle('celsius:kvRemove', (_e, key) => store.remove(key));

  ipcMain.handle('celsius:install', async (_e, payload) => {
    const id = `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const task = {
      id,
      appId: payload.appId,
      appName: payload.appName,
      assetName: payload.asset.name,
      url: payload.asset.url,
      size: payload.asset.size,
      kind: payload.asset.kind,
    };
    tasks.set(id, task);
    send('celsius:task', { taskId: id, phase: 'queued' });
    setTimeout(() => runTask(task), 0);
    return { taskId: id };
  });

  ipcMain.handle('celsius:cancel', (_e, taskId) => {
    const task = tasks.get(taskId);
    if (task?.controller) task.controller.abort();
    tasks.delete(taskId);
    return true;
  });

  ipcMain.handle('celsius:launch', async (_e, payload) => {
    if (payload.platform === 'android') {
      throw new Error("Le lancement d'une app Android n'a pas de sens depuis Windows");
    }
    const appName = payload.appName || '';
    let target = resolveInstalledExe(appName, payload.executablePath);

    if (!target) {
      // Aucun binaire trouve : on laisse l'utilisateur designer lui-meme l'executable,
      // le chemin est ensuite memorise pour les lancements suivants.
      const picked = await pickExecutable(appName);
      if (!picked) return { cancelled: true };
      target = picked;
      return { path: target, picked: true };
    }
    const err = await shell.openPath(target);
    if (err) throw new Error(err);
    return { path: target };
  });

  ipcMain.handle('celsius:pickExecutable', (_e, appName) => pickExecutable(appName));

  ipcMain.handle('celsius:uninstall', async (_e, payload) => {
    if (payload.executablePath) {
      shell.showItemInFolder(payload.executablePath);
      return { revealed: true };
    }
    return { revealed: false };
  });

  ipcMain.handle('celsius:openExternal', async (_e, url) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('URL non autorisee');
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('celsius:revealPath', (_e, p) => {
    if (!p) return false;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) shell.openPath(p);
    else shell.showItemInFolder(p);
    return true;
  });

  ipcMain.handle('celsius:checkSelfUpdate', async (_e, opts = {}) => {
    const current = app.getVersion();
    const release = await latestCelsiusRelease().catch((err) => {
      if (err.status === 404) return null;
      throw err;
    });
    if (!release) {
      return { current, available: false, noRelease: true, version: null, notes: '', url: RELEASES_API };
    }
    const usable = opts.includePrereleases || !release.prerelease;
    const version = String(release.tag_name || '').replace(/^v/i, '');
    const asset = pickSetupAsset(release);
    const available = usable && updater.isNewer(version, current);
    return {
      current,
      available,
      version,
      tag: release.tag_name,
      notes: release.body || '',
      date: release.published_at,
      url: release.html_url,
      asset: asset
        ? { name: asset.name, size: asset.size, url: asset.browser_download_url }
        : null,
    };
  });

  ipcMain.handle('celsius:applySelfUpdate', async () => {
    if (app.isPackaged && updater.isReady()) {
      updater.quitAndInstall();
      return { quitting: true };
    }
    if (manualSelfReady) {
      const installer = manualSelfInstaller;
      manualSelfInstaller = null;
      manualSelfReady = false;
      const child = spawn(installer, ['/S'], { detached: true, stdio: 'ignore' });
      child.unref();
      setTimeout(() => app.quit(), 250);
      return { quitting: true };
    }
    if (app.isPackaged) {
      send('celsius:selfupdate', { phase: 'checking' });
      await updater.start({ download: true });
      return { downloading: true };
    }
    await manualSelfUpdate();
    return { downloading: true };
  });

  ipcMain.handle('celsius:startBackgroundUpdateCheck', () => {
    if (!app.isPackaged) return false;
    setTimeout(() => {
      updater.start().catch(() => {});
    }, 8000);
    return true;
  });

  ipcMain.handle('celsius:clipboardWrite', (_e, text) => {
    clipboard.writeText(String(text || ''));
    return true;
  });

  /* ------------------------------------------------- controles de fenetre */

  ipcMain.handle('celsius:window', (_e, action) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        return true;
      case 'maximize':
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
        return true;
      case 'close':
        // destroy() et non close() : on garantit la fermeture reelle de la fenetre
        // et la sortie du processus, sans dependre des handlers 'close'.
        mainWindow.destroy();
        return true;
      case 'state':
        return { maximized: mainWindow.isMaximized() };
      default:
        return false;
    }
  });
}

/* ------------------------------------------------------------ lifecycle */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    store = new JsonStore(path.join(app.getPath('userData'), 'celsius-state.json'), {
      [KV.installed]: {},
      [KV.settings]: {},
      [KV.customApps]: [],
    });

    registerAppProtocol();
    registerIpc();
    updater.init({
      onEvent: (evt) => {
        if (evt.phase === 'up-to-date') return;
        send('celsius:selfupdate', evt);
      },
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => {
    if (manualSelfInstaller && process.platform === 'win32') {
      try {
        const child = spawn(manualSelfInstaller, ['/S'], { detached: true, stdio: 'ignore' });
        child.unref();
      } catch {
        /* ignore */
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
