import React from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card } from '../../components/ui';
import { palette, radii, spacing } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Notifications'>;

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Report Resolved',
    message: 'Your report regarding the broken streetlight on Main St has been resolved.',
    time: '2h ago',
    icon: 'checkmark-circle',
    color: palette.success,
  },
  {
    id: '2',
    title: 'New Hotspot Identified',
    message: 'Multiple reports of flooding in Downtown area. Authorities have been alerted.',
    time: '5h ago',
    icon: 'warning',
    color: palette.warning,
  },
  {
    id: '3',
    title: 'Project Approved',
    message: 'The proposed road repair project in your neighborhood has been approved for budget.',
    time: '1d ago',
    icon: 'construct',
    color: palette.primary,
  },
];

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>
        <Text variant="h2">Notifications</Text>
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
                  <Text variant="label">{item.title}</Text>
                  <Text variant="caption" faint>{item.time}</Text>
                </View>
                <Text variant="bodySm" muted style={styles.message}>{item.message}</Text>
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
