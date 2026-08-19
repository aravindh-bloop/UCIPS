import { StyleSheet, View, ViewStyle } from 'react-native';
import { useLanguage } from '../../i18n';
import { TranslationKey } from '../../i18n/en';
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
  const { t } = useLanguage();
  const s = categoryStyle(category);
  const key = category && (`category.${category}` as TranslationKey);
  const label = key ? t(key) : s.label;
  return <Chip label={label} color={s.color} soft={s.soft} icon={s.icon} size={size} style={style} />;
}

export function SeverityChip({ severity, size, style }: { severity: number | null | undefined; size?: 'sm' | 'md'; style?: ViewStyle }) {
  const { t } = useLanguage();
  const s = severityStyle(severity);
  const label = severity ? t(`severity.${severity}` as TranslationKey) : t('severity.unknown');
  return <Chip label={severity ? `${label} · ${severity}/5` : label} color={s.color} soft={s.soft} size={size} style={style} />;
}

export function StatusChip({ status, size, style }: { status: string | null | undefined; size?: 'sm' | 'md'; style?: ViewStyle }) {
  const { t } = useLanguage();
  const s = statusStyle(status);
  const key = status && (`status.${status}` as TranslationKey);
  const label = key ? t(key) : s.label;
  return <Chip label={label} color={s.color} soft={s.soft} size={size} style={style} />;
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
