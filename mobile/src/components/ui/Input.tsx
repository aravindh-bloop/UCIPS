import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { duration, fonts, palette, radii, spacing } from '../../theme';
import { Text } from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  /** @deprecated use `iconName` for a real vector icon instead of an emoji glyph. */
  icon?: string;
  /** Ionicons glyph name, rendered as a real vector icon rather than an emoji. */
  iconName?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  multilineHeight?: number;
}

export function Input({
  label,
  error,
  icon,
  iconName,
  containerStyle,
  value,
  multiline,
  multilineHeight = 110,
  onFocus,
  onBlur,
  placeholder,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  // The floating label is the only prompt shown inside the field itself, so it never has to
  // share space with a native placeholder. Any `placeholder` text is rendered as a separate
  // example caption below the field instead (only while it's empty).
  const active = focused || !!value;

  const progress = useSharedValue(active ? 1 : 0);
  const focusAmount = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: duration.fast });
  }, [active, progress]);

  useEffect(() => {
    focusAmount.value = withTiming(focused ? 1 : 0, { duration: duration.fast });
  }, [focused, focusAmount]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -10]) }],
    fontSize: interpolate(progress.value, [0, 1], [14.5, 11.5]),
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? palette.danger
      : interpolateColor(focusAmount.value, [0, 1], [palette.border, palette.primary]),
    backgroundColor: interpolateColor(focusAmount.value, [0, 1], [palette.surfaceAlt, palette.surface]),
  }));

  return (
    <View style={containerStyle}>
      <Animated.View
        style={[
          styles.wrapper,
          wrapperStyle,
          multiline ? { height: multilineHeight, alignItems: 'flex-start', paddingTop: spacing.base } : null,
        ]}
      >
        {iconName ? (
          <Ionicons name={iconName} size={18} color={palette.textMuted} style={styles.vectorIcon} />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : null}
        <View style={styles.fieldCol}>
          <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
            {label}
          </Animated.Text>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={value}
            multiline={multiline}
            placeholderTextColor={palette.textFaint}
            selectionColor={palette.primary}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
        </View>
      </Animated.View>
      {error ? (
        <Text variant="caption" color={palette.danger} style={styles.error}>
          {error}
        </Text>
      ) : !error && placeholder && !value ? (
        <Text variant="caption" faint style={styles.error} numberOfLines={1}>
          {placeholder}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
  },
  icon: { fontSize: 17, marginRight: spacing.sm },
  vectorIcon: { marginRight: spacing.sm },
  fieldCol: { flex: 1, justifyContent: 'center' },
  label: {
    fontFamily: fonts.medium,
    color: palette.textMuted,
    position: 'absolute',
    left: 0,
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: palette.text,
    paddingVertical: 0,
    marginTop: 12,
    minHeight: 22,
  },
  inputMultiline: { textAlignVertical: 'top', minHeight: 70, marginTop: 20 },
  error: { marginTop: spacing.xs, marginLeft: spacing.xs },
});
