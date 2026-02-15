import { createContext, useState, useCallback, useMemo, useEffect, JSX, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors, ColorScheme } from './colors';
import { STORAGE_KEYS } from '@app/shared/config';

export type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ColorScheme;
  toggleTheme: () => void;
  isDark: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps): JSX.Element => {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  // Загрузка сохранённой темы при старте
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.THEME_OVERRIDE).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setOverride(saved);
      }
    });
  }, []);

  const scheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = useCallback((): void => {
    setOverride((prev) => {
      const next = (() => {
        if (prev === null) {
          return systemScheme === 'dark' ? 'light' : 'dark';
        }
        return prev === 'dark' ? 'light' : 'dark';
      })();
      AsyncStorage.setItem(STORAGE_KEYS.THEME_OVERRIDE, next);
      return next;
    });
  }, [systemScheme]);

  const value = useMemo(
    (): ThemeContextValue => ({ colors, scheme, toggleTheme, isDark }),
    [colors, scheme, toggleTheme, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
