import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

// Set by main to allow the updater to notify the main window.
export let BrowserWindowRef: any = null;
export function setUpdaterWindowRef(ref: any) {
  BrowserWindowRef = ref;
}

function send(channel: string, payload?: any) {
  if (BrowserWindowRef && !BrowserWindowRef.isDestroyed()) {
    BrowserWindowRef.webContents.send(channel, payload);
  }
}

export function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    console.error('checkForUpdates error:', e);
  }
}

export function setupUpdaterIpc() {
  if (!autoUpdater.isUpdaterActive()) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {});

  autoUpdater.on('update-available', (info: any) => {
    const file = Array.isArray(info?.files) ? info.files.find((f: any) => f?.url) : null;
    send('update-available', {
      version: info?.version || '',
      releaseNotes: info?.releaseNotes || '',
      url: file?.url || '',
    });
  });

  autoUpdater.on('update-not-available', () => {});

  autoUpdater.on('download-progress', (progress) => {
    send('update-progress', Math.round(progress.percent || 0));
  });

  autoUpdater.on('update-downloaded', () => {
    send('update-downloaded');
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall();
      } catch (e) {
        console.error('quitAndInstall error:', e);
      }
    }, 1500);
  });

  autoUpdater.on('error', (err) => {
    send('update-error', err?.message || String(err));
  });

  ipcMain.on('start-update-download', () => {
    try {
      autoUpdater.downloadUpdate();
    } catch (e) {
      console.error('downloadUpdate error:', e);
    }
  });

  ipcMain.on('install-update', () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (e) {
      console.error('quitAndInstall error:', e);
    }
  });
}