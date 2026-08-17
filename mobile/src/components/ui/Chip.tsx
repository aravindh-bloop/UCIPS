import { StyleSheet, View, ViewStyle } from 'react-native';
import { categoryStyle, radii, severityStyle, spacing, statusStyle } from '../../theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  color: string;
  soft: string;
  icon?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Chip({ label, color, soft, icon, size = 'md', style }: ChipProps) {
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: soft,
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: small ? 10 : 12 }}>{`${icon} `}</Text> : null}
      <Text variant="caption" color={color} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

export function CategoryChip({ category, size, style }: { category: string | null | undefined; size?: 'sm' | 'md'; style?: ViewStyle }) {
  const s = categoryStyle(category);
  return <Chip label={s.label} color={s.color} soft={s.soft} icon={s.icon} size={size} style={style} />;
}

export function SeverityChip({ severity, size, style }: { severity: number | null | undefined; size?: 'sm' | 'md'; style?: ViewStyle }) {
  const s = severityStyle(severity);
  return <Chip label={severity ? `${s.label} · ${severity}/5` : s.label} color={s.color} soft={s.soft} size={size} style={style} />;
}

export function StatusChip({ status, size, style }: { status: string | null | undefined; size?: 'sm' | 'md'; style?: ViewStyle }) {
  const s = statusStyle(status);
  return <Chip label={s.label} color={s.color} soft={s.soft} size={size} style={style} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
  },
  label: { letterSpacing: 0.1 },
});
