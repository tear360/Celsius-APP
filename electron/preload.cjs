const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const listener = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('celsiusBridge', {
  info: () => ipcRenderer.invoke('celsius:info'),
  systemInfo: () => ipcRenderer.invoke('celsius:systemInfo'),
  stateInfo: () => ipcRenderer.invoke('celsius:stateInfo'),
  detectInstalled: (list) => ipcRenderer.invoke('celsius:detectInstalled', list),

  kvGet: (key) => ipcRenderer.invoke('celsius:kvGet', key),
  kvSet: (key, value) => ipcRenderer.invoke('celsius:kvSet', key, value),
  kvRemove: (key) => ipcRenderer.invoke('celsius:kvRemove', key),

  install: (payload) => ipcRenderer.invoke('celsius:install', payload),
  cancel: (taskId) => ipcRenderer.invoke('celsius:cancel', taskId),
  launch: (payload) => ipcRenderer.invoke('celsius:launch', payload),
  uninstall: (payload) => ipcRenderer.invoke('celsius:uninstall', payload),
  appStatus: (payload) => ipcRenderer.invoke('celsius:appStatus', payload),
  closeApp: (payload) => ipcRenderer.invoke('celsius:closeApp', payload),
  uninstallApp: (payload) => ipcRenderer.invoke('celsius:uninstallApp', payload),
  pickExecutable: (appName) => ipcRenderer.invoke('celsius:pickExecutable', appName),

  openExternal: (url) => ipcRenderer.invoke('celsius:openExternal', url),
  revealPath: (path) => ipcRenderer.invoke('celsius:revealPath', path),

  checkSelfUpdate: (opts) => ipcRenderer.invoke('celsius:checkSelfUpdate', opts),
  applySelfUpdate: (mode) => ipcRenderer.invoke('celsius:applySelfUpdate', mode),
  startBackgroundUpdateCheck: () => ipcRenderer.invoke('celsius:startBackgroundUpdateCheck'),

  clipboardWrite: (text) => ipcRenderer.invoke('celsius:clipboardWrite', text),

  windowAction: (action) => ipcRenderer.invoke('celsius:window', action),
  windowState: () => ipcRenderer.invoke('celsius:window', 'state'),

  onDownloadProgress: on('celsius:download'),
  onTaskState: on('celsius:task'),
  onSelfUpdateEvent: on('celsius:selfupdate'),
  onWindowState: on('celsius:windowState'),
});
