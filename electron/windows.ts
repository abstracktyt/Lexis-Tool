import { app, BrowserWindow, screen } from 'electron';
import fs from 'fs';
import path from 'path';

export const win = {
  main: null as BrowserWindow | null,
  overlay: null as BrowserWindow | null,
  pinned: null as BrowserWindow | null,
  detail: null as BrowserWindow | null,
  punishModal: null as BrowserWindow | null,
  binder: null as BrowserWindow | null,
  eventsOverlay: null as BrowserWindow | null,
  onlineOverlay: null as BrowserWindow | null,
  notification: null as BrowserWindow | null,
  currentDetailRuleId: null as string | null,
  isPinnedWindowPinned: false,
};

const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
const windowStateCache = loadWindowState();

function loadWindowState(): Record<string, any> {
  try {
    if (fs.existsSync(windowStateFile)) return JSON.parse(fs.readFileSync(windowStateFile, 'utf-8'));
  } catch (e) {}
  return {};
}

function saveWindowState(state: any) {
  try {
    fs.mkdirSync(path.dirname(windowStateFile), { recursive: true });
    fs.writeFileSync(windowStateFile, JSON.stringify(state));
  } catch (e) {}
}

export function saveWindowBounds(name: string, w: BrowserWindow | null) {
  if (!w || w.isDestroyed()) return;
  windowStateCache[name] = w.getBounds();
  saveWindowState(windowStateCache);
}

export function getSavedBounds(name: string): any {
  return windowStateCache[name] || {};
}

function isDev() {
  return !!process.env.VITE_DEV_SERVER_URL;
}

function iconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'icon.png')
    : path.join(process.env.VITE_PUBLIC || path.join(__dirname, '../public'), 'icon.png');
}

function baseWebPreferences() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
  };
}

function loadRenderer(target: BrowserWindow, hash?: string) {
  if (isDev()) {
    // Chromium resolves "localhost" to IPv4 first, while the Node dev server
    // often binds to IPv6 (::1) only. Use an explicit IPv4 loopback address.
    const base = (process.env.VITE_DEV_SERVER_URL || '').replace('localhost', '127.0.0.1');
    target.loadURL(base + (hash ? `#${hash}` : ''));
  } else {
    const opts = hash ? { hash } : undefined;
    target.loadFile(path.join(__dirname, '../dist/index.html'), opts);
  }
}

export function createWindow() {
  const icon = iconPath();
  win.main = new BrowserWindow({
    icon,
    width: 1500,
    height: 860,
    minWidth: 1200,
    minHeight: 760,
    frame: false,
    transparent: true,
    thickFrame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.main);
}

export function createOverlayWindow() {
  const savedBounds = getSavedBounds('overlayWindow');
  win.overlay = new BrowserWindow({
    width: savedBounds?.width || 420,
    height: savedBounds?.height || 680,
    x: savedBounds?.x || 40,
    y: savedBounds?.y || 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: true,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.overlay, 'overlay');
  win.overlay.setAlwaysOnTop(true, 'screen-saver');
  win.overlay.on('moved', () => saveWindowBounds('overlayWindow', win.overlay));
  win.overlay.on('resized', () => saveWindowBounds('overlayWindow', win.overlay));
}

let notificationTimer: ReturnType<typeof setTimeout> | null = null;

export function createNotificationWindow() {
  const display = screen.getPrimaryDisplay().workArea;
  win.notification = new BrowserWindow({
    width: 420,
    height: 108,
    x: display.x + display.width - 444,
    y: display.y + 28,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    show: false,
    webPreferences: baseWebPreferences(),
  });
  win.notification.setAlwaysOnTop(true, 'screen-saver');
  win.notification.setIgnoreMouseEvents(true);
  loadRenderer(win.notification, 'notification-overlay');
}

export function showGameNotification(title: string, body: string) {
  const notification = win.notification;
  if (!notification || notification.isDestroyed()) return;
  notification.webContents.send('game-notification', { title, body });
  notification.showInactive();
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    if (!notification.isDestroyed()) notification.hide();
  }, 4500);
}

export function createEventsOverlayWindow() {
  const savedBounds = getSavedBounds('eventsOverlayWindow');
  win.eventsOverlay = new BrowserWindow({
    width: savedBounds?.width || 400,
    height: savedBounds?.height || 650,
    x: savedBounds?.x || 60,
    y: savedBounds?.y || 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: true,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.eventsOverlay, 'events-overlay');
  win.eventsOverlay.setAlwaysOnTop(true, 'screen-saver');
  win.eventsOverlay.on('moved', () => saveWindowBounds('eventsOverlayWindow', win.eventsOverlay));
  win.eventsOverlay.on('resized', () => saveWindowBounds('eventsOverlayWindow', win.eventsOverlay));
}

export function createBinderWindow() {
  const savedBounds = getSavedBounds('binderWindow');
  win.binder = new BrowserWindow({
    width: savedBounds?.width || 300,
    height: savedBounds?.height || 500,
    x: savedBounds?.x || 460,
    y: savedBounds?.y || 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: true,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.binder, 'binder-overlay');
  win.binder.setAlwaysOnTop(true, 'screen-saver');
  win.binder.on('moved', () => saveWindowBounds('binderWindow', win.binder));
  win.binder.on('resized', () => saveWindowBounds('binderWindow', win.binder));
}

export function createOnlineOverlayWindow() {
  const savedBounds = getSavedBounds('onlineOverlayWindow');
  win.onlineOverlay = new BrowserWindow({
    width: savedBounds?.width || 220,
    height: savedBounds?.height || 480,
    x: savedBounds?.x || 80,
    y: savedBounds?.y || 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: true,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.onlineOverlay, 'online-overlay');
  win.onlineOverlay.setAlwaysOnTop(true, 'screen-saver');
  win.onlineOverlay.on('moved', () => saveWindowBounds('onlineOverlayWindow', win.onlineOverlay));
  win.onlineOverlay.on('resized', () => saveWindowBounds('onlineOverlayWindow', win.onlineOverlay));
}

export function createPinnedWindow() {
  const savedBounds = getSavedBounds('pinnedWindow');
  win.pinned = new BrowserWindow({
    width: savedBounds?.width || 340,
    height: savedBounds?.height || 600,
    x: savedBounds?.x || 460,
    y: savedBounds?.y || 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    focusable: true,
    resizable: true,
    webPreferences: baseWebPreferences(),
  });

  win.pinned.setIgnoreMouseEvents(true);
  loadRenderer(win.pinned, 'pinned');
  win.pinned.setAlwaysOnTop(true, 'screen-saver');
  win.pinned.on('moved', () => saveWindowBounds('pinnedWindow', win.pinned));
  win.pinned.on('resized', () => saveWindowBounds('pinnedWindow', win.pinned));
}

export function createDetailWindow(ruleData: any, sourceWindowBounds: { x: number; y: number; width: number; height: number }, isPinned: boolean, searchQuery?: string) {
  const detailWidth = 380;
  const display = screen.getDisplayNearestPoint({ x: sourceWindowBounds.x, y: sourceWindowBounds.y });
  const workArea = display.workArea;

  let x = sourceWindowBounds.x - detailWidth - 8;
  if (x < workArea.x) {
    x = sourceWindowBounds.x + sourceWindowBounds.width + 8;
  }
  const y = sourceWindowBounds.y;

  if (win.detail && !win.detail.isDestroyed()) {
    win.detail.setPosition(x, y);
    win.detail.webContents.send('show-detail', { rule: ruleData, isPinned, searchQuery });
    if (!win.detail.isVisible()) win.detail.show();
    return;
  }

  win.detail = new BrowserWindow({
    width: 380,
    height: sourceWindowBounds.height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: false,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.detail, 'detail');

  win.detail.once('ready-to-show', () => {
    win.detail?.show();
    win.detail?.webContents.send('show-detail', { rule: ruleData, isPinned, searchQuery });
  });

  win.detail.setAlwaysOnTop(true, 'screen-saver');
  win.detail.on('closed', () => {
    win.detail = null;
    win.currentDetailRuleId = null;
  });
}

export function createPunishModalWindow(ruleData: any, staticId?: string, categoryName?: string) {
  if (win.punishModal && !win.punishModal.isDestroyed()) {
    win.punishModal.webContents.send('show-punish-modal', { rule: ruleData, staticId, categoryName });
    if (!win.punishModal.isVisible()) win.punishModal.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const modalWidth = 480;
  const modalHeight = 450;

  win.punishModal = new BrowserWindow({
    width: modalWidth,
    height: modalHeight,
    x: Math.round(width / 2 - modalWidth / 2),
    y: Math.round(height / 2 - modalHeight / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'toolbar',
    show: false,
    resizable: false,
    webPreferences: baseWebPreferences(),
  });

  loadRenderer(win.punishModal, 'punish');

  win.punishModal.once('ready-to-show', () => {
    win.punishModal?.show();
    win.punishModal?.webContents.send('show-punish-modal', { rule: ruleData, staticId, categoryName });
  });

  win.punishModal.setAlwaysOnTop(true, 'screen-saver');
  win.punishModal.on('closed', () => { win.punishModal = null; });
}
