import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette, radii, spacing, shadows } from '../../theme';
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
  icon?: string; // Ionicon name or emoji
  style?: ViewStyle;
}

export function StatCard({ label, value, decimals, prefix, suffix, grouped, color = palette.primary, icon, style }: StatCardProps) {
  const isIonicon = icon && icon.length > 2;

  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          {isIonicon ? (
            <Ionicons name={icon as any} size={20} color={palette.white} />
          ) : (
            <Text style={styles.emoji}>{icon}</Text>
          )}
        </View>
      ) : null}
      
      <AnimatedNumber
        value={value}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        grouped={grouped}
        variant="h1" // Make the number very large
        color={palette.text}
        style={styles.number}
      />
      
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

export function StatRow({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 18 },
  number: { marginBottom: spacing.xs },
});
