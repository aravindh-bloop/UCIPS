import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as complaintsApi from '../../api/complaints';
import { ComplaintOut } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  Card,
  CategoryChip,
  EmptyState,
  SkeletonList,
  StatCard,
  StatRow,
  StatusChip,
  Text,
  useToast,
} from '../../components/ui';
import { AuthorityTabScreenProps } from '../../navigation/types';
import { categoryStyle, palette, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';
import { useLanguage } from '../../i18n';

type Props = AuthorityTabScreenProps<'Reports'>;

export default function AllComplaintsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const toast = useToast();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<ComplaintOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      try {
        setComplaints(await complaintsApi.listAll(token));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('reports.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, toast, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const clustered = complaints.filter((c) => c.status === 'clustered').length;
    const processed = complaints.filter((c) => c.status === 'processed').length;
    return { total: complaints.length, clustered, processed };
  }, [complaints]);

  const channelLabel = (channel: string) =>
    channel === 'voice' ? `🎤 ${t('common.voice')}` : channel === 'image' ? `📷 ${t('common.photo')}` : channel === 'phone' ? `☎️ ${t('common.phone')}` : `📝 ${t('common.text')}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={loading ? [] : complaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.primary} colors={[palette.primary]} />
        }
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
              <Text variant="h1">{t('reports.title')}</Text>
              <Text variant="bodySm" muted style={styles.subtitle}>
                {t('reports.subtitle')}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <StatRow style={styles.stats}>
                <StatCard label={t('reports.total')} value={stats.total} icon="📝" />
                <StatCard label={t('reports.inHotspots')} value={stats.clustered} icon="🔥" color={palette.accent} />
                <StatCard label={t('reports.processed')} value={stats.processed} icon="⚙️" color={palette.info} />
              </StatRow>
            </Animated.View>

            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : <EmptyState icon="📭" title={t('reports.emptyTitle')} message={t('reports.emptyMessage')} />
        }
        renderItem={({ item, index }) => {
          const cat = categoryStyle(item.category);
          const created = new Date(item.created_at);
          const when = created.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' });

          return (
            <Animated.View entering={FadeInDown.delay(stagger(index)).duration(420)}>
              <Card accent={cat.color} style={styles.card} onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}>
                <View style={styles.cardTop}>
                  <View style={[styles.rowIcon, { backgroundColor: cat.soft }]}>
                    <Text style={styles.rowIconText}>{cat.icon}</Text>
                  </View>
                  <View style={styles.cardHeadings}>
                    <Text variant="label" numberOfLines={1}>
                      {item.reference_code}
                    </Text>
                    <Text variant="caption" faint>
                      {cat.label} · {channelLabel(item.channel)} · {when}
                    </Text>
                  </View>
                  <StatusChip status={item.status} size="sm" />
                </View>

                <Text variant="bodySm" muted numberOfLines={2} style={styles.description}>
                  {item.description ?? item.raw_text ?? item.transcript ?? '—'}
                </Text>

                <View style={styles.metaRow}>
                  <Text variant="caption" faint>
                    {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                  </Text>
                </View>
              </Card>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base },
  header: { paddingTop: spacing.md, paddingBottom: spacing.base },
  subtitle: { marginTop: spacing.xxs },
  stats: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontSize: 18 },
  cardHeadings: { flex: 1, marginLeft: spacing.md },
  description: { marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
});
