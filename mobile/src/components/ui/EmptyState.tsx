import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette, radii, spacing, shadows } from '../../theme';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: string; // We will use Ionicons names if provided, fallback to emoji if it's an emoji
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'clipboard-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const isIonicon = icon.length > 2; // naive check

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={styles.iconCircle}>
        {isIonicon ? (
          <Ionicons name={icon as any} size={42} color={palette.primary} />
        ) : (
          <Text style={styles.emoji}>{icon}</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text variant="h3" style={styles.title}>
          {title}
        </Text>
        {message ? (
          <Text variant="bodySm" muted style={styles.message}>
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable style={styles.actionRow} onPress={onAction}>
            <Text variant="label" color={palette.primary}>
              {actionLabel}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={palette.primary} style={styles.actionIcon} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: radii.pill,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  emoji: { fontSize: 38 },
  content: { flex: 1, justifyContent: 'center' },
  title: { marginBottom: spacing.xs },
  message: { marginBottom: spacing.md, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { marginLeft: spacing.xs },
});
