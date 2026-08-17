import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { palette, radii, shadows, spacing, spring } from '../../theme';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/** Sliding-pill segmented control. Used for the complaint text/voice/photo mode switcher. */
export function SegmentedControl<T extends string>({ segments, value, onChange, style }: SegmentedControlProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const translateX = useSharedValue(0);

  const segmentWidth = width > 0 ? (width - PADDING * 2) / segments.length : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    const sw = (w - PADDING * 2) / segments.length;
    translateX.value = index * sw;
  };

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.pill, { width: segmentWidth }, pillStyle, shadows.sm]} />
      ) : null}
      {segments.map((segment, i) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            style={styles.segment}
            onPress={() => {
              if (selected) return;
              haptics.select();
              translateX.value = withSpring(i * segmentWidth, spring.smooth);
              onChange(segment.value);
            }}
          >
            <Text variant="label" color={selected ? palette.primary : palette.textMuted}>
              {segment.icon ? `${segment.icon}  ` : ''}
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PADDING = 4;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.md,
    padding: PADDING,
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    bottom: PADDING,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
});
