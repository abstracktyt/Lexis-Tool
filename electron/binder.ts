import { globalShortcut } from 'electron';
import { spawn } from 'child_process';
import { win, showGameNotification } from './windows';
import { ruToEnKeys, normalizeHotkey } from './keys';

// --- Binder State ---
let registeredBinderHotkeys: string[] = [];
let isBinderHotkeysActive = false;
let currentActiveProcess = '';
let activeProcPoller: any = null;
let currentSettings: any = {};
let currentBinds: any[] = [];
let isExecutingMacro = false;
let isAppAuthorized = false;
let persistentPsProcess: any = null;
let mousePollerProcess: any = null;
let hasMouseBinds = false;

function logToMainWindow(message: string) {
  if (win.main && !win.main.isDestroyed()) {
    win.main.webContents.executeJavaScript(`console.log(${JSON.stringify(message)})`).catch(() => {});
  }
}

function notifyBinder(channel: string, payload?: any) {
  if (win.binder && !win.binder.isDestroyed()) {
    win.binder.webContents.send(channel, payload);
  }
}

function showBinderNotification(body: string) {
  showGameNotification('Lexis Tools', body);
}

export function setAppAuthorized(status: boolean) {
  isAppAuthorized = !!status;
}

function startMousePoller() {
  if (mousePollerProcess) return;
  const psCode = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class MK {
        [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
    }
"@
    $m4down = $false
    $m5down = $false
    while ($true) {
        $m4 = ([MK]::GetAsyncKeyState(0x05) -band 0x8000) -eq 0x8000
        if ($m4 -and -not $m4down) { Write-Host "MOUSE4"; $m4down = $true }
        elseif (-not $m4) { $m4down = $false }

        $m5 = ([MK]::GetAsyncKeyState(0x06) -band 0x8000) -eq 0x8000
        if ($m5 -and -not $m5down) { Write-Host "MOUSE5"; $m5down = $true }
        elseif (-not $m5) { $m5down = $false }

        Start-Sleep -Milliseconds 20
    }
  `;
  const encodedPsCode = Buffer.from(psCode + '\n', 'utf16le').toString('base64');
  mousePollerProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedPsCode]);
  mousePollerProcess.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const key = line.trim();
      if ((key === 'MOUSE4' || key === 'MOUSE5') && isBinderHotkeysActive) {
        const matchingBind = currentBinds.find((b: any) => normalizeHotkey(b.hotkey) === key);
        if (matchingBind) {
          executeMacro(matchingBind, currentSettings.binder_chat_key || currentSettings.chatKey || 'T', currentSettings.binder_delay || 100);
        }
      }
    }
  });
}

export function stopMousePoller() {
  if (mousePollerProcess) {
    try { mousePollerProcess.kill(); } catch (e) {}
    mousePollerProcess = null;
  }
}

export function syncMousePoller() {
  const needsMouse = Array.isArray(currentBinds) && currentBinds.some((b: any) => {
    const hk = normalizeHotkey(b.hotkey);
    return hk === 'MOUSE4' || hk === 'MOUSE5';
  });
  if (needsMouse && !hasMouseBinds) {
    hasMouseBinds = true;
    startMousePoller();
  } else if (!needsMouse && hasMouseBinds) {
    hasMouseBinds = false;
    stopMousePoller();
  }
}

function getPsProcess() {
  if (persistentPsProcess) return persistentPsProcess;

  const psCode = `
    Add-Type -AssemblyName System.Windows.Forms
    $code = @"
    using System;
    using System.Runtime.InteropServices;
    using System.Windows.Forms;
    public class KS {
        [StructLayout(LayoutKind.Sequential)]
        public struct INPUT {
            public uint type;
            public InputUnion u;
        }
        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct MOUSEINPUT {
            public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct KEYBDINPUT {
            public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo;
        }
        [StructLayout(LayoutKind.Sequential)]
        public struct HARDWAREINPUT {
            public uint uMsg; public ushort wParamL; public ushort wParamH;
        }

        [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
        [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);

        public static void PressKey(Keys k) {
            ushort scanCode = (ushort)MapVirtualKey((uint)k, 0);
            INPUT[] inputs = new INPUT[2];
            inputs[0].type = 1;
            inputs[0].u.ki.wScan = scanCode;
            inputs[0].u.ki.dwFlags = 0x0008;

            inputs[1].type = 1;
            inputs[1].u.ki.wScan = scanCode;
            inputs[1].u.ki.dwFlags = 0x0008 | 0x0002;

            SendInput(1, new INPUT[] { inputs[0] }, Marshal.SizeOf(typeof(INPUT)));
            System.Threading.Thread.Sleep(30);
            SendInput(1, new INPUT[] { inputs[1] }, Marshal.SizeOf(typeof(INPUT)));
        }

        public static void Press(string keyStr) {
            keyStr = keyStr.Replace("{", "").Replace("}", "").ToUpper();
            if (keyStr.StartsWith("NUMPAD") && keyStr.Length == 7) {
                string numStr = "NUMPAD" + keyStr[6];
                Keys nk;
                if (Enum.TryParse(numStr, true, out nk)) { PressKey(nk); return; }
            }
            Keys k;
            if (Enum.TryParse(keyStr, true, out k)) {
                PressKey(k);
            } else if (keyStr.Length == 1 && char.IsDigit(keyStr[0])) {
                if (Enum.TryParse("D" + keyStr, true, out k)) {
                    PressKey(k);
                }
            }
        }
        public static void Paste() {
            ushort scanCtrl = (ushort)MapVirtualKey((uint)Keys.LControlKey, 0);
            ushort scanV = (ushort)MapVirtualKey((uint)Keys.V, 0);
            INPUT[] inputs = new INPUT[4];

            inputs[0].type = 1; inputs[0].u.ki.wScan = scanCtrl; inputs[0].u.ki.dwFlags = 0x0008;
            inputs[1].type = 1; inputs[1].u.ki.wScan = scanV; inputs[1].u.ki.dwFlags = 0x0008;
            inputs[2].type = 1; inputs[2].u.ki.wScan = scanV; inputs[2].u.ki.dwFlags = 0x0008 | 0x0002;
            inputs[3].type = 1; inputs[3].u.ki.wScan = scanCtrl; inputs[3].u.ki.dwFlags = 0x0008 | 0x0002;

            SendInput(1, new INPUT[] { inputs[0] }, Marshal.SizeOf(typeof(INPUT)));
            System.Threading.Thread.Sleep(20);
            SendInput(1, new INPUT[] { inputs[1] }, Marshal.SizeOf(typeof(INPUT)));
            System.Threading.Thread.Sleep(20);
            SendInput(1, new INPUT[] { inputs[2] }, Marshal.SizeOf(typeof(INPUT)));
            System.Threading.Thread.Sleep(20);
            SendInput(1, new INPUT[] { inputs[3] }, Marshal.SizeOf(typeof(INPUT)));
        }
    }
"@
    Add-Type -TypeDefinition $code -ReferencedAssemblies System.Windows.Forms
    while ($true) { $line = [Console]::ReadLine(); if ($line) { Invoke-Expression $line } }
  `;

  const encodedPsCode = Buffer.from(psCode + '\n', 'utf16le').toString('base64');
  persistentPsProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedPsCode]);

  persistentPsProcess.on('exit', () => {
    persistentPsProcess = null;
    isExecutingMacro = false;
  });

  return persistentPsProcess;
}

function executeMacro(bind: any, chatKey = 't', delay = 100) {
  if (!isAppAuthorized) {
    console.log('[Binder] App not authorized, skipping macro:', bind.name);
    return;
  }
  if (isExecutingMacro) {
    console.log('[Binder] Macro already executing, ignoring:', bind.name);
    logToMainWindow('[Binder] Macro already executing');
    return;
  }
  if (!persistentPsProcess) getPsProcess();

  console.log('[Binder] Executing macro:', bind.name);
  logToMainWindow(`[Binder] Executing macro: ${bind.name}`);
  isExecutingMacro = true;
  notifyBinder('binder-macro-start', bind.hotkey);

  const proceed = async () => {
    const procName = (currentSettings as any).binder_process || '';
    const checkFocus = (currentSettings as any).binder_check_focus !== false;
    if (procName && checkFocus) {
      const isFocused = await isTargetProcessActive(procName);
      if (!isFocused) {
        console.log('[Binder] Process not in focus, skipping macro:', bind.name);
        logToMainWindow(`[Binder] Skipped (process not active): ${bind.name}`);
        showBinderNotification(`Бинд «${bind.name}» не выполнен: окно игры не активно.`);
        notifyBinder('binder-macro-end');
        isExecutingMacro = false;
        return;
      }
    }

    let actions = bind.actions || [];

    if (actions.length === 0) {
      console.log('[Binder] Macro finished (no actions):', bind.name);
      isExecutingMacro = false;
      return;
    }

    let psLines: string[] = [];
    psLines.push(`Start-Sleep -Milliseconds 200`);

    let totalDelay = 200;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log('[Binder] Action:', action.type, action.value);

      if (action.type === 'delay') {
        const waitTimeMs = parseInt(action.value, 10) || 500;
        psLines.push(`Start-Sleep -Milliseconds ${waitTimeMs}`);
        totalDelay += waitTimeMs;
      }
      else if (action.type === 'key') {
        const keyVal = action.value || 'ENTER';
        psLines.push(`[KS]::Press('${keyVal}')`);
        psLines.push(`Start-Sleep -Milliseconds ${delay}`);
        totalDelay += delay;
      }
      else if (action.type === 'text') {
        const textVal = action.value || '';
        if (textVal) {
          const b64 = Buffer.from(textVal, 'utf8').toString('base64');
          psLines.push(`$txt = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}'))`);
          psLines.push(`[System.Windows.Forms.Clipboard]::SetText($txt)`);
        }
        psLines.push(`[KS]::Paste()`);
        psLines.push(`Start-Sleep -Milliseconds ${delay}`);
        totalDelay += delay;
      }
      else if (action.type === 'chat') {
        const textVal = action.value || '';
        let mappedChatKey = ruToEnKeys[(chatKey || 't').toLowerCase()] || (chatKey || 't');
        let formattedChatKey = mappedChatKey.toUpperCase();

        const lines = textVal.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const chatLines = lines.length === 0 ? [''] : lines;

        for (const line of chatLines) {
          if (line) {
            const b64 = Buffer.from(line, 'utf8').toString('base64');
            psLines.push(`$txt = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}'))`);
            psLines.push(`[System.Windows.Forms.Clipboard]::SetText($txt)`);
          }
          psLines.push(`[KS]::Press('${formattedChatKey}')`);
          psLines.push(`Start-Sleep -Milliseconds ${delay}`);
          totalDelay += delay;
          if (line) {
            psLines.push(`[KS]::Paste()`);
            psLines.push(`Start-Sleep -Milliseconds ${delay}`);
            totalDelay += delay;
          }
          psLines.push(`[KS]::Press('ENTER')`);
          psLines.push(`Start-Sleep -Milliseconds ${delay}`);
          totalDelay += delay;
        }
      }
    }

    psLines.push(`Write-Host "MACRO_DONE"`);
    const psCode = psLines.join('\n') + '\n';

    logToMainWindow(`[Binder] Sending ${psLines.length} lines to PowerShell`);

    const psProc = getPsProcess();
    psProc.stdin.write(psCode, 'utf-8', (err: any) => {
      if (err) {
        console.error('[Binder] powershell write error:', err);
        logToMainWindow(`[Binder] PS Error: ${err}`);
        persistentPsProcess = null;
      }
    });

    setTimeout(() => {
      console.log('[Binder] Macro finished:', bind.name);
      logToMainWindow(`[Binder] Macro finished: ${bind.name}`);
      notifyBinder('binder-macro-end');
      showBinderNotification(`Бинд «${bind.name}» выполнен.`);
      isExecutingMacro = false;
    }, totalDelay + 200);
  };
  proceed();
}

export function unregisterBinderShortcuts() {
  registeredBinderHotkeys.forEach(hk => {
    try { globalShortcut.unregister(hk); } catch (e) {}
  });
  registeredBinderHotkeys = [];
  isBinderHotkeysActive = false;
}

export function registerBinderShortcuts() {
  unregisterBinderShortcuts();
  if (currentSettings.binder_enabled === false) return;
  console.log('[Binder] currentBinds:', JSON.stringify(currentBinds));
  if (currentBinds && currentBinds.length > 0) {
    currentBinds.forEach((bind: any) => {
      if (bind.hotkey) {
        try {
          const normHk = normalizeHotkey(bind.hotkey);
          if (normHk === 'MOUSE4' || normHk === 'MOUSE5') {
            console.log('[Binder] Registered mouse hook for bind:', bind.name);
            registeredBinderHotkeys.push(normHk);
            logToMainWindow(`[Binder] Registered mouse hook for bind: ${bind.name}`);
            return;
          }
          const success = globalShortcut.register(normHk, () => {
            executeMacro(bind, currentSettings.binder_chat_key || currentSettings.chatKey || 'T', currentSettings.binder_delay || 100);
          });
          if (success) {
            registeredBinderHotkeys.push(normHk);
            console.log('[Binder] Registered:', normHk, 'for bind:', bind.name);
            logToMainWindow(`[Binder] Registered: ${normHk} for bind: ${bind.name}`);
          } else {
            console.error('[Binder] FAILED to register:', normHk, 'for bind:', bind.name);
            logToMainWindow(`[Binder] FAILED to register: ${normHk} for bind: ${bind.name}`);
          }
        } catch (e) {
          console.error('Failed to register binder shortcut: ' + bind.hotkey, e);
        }
      }
    });
    isBinderHotkeysActive = true;
  }
}

export function checkAndToggleShortcuts() {
  console.log('[Binder] Registering shortcuts...');
  registerBinderShortcuts();
  syncMousePoller();
}

export function syncBinderState(binds: any[], settings: any) {
  currentBinds = binds || [];
  currentSettings = settings || {};
  checkAndToggleShortcuts();
  notifyBinder('sync-binds', currentBinds);
}

export function syncBinderSettings(settings: any) {
  currentSettings = settings || {};
  checkAndToggleShortcuts();
}

// Check if the target process window is the active foreground window
function isTargetProcessActive(processName: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!processName) return resolve(true);
    if (!currentActiveProcess) return resolve(true);
    const target = processName.replace(/\.exe$/i, '').toLowerCase();
    const active = currentActiveProcess.replace(/\.exe$/i, '').toLowerCase();
    const rageMpNames = new Set(['ragemp', 'ragemp_v', 'ragemp-launcher', 'ragemp_client']);

    // RAGE MP renders the game in GTA5.exe, so the foreground window normally
    // belongs to GTA V even when the selected client process is RAGE MP.
    if (rageMpNames.has(target) && (active === 'gta5' || rageMpNames.has(active))) {
      return resolve(true);
    }

    resolve(active.includes(target) || target.includes(active));
  });
}

export function startProcessPoller() {
  if (activeProcPoller) return;
  const psCode = `
$code = '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);'
$FG = Add-Type -MemberDefinition $code -Name "FGPoll" -PassThru -ErrorAction SilentlyContinue
while ($true) {
  $hwnd = $FG::GetForegroundWindow()
  if ($hwnd -ne 0) {
    $outPid = 0
    $FG::GetWindowThreadProcessId($hwnd, [ref]$outPid) | Out-Null
    if ($outPid -ne 0) {
      $proc = Get-Process -Id $outPid -ErrorAction SilentlyContinue
      if ($proc) { Write-Output $proc.Name }
    }
  }
  Start-Sleep -Milliseconds 500
}
`;
  const encodedPsCode = Buffer.from(psCode + '\n', 'utf16le').toString('base64');
  activeProcPoller = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedPsCode]);

  activeProcPoller.stdout.on('data', (data: any) => {
    const output = data.toString().trim();
    if (output) {
      const parts = output.split('\\n');
      const last = parts[parts.length - 1].trim().toLowerCase();
      if (last) currentActiveProcess = last;
    }
  });

  activeProcPoller.on('error', (err: any) => {
    console.error('[Poller] Error:', err);
  });
}

export function stopBinderPollers() {
  stopMousePoller();
  try { if (activeProcPoller) activeProcPoller.kill(); } catch (e) {}
  activeProcPoller = null;
  try { if (persistentPsProcess) persistentPsProcess.kill(); } catch (e) {}
  persistentPsProcess = null;
}
