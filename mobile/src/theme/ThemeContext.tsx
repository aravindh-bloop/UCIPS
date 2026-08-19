import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette as lightPalette, darkPalette } from './colors';

type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  palette: typeof lightPalette;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(systemTheme === 'dark' ? 'dark' : 'light');

  // If system theme changes and user hasn't forced a theme, you could sync it, but for now we keep it simple.

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const palette = theme === 'dark' ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ theme, palette, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
