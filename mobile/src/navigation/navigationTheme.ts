import { DefaultTheme, Theme } from '@react-navigation/native';
import { palette } from '../theme';

/** Keeps React Navigation's own chrome (screen backgrounds, card edges) on-palette. */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    border: palette.border,
    notification: palette.danger,
  },
};
