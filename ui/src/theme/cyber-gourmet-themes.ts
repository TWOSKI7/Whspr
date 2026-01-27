export interface CyberTheme {
  name: string;
  primary: string;
  secondary: string;
}

export const themes: Record<string, CyberTheme> = {
  orange:  { name: 'Inferno',  primary: '#ff8800', secondary: '#ff3300' },
  blue:    { name: 'Glacier',  primary: '#0088ff', secondary: '#5500ff' },
  green:   { name: 'Matrix',   primary: '#00ff88', secondary: '#00cc44' },
  purple:  { name: 'Phantom',  primary: '#aa00ff', secondary: '#6600cc' },
  red:     { name: 'Plasma',   primary: '#ff0044', secondary: '#cc0033' },
  cyan:    { name: 'Neon',     primary: '#00ffff', secondary: '#0088ff' },
  gold:    { name: 'Aurum',    primary: '#ffd700', secondary: '#ff8c00' },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTheme(themeName: string): void {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty('--cyber-primary', theme.primary);
  root.style.setProperty('--cyber-secondary', theme.secondary);
  root.style.setProperty('--cyber-glow-intense', `0 0 5px ${theme.primary}, 0 0 15px ${theme.secondary}`);
  root.style.setProperty('--cyber-glow-ambient', `0 0 25px ${hexToRgba(theme.primary, 0.73)}`);
  root.style.setProperty('--cyber-glow-soft', `0 0 10px ${hexToRgba(theme.primary, 0.5)}`);
  root.style.setProperty('--cyber-border-glow', `0 0 4px 1px ${theme.primary}, 0 0 12px 4px ${theme.secondary}, inset 0 0 10px ${theme.secondary}`);
}

export function getCurrentTheme(): string {
  return localStorage.getItem('cyber-theme') || 'orange';
}

export function setTheme(themeName: string): void {
  if (!themes[themeName]) return;
  localStorage.setItem('cyber-theme', themeName);
  applyTheme(themeName);
  window.dispatchEvent(new CustomEvent('cyber-theme-change', {
    detail: { theme: themeName, data: themes[themeName] }
  }));
}

export function initTheme(): void {
  applyTheme(getCurrentTheme());
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}

export function getTheme(themeName: string): CyberTheme | undefined {
  return themes[themeName];
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
}
