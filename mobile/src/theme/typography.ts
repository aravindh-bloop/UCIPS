import { TextStyle } from 'react-native';

/**
 * Font family keys map to the names registered in App.tsx via useFonts().
 * Plus Jakarta Sans -- geometric, slightly rounded, reads as premium and is clearly
 * distinct from the platform default (which is the biggest "prototype" tell in RN apps).
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
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
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 41, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 27, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 18, letterSpacing: -0.1 },
  caption: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  mono: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
};
