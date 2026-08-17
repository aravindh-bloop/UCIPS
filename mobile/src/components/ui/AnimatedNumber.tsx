import { useEffect, useState } from 'react';
import { TextStyle } from 'react-native';
import { useAnimatedReaction, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { duration, easing, TypographyVariant } from '../../theme';
import { Text } from './Text';

interface AnimatedNumberProps {
  value: number;
  /** Decimal places in the rendered output. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Format with Indian digit grouping (1,00,000) -- used for rupee amounts. */
  grouped?: boolean;
  variant?: TypographyVariant;
  color?: string;
  style?: TextStyle;
}

/**
 * Counts up to `value` on mount and whenever it changes. The driving value lives on the UI
 * thread; only the formatted string is pushed back to JS, on change.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  grouped = false,
  variant = 'h2',
  color,
  style,
}: AnimatedNumberProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, { duration: duration.slower, easing: easing.standard });
  }, [value, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    },
    [],
  );

  const formatted = grouped
    ? display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display.toFixed(decimals);

  return (
    <Text variant={variant} color={color} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}
