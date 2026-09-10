/**
 * MEDiKIOSK — useTheme Hook
 * Manages active workspace theme (Dark vs. Light) with localStorage persistence.
 */

import { useState, useEffect, useCallback } from 'react';

export type WorkspaceTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'medikiosk_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<WorkspaceTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as WorkspaceTheme | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: WorkspaceTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
}
