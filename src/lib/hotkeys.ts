// Shared key maps used by the renderer for hotkey recording/display.

export const CODE_TO_KEY: Record<string, string> = {
  // Letters
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',
  // Digits
  Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
  // Numpad
  Numpad0: 'NUMPAD0', Numpad1: 'NUMPAD1', Numpad2: 'NUMPAD2', Numpad3: 'NUMPAD3',
  Numpad4: 'NUMPAD4', Numpad5: 'NUMPAD5', Numpad6: 'NUMPAD6', Numpad7: 'NUMPAD7',
  Numpad8: 'NUMPAD8', Numpad9: 'NUMPAD9',
  NumpadAdd: 'ADD', NumpadSubtract: 'SUBTRACT', NumpadMultiply: 'MULTIPLY',
  NumpadDivide: 'DIVIDE', NumpadDecimal: 'DECIMAL', NumpadEnter: 'ENTER',
  // Function keys
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  // Navigation
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
  Home: 'HOME', End: 'END', PageUp: 'PRIOR', PageDown: 'NEXT',
  Insert: 'INSERT', Delete: 'DELETE',
  // Misc
  Space: 'SPACE', Enter: 'ENTER', Backspace: 'BACK',
  Tab: 'TAB', Escape: 'ESCAPE', CapsLock: 'CAPITAL',
  // Brackets & punctuation
  BracketLeft: 'OEM_4', BracketRight: 'OEM_6',
  Semicolon: 'OEM_1', Quote: 'OEM_7',
  Backquote: 'OEM_3', Backslash: 'OEM_5',
  Comma: 'OEM_COMMA', Period: 'OEM_PERIOD', Slash: 'OEM_2',
  Minus: 'OEM_MINUS', Equal: 'OEM_PLUS',
  // Media keys
  AudioVolumeUp: 'VOLUME_UP', AudioVolumeDown: 'VOLUME_DOWN', AudioVolumeMute: 'VOLUME_MUTE',
  MediaPlayPause: 'MEDIA_PLAY_PAUSE', MediaStop: 'MEDIA_STOP',
  MediaTrackNext: 'MEDIA_NEXT_TRACK', MediaTrackPrevious: 'MEDIA_PREV_TRACK',
  // Extra
  PrintScreen: 'SNAPSHOT', ScrollLock: 'SCROLL', Pause: 'PAUSE',
};

export const DISPLAY_NAME: Record<string, string> = {
  SPACE: 'Space', ENTER: 'Enter', BACK: 'Backspace', TAB: 'Tab',
  ESCAPE: 'Esc', CAPITAL: 'CapsLock', LEFT: 'LeftArrow', RIGHT: 'RightArrow', UP: 'UpArrow', DOWN: 'DownArrow',
  PRIOR: 'PgUp', NEXT: 'PgDn', HOME: 'Home', END: 'End',
  INSERT: 'Ins', DELETE: 'Del', SNAPSHOT: 'PrtScr', SCROLL: 'ScrLk',
  ADD: 'Num+', SUBTRACT: 'Num-', MULTIPLY: 'Num*', DIVIDE: 'Num/',
  DECIMAL: 'Num.', OEM_COMMA: ',', OEM_PERIOD: '.', OEM_2: '/', OEM_MINUS: '-',
  OEM_PLUS: '=', OEM_4: '[', OEM_6: ']', OEM_1: ';', OEM_7: "'",
  OEM_3: '`', OEM_5: '\\', MOUSE4: 'Mouse4', MOUSE5: 'Mouse5',
  VOLUME_UP: 'Vol+', VOLUME_DOWN: 'Vol-', VOLUME_MUTE: 'Mute',
  MEDIA_PLAY_PAUSE: 'Play/Pause', MEDIA_STOP: 'MediaStop',
  MEDIA_NEXT_TRACK: 'Next', MEDIA_PREV_TRACK: 'Prev',
};

export function getDisplayKey(key: string): string {
  if (!key) return '';
  const parts = key.split('+');
  return parts.map(p => DISPLAY_NAME[p] || p).join(' + ');
}