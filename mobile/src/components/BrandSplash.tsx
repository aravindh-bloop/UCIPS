import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { duration, fonts, gradients, palette, radii, spacing, spring } from '../theme';

/**
 * Branded loading screen. Shown while fonts load and while the auth session is being
 * restored/revalidated. Note: in Expo Go the *native* splash is just the app icon
 * (Expo Go can't replicate a real splash since SDK 52), so this in-app screen is
 * effectively the app's launch experience during development and demos.
 *
 * Uses raw fontFamily rather than the <Text> primitive because it can render before
 * fonts have finished loading -- it must not depend on them.
 */
export default function BrandSplash({ message }: { message?: string }) {
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const ring = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: duration.base });
    logoScale.value = withSpring(1, spring.bouncy);
    textOpacity.value = withDelay(180, withTiming(1, { duration: duration.slow }));
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [logoOpacity, logoScale, ring, textOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.5,
    transform: [{ scale: 1 + ring.value * 0.85 }],
  }));

  const ringDelayedStyle = useAnimatedStyle(() => {
    const v = (ring.value + 0.5) % 1;
    return {
      opacity: (1 - v) * 0.35,
      transform: [{ scale: 1 + v * 0.85 }],
    };
  });

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.ring, ringDelayedStyle]} />
        <Animated.View style={logoStyle}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Text style={styles.logoMark}>U</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.title}>UCIPS</Text>
        <Text style={styles.subtitle}>{message ?? 'Citizen-led infrastructure'}</Text>
      </Animated.View>
    </View>
  );
}

const LOGO_SIZE = 92;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radii.xxl,
    backgroundColor: palette.primaryLight,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  logoMark: { color: palette.white, fontSize: 46, fontFamily: fonts.extrabold, marginTop: -2 },
  textWrap: { alignItems: 'center', marginTop: spacing.xl },
  title: { fontFamily: fonts.extrabold, fontSize: 26, color: palette.text, letterSpacing: 3 },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: palette.textMuted, marginTop: spacing.xs },
});
