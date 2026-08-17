import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import fs from 'fs';
import path from 'path';

export const AUTH_SUCCESS_CHANNEL = 'auth-success';
const tokenFile = path.join(app.getPath('userData'), 'auth-token.bin');

export function saveAuthToken(token: string): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) return;
    fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
    fs.writeFileSync(tokenFile, safeStorage.encryptString(token));
  } catch (e) {
    console.error('Failed to save auth token:', e);
  }
}

export function getAuthToken(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(tokenFile)) return null;
    return safeStorage.decryptString(fs.readFileSync(tokenFile));
  } catch (e) {
    console.error('Failed to read auth token:', e);
    return null;
  }
}

export function clearAuthToken(): void {
  try {
    if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
  } catch (e) {
    console.error('Failed to clear auth token:', e);
  }
}

// Extract the token from a lexis:// callback URL.
export function extractAuthToken(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.searchParams.get('token');
  } catch (e) {
    return null;
  }
}

export function openAuthWindow(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      resolve(token);
    };
    const authWindow = new BrowserWindow({
      width: 500,
      height: 750,
      show: false,
      title: 'Авторизация Discord',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    authWindow.loadURL('https://d6b463b1-1a63-443e-9cb2-071f448668c6-00-3r861pz7cllyr.worf.replit.dev/auth/discord-desktop').catch((error) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Не удалось открыть страницу авторизации: ${error.message}`));
      }
    });

    authWindow.once('ready-to-show', () => authWindow.show());

    const checkUrl = (url: string) => {
      if (url.includes('/auth/success')) {
        try {
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token');
          if (token && !settled) {
            finish(token);
            setTimeout(() => {
              if (!authWindow.isDestroyed()) authWindow.close();
            }, 100);
          }
        } catch (e) {
          console.error('Error parsing auth URL', e);
        }
      } else if (url.startsWith('http://localhost:3000/auth/callback') || url.startsWith('http://127.0.0.1:3000/auth/callback')) {
        const newUrl = url.replace(/http:\/\/(localhost|127\.0\.0\.1):3000/, 'https://d6b463b1-1a63-443e-9cb2-071f448668c6-00-3r861pz7cllyr.worf.replit.dev');
        authWindow.loadURL(newUrl);
      }
    };

    authWindow.webContents.on('will-navigate', (event, url) => checkUrl(url));
    authWindow.webContents.on('will-redirect', (event, url) => checkUrl(url));
    authWindow.webContents.on('did-navigate', (event, url) => checkUrl(url));
    authWindow.webContents.on('did-redirect-navigation', (event, url) => checkUrl(url));

    authWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || settled || errorCode === -3) return;
      settled = true;
      reject(new Error(`Не удалось загрузить страницу авторизации (${errorDescription}).`));
      if (!authWindow.isDestroyed()) authWindow.close();
    });

    authWindow.on('closed', () => {
      // Closing the window after a successful callback must not turn success into
      // an IPC error. A user cancellation is a normal outcome as well.
      finish(null);
    });
  });
}

export function setupAuthIpc() {
  ipcMain.handle('start-discord-auth', () => openAuthWindow());
  ipcMain.handle('get-auth-token', () => getAuthToken());
  ipcMain.on('save-auth-token', (_e, token: string) => saveAuthToken(String(token || '')));
  ipcMain.on('clear-auth-token', () => clearAuthToken());

  ipcMain.on('start-auth', () => {
    shell.openExternal('https://discord.com/oauth2/authorize?client_id=740977042979422350&response_type=code&redirect_uri=https%3A%2F%2Fd6b463b1-1a63-443e-9cb2-071f448668c6-00-3r861pz7cllyr.worf.replit.dev%2F&scope=identify');
  });
}
