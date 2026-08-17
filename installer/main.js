// @ts-nocheck
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fsp = require('fs').promises;
const { execFile, spawn } = require('child_process');

const config = require('./config.json');
const APP_DIR = path.join(__dirname, 'app');
const PRODUCT = config.productName;
const EXE_NAME = config.executable;

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 580,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function defaultInstallDir() {
  return path.join(os.homedir(), 'AppData', 'Local', 'Programs', PRODUCT);
}

function runPowershell(script, cb) {
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true, maxBuffer: 1024 * 1024 * 8 }, cb || (() => {}));
}

function countFiles(dir) {
  let n = 0;
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else n++;
    }
  };
  walk(dir);
  return n;
}

async function copyTreeAsync(src, dst, total, onCount) {
  let done = 0;
  const walk = async (s, d) => {
    const entries = await fsp.readdir(s, { withFileTypes: true });
    for (const f of entries) {
      const sp = path.join(s, f.name);
      const dp = path.join(d, f.name);
      if (f.isDirectory()) {
        await fsp.mkdir(dp, { recursive: true });
        await walk(sp, dp);
      } else {
        await fsp.copyFile(sp, dp);
        done++;
        onCount(done, total);
        await new Promise((r) => setImmediate(r));
      }
    }
  };
  await walk(src, dst);
}

function createShortcuts(installDir) {
  const exe = path.join(installDir, EXE_NAME);
  const targets = [
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  ];
  for (const folder of targets) {
    const lnk = path.join(folder, `${PRODUCT}.lnk`);
    runPowershell(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${lnk.replace(/'/g, "''")}');$s.TargetPath='${exe.replace(/'/g, "''")}';$s.WorkingDirectory='${installDir.replace(/'/g, "''")}';$s.Save()`);
  }
}

function registerProtocol(installDir) {
  const exe = path.join(installDir, EXE_NAME);
  const script =
    `New-Item -Path 'HKCU:\\Software\\Classes\\${config.protocol}' -Force | Out-Null;` +
    `Set-ItemProperty -Path 'HKCU:\\Software\\Classes\\${config.protocol}' -Name '(Default)' -Value 'URL:Lexis' -Force;` +
    `New-ItemProperty -Path 'HKCU:\\Software\\Classes\\${config.protocol}' -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null;` +
    `New-Item -Path 'HKCU:\\Software\\Classes\\${config.protocol}\\shell\\open\\command' -Force | Out-Null;` +
    `Set-ItemProperty -Path 'HKCU:\\Software\\Classes\\${config.protocol}\\shell\\open\\command' -Name '(Default)' -Value '"${exe.replace(/'/g, "''")}" "%1"' -Force`;
  runPowershell(script);
}

function estimateSizeMB() {
  try {
    let bytes = 0;
    const walk = (d) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else bytes += fs.statSync(p).size;
      }
    };
    walk(APP_DIR);
    return Math.max(1, Math.round(bytes / 1024 / 1024));
  } catch (e) {
    return 150;
  }
}

function writeUninstallRegistry(installDir) {
  const exe = path.join(installDir, EXE_NAME);
  const key = `HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LexisTools`;
  const esc = (v) => v.replace(/'/g, "''");
  const script =
    `New-Item -Path '${key}' -Force | Out-Null;` +
    `Set-ItemProperty -Path '${key}' -Name 'DisplayName' -Value '${esc(PRODUCT)}' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'DisplayVersion' -Value '${config.version}' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'Publisher' -Value 'Lexis Tools' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'DisplayIcon' -Value '"${esc(exe)}"' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'InstallLocation' -Value '${esc(installDir)}' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'EstimatedSize' -Value '${Math.max(1, estimateSizeMB() * 1024)}' -PropertyType DWord -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'UninstallString' -Value '"${esc(exe)}" --uninstall' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'QuietUninstallString' -Value '"${esc(exe)}" --uninstall' -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'NoModify' -Value 1 -PropertyType DWord -Force;` +
    `Set-ItemProperty -Path '${key}' -Name 'NoRepair' -Value 1 -PropertyType DWord -Force`;
  runPowershell(script);
}

ipcMain.handle('get-info', () => ({
  productName: PRODUCT,
  version: config.version,
  defaultDir: defaultInstallDir(),
  sizeMB: estimateSizeMB()
}));

ipcMain.handle('choose-dir', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Папка установки',
    defaultPath: defaultInstallDir(),
    properties: ['openDirectory', 'createDirectory']
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('install', async (_e, dir) => {
  const target = (dir && dir.trim()) || defaultInstallDir();
  try {
    const total = countFiles(APP_DIR);
    await fsp.mkdir(target, { recursive: true });
    await copyTreeAsync(APP_DIR, target, total, (done, all) => {
      win.webContents.send('progress', Math.min(100, Math.round((done / all) * 100)));
    });
    createShortcuts(target);
    registerProtocol(target);
    writeUninstallRegistry(target);
    return { ok: true, dir: target };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});

ipcMain.on('open-url', (_e, url) => shell.openExternal(url));
ipcMain.on('launch-app', (_e, dir) => {
  const exe = path.join(dir || defaultInstallDir(), EXE_NAME);
  try {
    spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {
    console.error('launch failed', e);
  }
});
ipcMain.on('window-minimize', () => win && win.minimize());
ipcMain.on('window-close', () => app.quit());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());