import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { gradients, palette, radii, shadows, spacing, spring } from '../../theme';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const SIZES: Record<Size, { height: number; paddingH: number; variant: 'label' | 'h3' }> = {
  sm: { height: 38, paddingH: spacing.base, variant: 'label' },
  md: { height: 50, paddingH: spacing.lg, variant: 'label' },
  lg: { height: 56, paddingH: spacing.xl, variant: 'h3' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isInactive = disabled || loading;
  const dims = SIZES[size];

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const gradientFor: Partial<Record<Variant, readonly [string, string, ...string[]]>> = {
    primary: gradients.primary,
    danger: gradients.danger,
    success: gradients.success,
  };
  const gradient = gradientFor[variant];

  const solidBg: Record<Variant, string> = {
    primary: 'transparent',
    danger: 'transparent',
    success: 'transparent',
    secondary: palette.primarySoft,
    ghost: 'transparent',
  };

  const labelColor: Record<Variant, string> = {
    primary: palette.white,
    danger: palette.white,
    success: palette.white,
    secondary: palette.primary,
    ghost: palette.textMuted,
  };

  const content = (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator color={labelColor[variant]} size="small" />
      ) : (
        <>
          {icon ? <Text variant={dims.variant} color={labelColor[variant]}>{`${icon}  `}</Text> : null}
          <Text variant={dims.variant} color={labelColor[variant]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const shell: ViewStyle = {
    height: dims.height,
    paddingHorizontal: dims.paddingH,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isInactive ? 0.55 : 1,
  };

  return (
    <AnimatedPressable
      disabled={isInactive}
      style={[shell, animatedStyle, variant === 'primary' && !isInactive ? shadows.primary : null, style]}
      onPressIn={() => {
        scale.value = withSpring(0.96, spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.press);
      }}
      onPress={() => {
        haptics.press();
        onPress();
      }}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radii.xl }]} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: solidBg[variant], borderRadius: radii.xl }]} />
      )}
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
