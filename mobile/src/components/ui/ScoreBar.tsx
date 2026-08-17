import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { duration, easing, palette, spacing } from '../../theme';
import { Text } from './Text';

interface ScoreBarProps {
  label?: string;
  /** Current value. */
  value: number;
  /** Value corresponding to a full bar. */
  max?: number;
  color?: string;
  gradient?: readonly [string, string, ...string[]];
  showValue?: boolean;
  /** Decimals in the trailing value label. */
  decimals?: number;
  delay?: number;
  height?: number;
  style?: ViewStyle;
}

export function ScoreBar({
  label,
  value,
  max = 10,
  color = palette.primary,
  gradient,
  showValue = true,
  decimals = 1,
  delay = 0,
  height = 7,
  style,
}: ScoreBarProps) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(pct, { duration: duration.slower, easing: easing.standard }));
  }, [pct, delay, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={style}>
      {(label || showValue) && (
        <View style={styles.header}>
          {label ? (
            <Text variant="caption" muted>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showValue ? (
            <Text variant="caption" color={color} style={styles.value}>
              {value.toFixed(decimals)}
              <Text variant="caption" faint>{` / ${max}`}</Text>
            </Text>
          ) : null}
        </View>
      )}
      <View style={[styles.track, { height, borderRadius: height }]}>
        <Animated.View style={[styles.fill, fillStyle, { borderRadius: height }]}>
          {gradient ? (
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  value: { letterSpacing: 0.2 },
  track: { backgroundColor: palette.surfaceSunken, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', overflow: 'hidden' },
});
