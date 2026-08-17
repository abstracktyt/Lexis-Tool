// Applies user-chosen theme colors to CSS variables used across the app.

export const PRESET_COLORS = [
  { color: '#5b7c9e', name: 'Сталь' },
  { color: '#8a919b', name: 'Серый' },
  { color: '#7d8590', name: 'Графит' },
  { color: '#94a3b8', name: 'Сланцевый' },
  { color: '#64748b', name: 'Тёмно-сизый' },
  { color: '#565e68', name: 'Уголь' },
];

export interface ThemeColors {
  accentColor?: string;
  buttonColor?: string;
  backgroundColor?: string;
  textColor?: string;
  textMutedColor?: string;
  heroGradientColor1?: string;
  heroGradientColor2?: string;
}

export function applyTheme(settings: ThemeColors) {
  const root = document.documentElement;

  if (settings.accentColor) {
    root.style.setProperty('--accent-color', settings.accentColor);
  }
  if (settings.buttonColor) {
    root.style.setProperty('--button-color', settings.buttonColor);
  }
  if (settings.backgroundColor) {
    root.style.setProperty('--bg-main', settings.backgroundColor);
    root.style.setProperty('--bg-sidebar', `color-mix(in srgb, ${settings.backgroundColor} 94%, rgba(255,255,255,0.02))`);
    root.style.setProperty('--bg-card', `color-mix(in srgb, ${settings.backgroundColor} 62%, #12151a)`);
  }
  if (settings.textColor) {
    root.style.setProperty('--text-main', settings.textColor);
  }
  if (settings.textMutedColor) {
    root.style.setProperty('--text-muted', settings.textMutedColor);
  }
  if (settings.heroGradientColor1) {
    root.style.setProperty('--hero-c1', settings.heroGradientColor1);
  }
  if (settings.heroGradientColor2) {
    root.style.setProperty('--hero-c2', settings.heroGradientColor2);
  }
}