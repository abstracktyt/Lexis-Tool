import { app, BrowserWindow, ipcMain, globalShortcut, clipboard, session, Tray, Menu, nativeImage, Notification, shell, dialog } from 'electron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { win, createWindow, createOverlayWindow, createEventsOverlayWindow, createOnlineOverlayWindow, createPinnedWindow, createBinderWindow, createDetailWindow, createPunishModalWindow, createNotificationWindow, showGameNotification } from './windows';
import { sanitizeHotkey } from './keys';
import { setupDiscordRPC, updateDiscordRPC } from './rpc';
import { setupAuthIpc, extractAuthToken, AUTH_SUCCESS_CHANNEL } from './auth';
import { checkForUpdates, setupUpdaterIpc, setUpdaterWindowRef } from './updater';
import { setAppAuthorized, syncBinderState, syncBinderSettings, unregisterBinderShortcuts, startProcessPoller, stopBinderPollers } from './binder';

let tray: Tray | null = null;
let isOverlayVisible = false;
let overlayPinned = false;
let currentOverlayAccelerator = 'Alt+O';
let isEventsOverlayVisible = false;
let currentEventsAccelerator = 'Alt+E';
let currentOnlineAccelerator = 'Alt+U';

process.on('uncaughtException', (err) => {
  console.error('\n\n[FATAL DEBUG] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n\n[FATAL DEBUG] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.setName('Lexis Tools');
const userDataDir = path.join(app.getPath('appData'), app.isPackaged ? 'Lexis Tools' : 'Lexis Tools Dev');
app.setPath('userData', userDataDir);
fs.mkdirSync(app.getPath('userData'), { recursive: true });

// Custom Protocol Registration
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('lexis', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('lexis');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win.main) {
      if (win.main.isDestroyed()) {
        createWindow();
      } else {
        if (win.main.isMinimized()) win.main.restore();
        win.main.show();
        win.main.focus();
      }
    } else {
      createWindow();
    }
    const urlStr = commandLine.find(arg => arg.includes('lexis://'));
    if (urlStr) {
      const token = extractAuthToken(urlStr);
      if (token && win.main && !win.main.isDestroyed()) {
        win.main.webContents.send(AUTH_SUCCESS_CHANNEL, token);
      }
    }
  });
}

function ensurePinnedWindow() {
  if (!win.pinned || win.pinned.isDestroyed()) createPinnedWindow();
  return win.pinned;
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, '../dist/icon.png')
    : path.join(process.env.VITE_PUBLIC || path.join(__dirname, '../public'), 'icon.png');

  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    const fallbackPath = path.join(__dirname, '../public/icon.png');
    icon = nativeImage.createFromPath(fallbackPath);
  }
  icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Lexis Tools',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Показать главное окно',
      click: () => {
        if (win.main) {
          if (win.main.isDestroyed()) createWindow();
          else {
            win.main.show();
            win.main.focus();
          }
        } else createWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Закрыть приложение',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Lexis Tools');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (win.main) {
      if (win.main.isDestroyed()) createWindow();
      else {
        win.main.show();
        win.main.focus();
      }
    } else createWindow();
  });
}

function togglePinnedInteractivity(interactive: boolean) {
  if (win.pinned && !win.pinned.isDestroyed()) {
    if (interactive) {
      win.pinned.show();
      win.pinned.setIgnoreMouseEvents(false);
      win.pinned.setFocusable(true);
    } else {
      if (!win.isPinnedWindowPinned) {
        win.pinned.hide();
      } else {
        win.pinned.setIgnoreMouseEvents(true);
        win.pinned.setFocusable(false);
      }
    }
    win.pinned.webContents.send('overlay-active', interactive);
  }
  applyPinnedOpacity();
  if (win.binder && !win.binder.isDestroyed()) {
    if (currentSettingsBinderEnabled()) {
      win.binder.show();
      if (interactive) {
        win.binder.setIgnoreMouseEvents(false);
        win.binder.setFocusable(true);
      } else {
        win.binder.setIgnoreMouseEvents(true);
        win.binder.setFocusable(false);
      }
    } else {
      win.binder.hide();
    }
  }
}

function pinnedOpacity() {
  return currentOverlayOpacity() * 0.6;
}

function applyPinnedOpacity() {
  const pin = overlayPinned || win.isPinnedWindowPinned;
  const op = pin ? pinnedOpacity() : currentOverlayOpacity();
  if (win.overlay && !win.overlay.isDestroyed()) win.overlay.setOpacity(op);
  if (win.pinned && !win.pinned.isDestroyed()) win.pinned.setOpacity(op);
}

// Binder enable state is tracked via IPC in sync-settings; keep a local mirror.
let binderEnabled = true;
function currentSettingsBinderEnabled() {
  return binderEnabled !== false;
}

function registerOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentOverlayAccelerator);
    if (!sanitized) return;
    if (globalShortcut.isRegistered(sanitized)) globalShortcut.unregister(sanitized);
    const ok = globalShortcut.register(sanitized, () => {
      if (isOverlayVisible) {
        // Pinned overlay stays on screen — the hotkey does not hide it.
        if (overlayPinned) return;
        isOverlayVisible = false;
        if (win.overlay && !win.overlay.isDestroyed()) win.overlay.hide();
        togglePinnedInteractivity(false);
        if (win.detail && !win.detail.isDestroyed()) {
          win.detail.close();
          win.detail = null;
          win.currentDetailRuleId = null;
        }
      } else {
        const overlay = ensureOverlay();
        overlay.show();
        overlay.setOpacity(currentOverlayOpacity());
        overlay.setIgnoreMouseEvents(false);
        overlay.focus();

        if (win.binder && !win.binder.isDestroyed() && binderEnabled !== false) {
          win.binder.show();
          win.binder.setOpacity(currentOverlayOpacity());
        }

        isOverlayVisible = true;
        togglePinnedInteractivity(true);
      }
    });
    if (!ok) console.error(`[hotkey] overlay shortcut "${sanitized}" failed to register`);
  } catch (e) {
    console.error('[hotkey] registerOverlay error', e);
  }
}

let overlayOpacityValue = 0.9;
function currentOverlayOpacity() {
  return overlayOpacityValue;
}
function ensureOverlay() {
  if (!win.overlay || win.overlay.isDestroyed()) createOverlayWindow();
  return win.overlay!;
}

function unregisterOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentOverlayAccelerator);
    globalShortcut.unregister(sanitized);
  } catch (e) {}
}

function registerEventsOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentEventsAccelerator);
    if (!sanitized) return;
    if (globalShortcut.isRegistered(sanitized)) globalShortcut.unregister(sanitized);
    const ok = globalShortcut.register(sanitized, () => {
      if (isEventsOverlayVisible) {
        isEventsOverlayVisible = false;
        if (win.eventsOverlay && !win.eventsOverlay.isDestroyed()) win.eventsOverlay.hide();
      } else {
        if (!win.eventsOverlay || win.eventsOverlay.isDestroyed()) createEventsOverlayWindow();
        if (win.eventsOverlay && !win.eventsOverlay.isDestroyed()) {
          win.eventsOverlay.show();
          win.eventsOverlay.setOpacity(currentOverlayOpacity());
          win.eventsOverlay.setIgnoreMouseEvents(false);
          win.eventsOverlay.focus();
        }
        isEventsOverlayVisible = true;
      }
    });
    if (!ok) console.error(`[hotkey] events shortcut "${sanitized}" failed to register`);
  } catch (e) {
    console.error('[hotkey] registerEventsOverlay error', e);
  }
}

function unregisterEventsOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentEventsAccelerator);
    globalShortcut.unregister(sanitized);
  } catch (e) {}
}

function registerOnlineOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentOnlineAccelerator);
    if (!sanitized) return;
    if (globalShortcut.isRegistered(sanitized)) globalShortcut.unregister(sanitized);
    const ok = globalShortcut.register(sanitized, () => {
      if (!win.onlineOverlay || win.onlineOverlay.isDestroyed()) createOnlineOverlayWindow();
      if (!win.onlineOverlay) return;
      if (win.onlineOverlay.isVisible()) {
        win.onlineOverlay.hide();
      } else {
        // Click-through overlay: mouse events pass to the game (no cursor/steal on turn).
        win.onlineOverlay.setIgnoreMouseEvents(true);
        win.onlineOverlay.setFocusable(false);
        win.onlineOverlay.show();
      }
    });
    if (!ok) console.error(`[hotkey] online overlay shortcut "${sanitized}" failed to register`);
  } catch (e) {
    console.error('[hotkey] registerOnlineOverlay error', e);
  }
}

function unregisterOnlineOverlay() {
  try {
    const sanitized = sanitizeHotkey(currentOnlineAccelerator);
    if (sanitized) globalShortcut.unregister(sanitized);
  } catch (e) {}
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.lexistools.app');
  setupDiscordRPC();

  // Custom installer uninstall flow: invoked with --uninstall.
  if (process.argv.includes('--uninstall')) {
    try {
      const installDir = path.dirname(process.execPath);
      const cmd =
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "' +
        'Remove-Item -Path \'$env:USERPROFILE\\Desktop\\Lexis Tools.lnk\' -Force -ErrorAction SilentlyContinue;' +
        'Remove-Item -Path \'$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Lexis Tools.lnk\' -Force -ErrorAction SilentlyContinue;' +
        'Remove-Item -Path \'HKCU:\\Software\\Classes\\lexis\' -Recurse -Force -ErrorAction SilentlyContinue;' +
        'Remove-Item -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LexisTools\' -Recurse -Force -ErrorAction SilentlyContinue;' +
        'Start-Sleep -Milliseconds 400;' +
        'Remove-Item -Path \'' + installDir.replace(/'/g, "''") + '\' -Recurse -Force -ErrorAction SilentlyContinue;"';
      exec(cmd, { windowsHide: true });
    } catch (e) {
      console.error('uninstall error', e);
    }
    setTimeout(() => app.exit(0), 3500);
  }

  // Allow microphone access for the overlay windows
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true); else callback(false);
  });

  // Spoof Chrome User-Agent
  const defaultUserAgent = session.defaultSession.getUserAgent();
  const chromeUserAgent = defaultUserAgent.replace(/Electron\/[0-9\.]+ /, '').replace(/Lexis-Tools\/[0-9\.]+ /, '');
  session.defaultSession.setUserAgent(chromeUserAgent);

  createWindow();
  createOverlayWindow();
  createEventsOverlayWindow();
  createOnlineOverlayWindow();
  createNotificationWindow();
  ensurePinnedWindow();
  createBinderWindow();

  // Keep toggle flags in sync with actual window visibility.
  if (win.overlay) {
    win.overlay.on('show', () => { isOverlayVisible = true; });
    win.overlay.on('hide', () => { isOverlayVisible = false; });
  }
  if (win.eventsOverlay) {
    win.eventsOverlay.on('show', () => { isEventsOverlayVisible = true; });
    win.eventsOverlay.on('hide', () => { isEventsOverlayVisible = false; });
  }

  win.main?.on('maximize', broadcastMaximizeState);
  win.main?.on('unmaximize', broadcastMaximizeState);

  createTray();

  const coldUrl = process.argv.find(arg => arg.includes('lexis://'));
  if (coldUrl) {
    setTimeout(() => {
      const token = extractAuthToken(coldUrl);
      if (token && win.main && !win.main.isDestroyed()) {
        win.main.webContents.send(AUTH_SUCCESS_CHANNEL, token);
      }
    }, 1500);
  }

  startProcessPoller();

  setUpdaterWindowRef(win.main);
  checkForUpdates();

  registerOverlay();
  registerOnlineOverlay();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('[DEBUG] window-all-closed fired. Platform:', process.platform);
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  console.log('[DEBUG] app.will-quit fired.');
  globalShortcut.unregisterAll();
  stopBinderPollers();
});

// ---------- IPC ----------

ipcMain.on('window-min', () => {
  if (win.main && !win.main.isDestroyed()) win.main.minimize();
});

ipcMain.on('window-max', () => {
  if (win.main && !win.main.isDestroyed()) {
    if (win.main.isMaximized()) win.main.unmaximize();
    else win.main.maximize();
  }
});

ipcMain.handle('is-maximized', () => {
  return !!(win.main && !win.main.isDestroyed() && win.main.isMaximized());
});

function broadcastMaximizeState() {
  const max = !!(win.main && !win.main.isDestroyed() && win.main.isMaximized());
  if (win.main && !win.main.isDestroyed()) win.main.webContents.send('window-maximized', max);
}

ipcMain.on('window-close', () => {
  if (win.main && !win.main.isDestroyed()) win.main.hide();
});

ipcMain.on('set-authorized', (event, payload) => {
  const status = typeof payload === 'object' ? payload.status : payload;
  setAppAuthorized(!!status);

  if (status && typeof payload === 'object') {
    updateDiscordRPC(`Роль: ${payload.role}`, 'Lexis Tools | Главное меню');
  } else {
    updateDiscordRPC('Не выполнен вход', 'Ожидание авторизации');
  }
});

ipcMain.on('sync-rules', (event, data) => {
  if (win.overlay && !win.overlay.isDestroyed()) win.overlay.webContents.send('sync-rules', data);
  if (win.pinned && !win.pinned.isDestroyed()) win.pinned.webContents.send('sync-rules', data);
  if (win.detail && !win.detail.isDestroyed()) win.detail.webContents.send('sync-rules', data);
  if (win.binder && !win.binder.isDestroyed()) win.binder.webContents.send('sync-rules', data);
});

ipcMain.on('sync-binds', (event, data) => {
  syncBinderState(data || [], currentSettingsRef());
});

ipcMain.on('sync-events', (event, data) => {
  if (win.eventsOverlay && !win.eventsOverlay.isDestroyed()) win.eventsOverlay.webContents.send('sync-events', data);
});

ipcMain.on('sync-settings', (event, data) => {
  const settings = data || {};
  syncedSettingsRef = settings;
  binderEnabled = settings.binder_enabled !== false;
  overlayOpacityValue = settings.overlayOpacity !== undefined ? settings.overlayOpacity : 0.9;
  syncBinderSettings(settings);

  if (win.binder && !win.binder.isDestroyed()) {
    win.binder.setIgnoreMouseEvents(!isOverlayVisible);
    win.binder.setFocusable(isOverlayVisible);
    win.binder.setOpacity(overlayOpacityValue);
    if (!binderEnabled) win.binder.hide();
  }

  if (win.eventsOverlay && !win.eventsOverlay.isDestroyed()) {
    win.eventsOverlay.setOpacity(overlayOpacityValue);
    if (!isEventsOverlayVisible) win.eventsOverlay.setIgnoreMouseEvents(true);
  }

  if (win.overlay && !win.overlay.isDestroyed()) win.overlay.webContents.send('sync-settings', data);
  if (win.pinned && !win.pinned.isDestroyed()) win.pinned.webContents.send('sync-settings', data);
  if (win.binder && !win.binder.isDestroyed()) win.binder.webContents.send('sync-settings', data);
  if (win.eventsOverlay && !win.eventsOverlay.isDestroyed()) win.eventsOverlay.webContents.send('sync-settings', data);
});

let syncedSettingsRef: any = {};
function currentSettingsRef() {
  return syncedSettingsRef;
}

ipcMain.on('unpin-rule', (event, ruleId) => {
  if (win.main && !win.main.isDestroyed()) win.main.webContents.send('unpin-rule', ruleId);
  if (win.overlay && !win.overlay.isDestroyed()) win.overlay.webContents.send('unpin-rule', ruleId);
  if (win.pinned && !win.pinned.isDestroyed()) win.pinned.webContents.send('unpin-rule', ruleId);
});

ipcMain.on('pin-rule', (event, ruleId) => {
  if (win.main && !win.main.isDestroyed()) win.main.webContents.send('pin-rule', ruleId);
  if (win.overlay && !win.overlay.isDestroyed()) win.overlay.webContents.send('pin-rule', ruleId);
  if (win.pinned && !win.pinned.isDestroyed()) win.pinned.webContents.send('pin-rule', ruleId);
});

ipcMain.handle('get-processes', async () => {
  return new Promise((resolve) => {
    // Do not filter by MainWindowTitle: game clients such as RAGE MP can run
    // without their own visible window while GTA5.exe owns the foreground one.
    exec('powershell -NoProfile -Command "Get-Process | Select-Object -ExpandProperty Name"', (err, stdout) => {
      if (err) return resolve([]);
      const processes = stdout.split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(name => name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`);
      resolve([...new Set(processes)].sort());
    });
  });
});

// Open detail window from overlay or pinned window
ipcMain.on('open-detail', (event, { rule, isPinned, searchQuery }) => {
  if (win.currentDetailRuleId === rule.id && win.detail && !win.detail.isDestroyed() && win.detail.isVisible()) {
    win.detail.hide();
    win.currentDetailRuleId = null;
    return;
  }
  win.currentDetailRuleId = rule.id;

  const sourceWin = BrowserWindow.fromWebContents(event.sender);
  if (!sourceWin) return;
  const [x, y] = sourceWin.getPosition();
  const [w, h] = sourceWin.getSize();
  createDetailWindow(rule, { x, y, width: w, height: h }, isPinned, searchQuery);
});

ipcMain.on('close-detail', () => {
  if (win.detail && !win.detail.isDestroyed()) {
    win.detail.hide();
    win.currentDetailRuleId = null;
  }
});

// Punish Modal IPC
ipcMain.on('open-punish-modal', (event, { rule, staticId, categoryName }) => {
  createPunishModalWindow(rule, staticId, categoryName);
});

ipcMain.on('close-punish-modal', () => {
  if (win.punishModal && !win.punishModal.isDestroyed()) {
    win.punishModal.hide();
  }
});

ipcMain.on('resize-punish-modal', (event, { width, height }) => {
  if (win.punishModal && !win.punishModal.isDestroyed()) {
    win.punishModal.setSize(Math.round(width), Math.round(height));
  }
});

// Relay punishment notifications from the punish modal window to the main window
ipcMain.on('punish-issued', (event, payload) => {
  showGameNotification(
    'Наказание выдано',
    `${payload?.type || 'Наказание'}${payload?.id ? ` для ${payload.id}` : ''}${payload?.isOffline ? ' (оффлайн)' : ''}`,
  );
});

ipcMain.handle('get-overlay-state', () => isOverlayVisible);

ipcMain.on('resize-overlay', (event, { width, height }) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  if (w) w.setSize(Math.max(250, Math.round(width)), Math.max(200, Math.round(height)));
});

// Pin the overlay: keep it on screen & click-through (the hotkey no longer hides it).
ipcMain.on('toggle-overlay-pin', (event, pinned?: boolean) => {
  overlayPinned = typeof pinned === 'boolean' ? pinned : !overlayPinned;
  const overlay = ensureOverlay();
  if (overlayPinned) {
    overlay.show();
    // Pinned overlay is click-through — mouse passes to the game.
    overlay.setIgnoreMouseEvents(true);
    overlay.setFocusable(false);
    isOverlayVisible = true;
    togglePinnedInteractivity(true);
  } else {
    overlay.setIgnoreMouseEvents(false);
    overlay.setFocusable(true);
    if (!isOverlayVisible) {
      overlay.hide();
    }
  }
  applyPinnedOpacity();
  overlay.webContents.send('overlay-pin-state', overlayPinned);
});

// Compact mode: collapse the overlay to a slim bar so it does not cover the game.
let overlayLastSize: { width: number; height: number } = { width: 420, height: 680 };
ipcMain.on('set-overlay-compact', (event, compact: boolean) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  if (!w) return;
  if (compact) {
    const bounds = w.getBounds();
    overlayLastSize = { width: bounds.width, height: bounds.height };
    w.setSize(300, 44);
  } else {
    w.setSize(overlayLastSize.width, overlayLastSize.height);
  }
});

ipcMain.on('copy-to-clipboard', (event, text: string) => {
  clipboard.writeText(text);
});

// Online member overlay (Discord-like member list).
ipcMain.on('toggle-online-overlay', (event, visible?: boolean) => {
  if (!win.onlineOverlay || win.onlineOverlay.isDestroyed()) createOnlineOverlayWindow();
  if (!win.onlineOverlay) return;
  const show = typeof visible === 'boolean' ? visible : !win.onlineOverlay.isVisible();
  if (show) {
    // Click-through overlay: mouse events pass to the game (no cursor/steal on turn).
    win.onlineOverlay.setIgnoreMouseEvents(true);
    win.onlineOverlay.setFocusable(false);
    win.onlineOverlay.show();
  } else {
    win.onlineOverlay.hide();
  }
});

// Show a game notification (top of the screen) with sound.
ipcMain.on('notify-game', (_event, { title, body }: { title?: string; body?: string }) => {
  if (title) showGameNotification(title, body || '');
});

// Toggle the binder on/off and notify about the activation state.
ipcMain.on('set-binder-enabled', (_event, enabled: boolean) => {
  binderEnabled = !!enabled;
  showGameNotification(enabled ? 'Биндер включён' : 'Биндер выключен', enabled ? 'Готово к использованию' : 'Макросы приостановлены');
});

// Open an external link in the system browser.
ipcMain.on('open-external', (_event, url: string) => {
  if (url && /^https?:/i.test(url)) shell.openExternal(url);
});

// Pick an image file and return it as a data URL (png/jpg/gif/webp).
ipcMain.handle('pick-image', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Выберите изображение',
    properties: ['openFile'],
    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  try {
    const filePath = res.filePaths[0];
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/gif';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e) {
    console.error('[pick-image] error', e);
    return null;
  }
});

ipcMain.on('toggle-pinned-window', (event, state: boolean) => {
  win.isPinnedWindowPinned = state;
  const pinned = ensurePinnedWindow();
  if (!pinned) return;
  if (!isOverlayVisible) {
    if (state) {
      pinned.show();
      pinned.setIgnoreMouseEvents(true);
      pinned.setFocusable(false);
    } else {
      pinned.hide();
    }
  }
  applyPinnedOpacity();
});

ipcMain.on('update-hotkeys', (event, { overlay, events, online }) => {
  const isValidHotkey = (key: string) => key && key !== 'None' && key.trim() !== '' && !key.trim().endsWith('+');

  if (isValidHotkey(overlay)) {
    unregisterOverlay();
    currentOverlayAccelerator = overlay;
    registerOverlay();
  }
  if (isValidHotkey(events)) {
    unregisterEventsOverlay();
    currentEventsAccelerator = events;
    registerEventsOverlay();
  }
  if (isValidHotkey(online)) {
    unregisterOnlineOverlay();
    currentOnlineAccelerator = online;
    registerOnlineOverlay();
  }
});

async function returnFocusToGame(): Promise<boolean> {
  // RAGE MP draws the actual game window through GTA5.exe.  The additional
  // RAGE process names cover clients that do expose their own game window.
  const psCode = `
$source = @'
using System;
using System.Runtime.InteropServices;
public static class GameWindowFocus {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attachThread, uint attachToThread, bool attach);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr hWnd);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
}
'@
Add-Type -TypeDefinition $source -ErrorAction Stop
$gameNames = @('gta5', 'ragemp', 'ragemp_v', 'ragemp-launcher', 'ragemp_client')
$target = [IntPtr]::Zero
$callback = [GameWindowFocus+EnumWindowsProc] {
  param([IntPtr]$hWnd, [IntPtr]$lParam)
  if (-not [GameWindowFocus]::IsWindowVisible($hWnd)) { return $true }
  [uint32]$pid = 0
  [GameWindowFocus]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null
  $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($process -and $gameNames -contains $process.Name.ToLowerInvariant()) {
    $script:target = $hWnd
    return $false
  }
  return $true
}
[GameWindowFocus]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
if ($target -ne [IntPtr]::Zero) {
  $foreground = [GameWindowFocus]::GetForegroundWindow()
  [uint32]$foregroundPid = 0
  [uint32]$targetPid = 0
  $foregroundThread = if ($foreground -ne [IntPtr]::Zero) { [GameWindowFocus]::GetWindowThreadProcessId($foreground, [ref]$foregroundPid) } else { 0 }
  $targetThread = [GameWindowFocus]::GetWindowThreadProcessId($target, [ref]$targetPid)
  $currentThread = [GameWindowFocus]::GetCurrentThreadId()
  if ($foregroundThread -ne 0) { [GameWindowFocus]::AttachThreadInput($currentThread, $foregroundThread, $true) | Out-Null }
  [GameWindowFocus]::AttachThreadInput($currentThread, $targetThread, $true) | Out-Null
  [GameWindowFocus]::ShowWindow($target, 9) | Out-Null
  [GameWindowFocus]::BringWindowToTop($target) | Out-Null
  $focused = [GameWindowFocus]::SetForegroundWindow($target)
  [GameWindowFocus]::SetFocus($target) | Out-Null
  [GameWindowFocus]::AttachThreadInput($currentThread, $targetThread, $false) | Out-Null
  if ($foregroundThread -ne 0) { [GameWindowFocus]::AttachThreadInput($currentThread, $foregroundThread, $false) | Out-Null }
  if ($focused) { Write-Output 'focused' }
}
`;
  const encoded = Buffer.from(`${psCode}\n`, 'utf16le').toString('base64');
  return new Promise(resolve => {
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (error, stdout) => {
      resolve(!error && stdout.includes('focused'));
    });
  });
}

async function sendCommandToGame(command: string, chatKey: string, autoEnter: boolean): Promise<boolean> {
  const supportedChatKeys: Record<string, string> = { t: 'T', e: 'E', f8: 'F8', '`': 'OEM3' };
  const keyName = supportedChatKeys[String(chatKey || 't').toLowerCase()] || 'T';
  const commandBase64 = Buffer.from(command, 'utf8').toString('base64');
  const psCode = `
Add-Type -AssemblyName System.Windows.Forms
$source = @'
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public static class GameInput {
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
  public static void Press(Keys key) {
    ushort scan = (ushort)MapVirtualKey((uint)key, 0);
    INPUT down = new INPUT { type = 1, ki = new KEYBDINPUT { wScan = scan, dwFlags = 0x0008 } };
    INPUT up = new INPUT { type = 1, ki = new KEYBDINPUT { wScan = scan, dwFlags = 0x0008 | 0x0002 } };
    SendInput(1, new INPUT[] { down }, Marshal.SizeOf(typeof(INPUT)));
    System.Threading.Thread.Sleep(30);
    SendInput(1, new INPUT[] { up }, Marshal.SizeOf(typeof(INPUT)));
  }
  public static void Paste() {
    ushort ctrl = (ushort)MapVirtualKey((uint)Keys.LControlKey, 0);
    ushort v = (ushort)MapVirtualKey((uint)Keys.V, 0);
    INPUT[] input = new INPUT[] {
      new INPUT { type = 1, ki = new KEYBDINPUT { wScan = ctrl, dwFlags = 0x0008 } },
      new INPUT { type = 1, ki = new KEYBDINPUT { wScan = v, dwFlags = 0x0008 } },
      new INPUT { type = 1, ki = new KEYBDINPUT { wScan = v, dwFlags = 0x0008 | 0x0002 } },
      new INPUT { type = 1, ki = new KEYBDINPUT { wScan = ctrl, dwFlags = 0x0008 | 0x0002 } }
    };
    foreach (INPUT item in input) { SendInput(1, new INPUT[] { item }, Marshal.SizeOf(typeof(INPUT))); System.Threading.Thread.Sleep(20); }
  }
}
'@
Add-Type -TypeDefinition $source -ReferencedAssemblies System.Windows.Forms -ErrorAction Stop
$command = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${commandBase64}'))
[GameInput]::Press([System.Windows.Forms.Keys]::${keyName})
Start-Sleep -Milliseconds 300
[System.Windows.Forms.Clipboard]::SetText($command)
[GameInput]::Paste()
Start-Sleep -Milliseconds 150
${autoEnter ? '[GameInput]::Press([System.Windows.Forms.Keys]::Enter)' : ''}
Write-Output 'sent'
`;
  const encoded = Buffer.from(`${psCode}\n`, 'utf16le').toString('base64');
  return new Promise(resolve => {
    exec(`powershell -STA -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (error, stdout, stderr) => {
      if (error) console.error('[punish] Input failed:', stderr || error.message);
      resolve(!error && stdout.includes('sent'));
    });
  });
}

// Execute punishment command in game: open chat (T), type the command, then send.
ipcMain.handle('execute-command', async (_event, data) => {
  const { command, autoEnter, chatKey } = data;
  if (!command) return { ok: false, error: 'Команда не указана.' };
  try {
    // The button is clicked in an Electron overlay, which takes focus away from
    // the game. Hide interactive windows first, then explicitly reactivate GTA V.
    if (win.punishModal && !win.punishModal.isDestroyed()) win.punishModal.hide();
    if (win.detail && !win.detail.isDestroyed()) win.detail.hide();
    const gameFocused = await returnFocusToGame();
    if (!gameFocused) return { ok: false, error: 'Окно GTA V или RAGE MP не найдено.' };
    await new Promise(r => setTimeout(r, 250));

    const commandSent = await sendCommandToGame(command, chatKey, autoEnter);
    if (!commandSent) return { ok: false, error: 'Windows не смогла отправить команду в окно игры.' };
    return { ok: true };
  } catch (err) {
    console.error('Error executing command:', err);
    return { ok: false, error: 'Не удалось отправить команду в игру.' };
  }
});

setupAuthIpc();
setupUpdaterIpc();
