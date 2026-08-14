import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'oaa-theme';
const ThemeContext = createContext(null);

function preferredTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* almacenamiento no disponible */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyInitialTheme() {
  const theme = preferredTheme();
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || preferredTheme());

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* almacenamiento no disponible */ }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider');
  return context;
}

export function ThemeSelector({ compact = false }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`theme-switch${compact ? ' compact' : ''}`} role="group" aria-label="Tema de la aplicación">
      <button type="button" className={theme === 'light' ? 'active' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
        <span aria-hidden="true">☀</span><span className="theme-switch-label">Claro</span>
      </button>
      <button type="button" className={theme === 'dark' ? 'active' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
        <span aria-hidden="true">◐</span><span className="theme-switch-label">Oscuro</span>
      </button>
    </div>
  );
}
