import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radii, spacing } from '../../theme';
import { AnimatedNumber } from './AnimatedNumber';
import { Text } from './Text';

interface StatCardProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  grouped?: boolean;
  color?: string;
  icon?: string;
  style?: ViewStyle;
}

/** Compact metric tile with a count-up value. Used in headers and summary rows. */
export function StatCard({ label, value, decimals, prefix, suffix, grouped, color = palette.primary, icon, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <AnimatedNumber
        value={value}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        grouped={grouped}
        variant="h2"
        color={color}
      />
      <Text variant="caption" muted numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatRow({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  icon: { fontSize: 15, marginBottom: spacing.xxs },
});
