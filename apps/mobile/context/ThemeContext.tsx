import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Theme, themeFor } from '@/lib/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'velora-theme-mode';

interface ThemeContextValue {
  /** The user's choice: follow the OS, or force light/dark. */
  mode: ThemeMode;
  /** The resolved palette currently in effect. */
  theme: Theme;
  /** 'light' | 'dark' actually being shown (mode resolved against the OS). */
  scheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  theme: themeFor('light'),
  scheme: 'light',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null (follows the OS)
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the saved preference once on mount.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (v === 'system' || v === 'light' || v === 'dark') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = themeFor(scheme);

  return (
    <ThemeContext.Provider value={{ mode, theme, scheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
