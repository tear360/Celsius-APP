const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const listener = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('celsiusBridge', {
  info: () => ipcRenderer.invoke('celsius:info'),
  systemInfo: () => ipcRenderer.invoke('celsius:systemInfo'),

  kvGet: (key) => ipcRenderer.invoke('celsius:kvGet', key),
  kvSet: (key, value) => ipcRenderer.invoke('celsius:kvSet', key, value),
  kvRemove: (key) => ipcRenderer.invoke('celsius:kvRemove', key),

  install: (payload) => ipcRenderer.invoke('celsius:install', payload),
  cancel: (taskId) => ipcRenderer.invoke('celsius:cancel', taskId),
  launch: (payload) => ipcRenderer.invoke('celsius:launch', payload),
  uninstall: (payload) => ipcRenderer.invoke('celsius:uninstall', payload),
  pickExecutable: (appName) => ipcRenderer.invoke('celsius:pickExecutable', appName),

  openExternal: (url) => ipcRenderer.invoke('celsius:openExternal', url),
  revealPath: (path) => ipcRenderer.invoke('celsius:revealPath', path),

  checkSelfUpdate: (opts) => ipcRenderer.invoke('celsius:checkSelfUpdate', opts),
  applySelfUpdate: (mode) => ipcRenderer.invoke('celsius:applySelfUpdate', mode),
  startBackgroundUpdateCheck: () => ipcRenderer.invoke('celsius:startBackgroundUpdateCheck'),

  clipboardWrite: (text) => ipcRenderer.invoke('celsius:clipboardWrite', text),

  onDownloadProgress: on('celsius:download'),
  onTaskState: on('celsius:task'),
  onSelfUpdateEvent: on('celsius:selfupdate'),
});
