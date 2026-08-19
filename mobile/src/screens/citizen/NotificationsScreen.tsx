import React from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card } from '../../components/ui';
import { useLanguage } from '../../i18n';
import { palette, radii, spacing } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Notifications'>;

/** Demo/placeholder notification feed -- there's no real notification backend yet, these are
 * illustrative sample entries. */
const MOCK_NOTIFICATIONS = [
  { id: '1', titleKey: 'notifications.mock1Title', messageKey: 'notifications.mock1Message', timeKey: 'notifications.time2h', icon: 'checkmark-circle', color: palette.success },
  { id: '2', titleKey: 'notifications.mock2Title', messageKey: 'notifications.mock2Message', timeKey: 'notifications.time5h', icon: 'warning', color: palette.warning },
  { id: '3', titleKey: 'notifications.mock3Title', messageKey: 'notifications.mock3Message', timeKey: 'notifications.time1d', icon: 'construct', color: palette.primary },
] as const;

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text variant="h2">{t('notifications.title')}</Text>
      </View>

      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.textContainer}>
                <View style={styles.cardHeader}>
                  <Text variant="label">{t(item.titleKey)}</Text>
                  <Text variant="caption" faint>{t(item.timeKey)}</Text>
                </View>
                <Text variant="bodySm" muted style={styles.message}>{t(item.messageKey)}</Text>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs },
  list: { padding: spacing.base },
  card: { marginBottom: spacing.md },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  message: { lineHeight: 20 },
});
