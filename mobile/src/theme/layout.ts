import { ViewStyle } from 'react-native';
import { palette } from './colors';

/** 4pt base scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/**
 * Colored (indigo-tinted) shadows rather than neutral grey -- on a light theme this is
 * most of what separates a "premium" surface from a default React Native card.
 */
export const shadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl' | 'primary', ViewStyle> = {
  none: {},
  sm: {
    shadowColor: '#1E2A4A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1E2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1E2A4A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1E2A4A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 36,
    elevation: 14,
  },
  primary: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
};

/** Height of the custom tab bar's content, excluding the safe-area inset added at runtime. */
export const TAB_BAR_HEIGHT = 62;
