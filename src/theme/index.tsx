import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  DefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { getPaletteById, PASTEL_BLOOM, Palette } from './palettes';
import { makeShadows, radius, spacing, typography } from './tokens';

export interface Theme {
  colors: Palette;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: ReturnType<typeof makeShadows>;
}

interface ThemeContextValue {
  theme: Theme;
  setPaletteById: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isDarkPalette(palette: Palette): boolean {
  return palette.id === 'noche-serena';
}

export function buildTheme(palette: Palette): Theme {
  return {
    colors: palette,
    isDark: isDarkPalette(palette),
    spacing,
    radius,
    typography,
    shadows: makeShadows(palette.shadow),
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteId] = useState<string>(PASTEL_BLOOM.id);

  const theme = useMemo(() => buildTheme(getPaletteById(paletteId)), [paletteId]);

  const value = useMemo(
    () => ({ theme, setPaletteById: setPaletteId }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useNavigationTheme(): NavigationTheme {
  const { theme } = useTheme();

  return useMemo<NavigationTheme>(
    () => ({
      ...DefaultTheme,
      dark: theme.isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.primaryStrong,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.divider,
        notification: theme.colors.primary,
      },
    }),
    [theme],
  );
}