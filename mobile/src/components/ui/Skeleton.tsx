import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette, radii, spacing } from '../../theme';

const SHIMMER_WIDTH = 160;

/** A single shimmering placeholder block. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.xs,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const x = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(400, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [x]);

  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[{ width, height, borderRadius: radius, backgroundColor: palette.surfaceSunken, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_WIDTH, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

/** Card-shaped skeleton matching the real list rows, so the swap-in isn't jarring. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} radius={radii.md} />
        <View style={styles.rowBody}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="85%" height={11} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
      <Skeleton width="100%" height={11} style={{ marginTop: spacing.md }} />
      <Skeleton width="40%" height={11} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, marginLeft: spacing.md },
});
