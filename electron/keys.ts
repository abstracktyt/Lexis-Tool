// Centralized key maps and hotkey normalization used by the main process.

export const ruToEnKeys: Record<string, string> = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.', '.': '/'
};

export function normalizeHotkey(hk: string) {
  if (!hk) return hk;
  let parts = hk.split('+');
  let last = parts[parts.length - 1];
  if (last && last.length === 1) {
    let lower = last.toLowerCase();
    if (ruToEnKeys[lower]) {
      parts[parts.length - 1] = ruToEnKeys[lower].toUpperCase();
    } else {
      parts[parts.length - 1] = last.toUpperCase();
    }
  }
  return parts.join('+');
}

const sanitizeRuMap: Record<string, string> = {
  'й':'q', 'ц':'w', 'у':'e', 'к':'r', 'е':'t', 'н':'y', 'г':'u', 'ш':'i', 'щ':'o', 'з':'p', 'х':'[', 'ъ':']',
  'ф':'a', 'ы':'s', 'в':'d', 'а':'f', 'п':'g', 'р':'h', 'о':'j', 'л':'k', 'д':'l', 'ж':';', 'э':"'",
  'я':'z', 'ч':'x', 'с':'c', 'м':'v', 'и':'b', 'т':'n', 'ь':'m', 'б':',', 'ю':'.'
};

// Converts a user-provided hotkey string into a format Electron accepts.
export const sanitizeHotkey = (key: string) => {
  if (!key) return '';
  return key.toLowerCase().split('+').map(k => {
    let part = k.trim();
    if (sanitizeRuMap[part]) part = sanitizeRuMap[part];
    if (part.length === 1) part = part.toUpperCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('+').replace(/Control/gi, 'CommandOrControl').replace(/Meta/gi, 'Super');
};