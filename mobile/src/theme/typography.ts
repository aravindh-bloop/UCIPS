import { TextStyle } from 'react-native';

/**
 * Outfit -- a clean, geometric sans-serif that reads as polished and premium.
 * Wider weight range than Plus Jakarta Sans allows finer typographic hierarchy.
 */
export const fonts = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'overline'
  | 'mono';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 42, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 27, lineHeight: 35, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 29, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 25, letterSpacing: -0.1 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 23 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 18, letterSpacing: 0.1 },
  caption: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  mono: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
};
