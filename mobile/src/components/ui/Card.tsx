import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { palette, radii, shadows, spacing, spring } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Left accent stripe -- used to carry a category's color identity onto the card. */
  accent?: string;
  disabled?: boolean;
}

export function Card({ children, onPress, style, padded = true, elevation = 'md', accent, disabled }: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = [
    styles.card,
    shadows[elevation],
    padded && styles.padded,
    accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
    style,
  ];

  if (!onPress) {
    return <Animated.View style={base}>{children}</Animated.View>;
  }

  return (
    <AnimatedPressable
      style={[base, animatedStyle]}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.975, spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.press);
      }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  padded: { padding: spacing.base },
});
