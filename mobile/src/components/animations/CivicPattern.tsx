import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { palette } from '../../theme';

interface CivicPatternProps {
  opacity?: number;
}

const DOTS = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  size: Math.random() * 6 + 4,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  duration: Math.random() * 3000 + 4000,
  delay: Math.random() * 2000,
}));

function FloatingDot({ dot }: { dot: typeof DOTS[0] }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: dot.duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: dot.duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: dot.duration * 0.8, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: dot.duration * 0.8, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: dot.size,
          height: dot.size,
          left: dot.left as any,
          top: dot.top as any,
        },
        style,
      ]}
    />
  );
}

export function CivicPattern({ opacity = 1 }: CivicPatternProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents="none">
      {DOTS.map((dot) => (
        <FloatingDot key={dot.id} dot={dot} />
      ))}
      <View style={styles.gridOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: -1,
  },
  dot: {
    position: 'absolute',
    backgroundColor: palette.primaryLight,
    borderRadius: 999,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.bg,
    opacity: 0.85, // Softens the dots, makes them fade into the background
  },
});
