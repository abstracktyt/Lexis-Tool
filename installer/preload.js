// @ts-nocheck
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installer', {
  getInfo: () => ipcRenderer.invoke('get-info'),
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  install: (dir) => ipcRenderer.invoke('install', dir),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, p) => cb(p)),
  openUrl: (url) => ipcRenderer.send('open-url', url),
  launch: (dir) => ipcRenderer.send('launch-app', dir),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close')
});