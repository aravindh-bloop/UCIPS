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
  icon?: string;
  containerStyle?: ViewStyle;
  multilineHeight?: number;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  value,
  multiline,
  multilineHeight = 110,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
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
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
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
  inputMultiline: { textAlignVertical: 'top', minHeight: 70 },
  error: { marginTop: spacing.xs, marginLeft: spacing.xs },
});
