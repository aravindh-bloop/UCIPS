import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { palette, radii, spacing } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text variant="h3" center style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" muted center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} size="sm" fullWidth={false} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 32 },
  title: { marginTop: spacing.base },
  message: { marginTop: spacing.xs, maxWidth: 280 },
  action: { marginTop: spacing.lg },
});
