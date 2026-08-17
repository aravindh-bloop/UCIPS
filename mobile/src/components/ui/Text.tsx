import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { palette, typography, TypographyVariant } from '../../theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
  /** Convenience for the common muted-secondary-text case. */
  muted?: boolean;
  faint?: boolean;
}

export function Text({ variant = 'body', color, center, muted, faint, style, ...rest }: TextProps) {
  const resolved = color ?? (faint ? palette.textFaint : muted ? palette.textMuted : palette.text);
  const base: TextStyle = { ...typography[variant], color: resolved };
  if (center) base.textAlign = 'center';
  return <RNText style={[base, style]} {...rest} />;
}
