import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as hotspotsApi from '../../api/hotspots';
import { ClusterOut } from '../../api/types';
import { Card, EmptyState, ScoreBar, SkeletonList, StatCard, StatRow, Text, useToast } from '../../components/ui';
import { AuthorityTabScreenProps } from '../../navigation/types';
import { categoryStyle, palette, radii, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';

type Props = AuthorityTabScreenProps<'Hotspots'>;

export default function HotspotsScreen({ navigation }: Props) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [hotspots, setHotspots] = useState<ClusterOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setHotspots(await hotspotsApi.list());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load hotspots');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const complaints = hotspots.reduce((sum, h) => sum + h.complaint_count, 0);
    const topDemand = hotspots.reduce((m, h) => Math.max(m, h.demand_score), 0);
    return { hotspots: hotspots.length, complaints, topDemand };
  }, [hotspots]);

  const maxDemand = Math.max(stats.topDemand, 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={loading ? [] : hotspots}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.primary} colors={[palette.primary]} />
        }
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
              <Text variant="h1">Demand Hotspots</Text>
              <Text variant="bodySm" muted style={styles.subtitle}>
                Clustered citizen reports, ranked by demand
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <StatRow style={styles.stats}>
                <StatCard label="Hotspots" value={stats.hotspots} icon="🔥" />
                <StatCard label="Reports" value={stats.complaints} icon="📝" color={palette.info} />
                <StatCard label="Top demand" value={stats.topDemand} decimals={1} icon="📈" color={palette.accent} />
              </StatRow>
            </Animated.View>

            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="🗺️" title="No hotspots yet" message="Hotspots form once enough nearby reports share a category." />}
        renderItem={({ item, index }) => {
          const cat = categoryStyle(item.category);
          return (
            <Animated.View entering={FadeInDown.delay(stagger(index)).duration(420)}>
              <Card accent={cat.color} style={styles.card} onPress={() => navigation.navigate('HotspotDetail', { clusterId: item.id })}>
                <View style={styles.cardTop}>
                  <View style={[styles.rank, { backgroundColor: cat.soft }]}>
                    <Text variant="label" color={cat.color}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.cardHeadings}>
                    <Text variant="h3" numberOfLines={1}>
                      {cat.icon} {cat.label}
                    </Text>
                    <Text variant="caption" faint>
                      {item.ward_name} · {item.complaint_count} reports
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={palette.textFaint} />
                </View>

                <ScoreBar
                  label="Demand score"
                  value={item.demand_score}
                  max={maxDemand}
                  color={cat.color}
                  decimals={1}
                  delay={stagger(index) + 120}
                  style={styles.bar}
                />

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={palette.textFaint} />
                  <Text variant="caption" faint>
                    {` ${item.centroid_lat.toFixed(4)}, ${item.centroid_lng.toFixed(4)}`}
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
  rank: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.sm },
  cardHeadings: { flex: 1, marginLeft: spacing.md },
  bar: { marginTop: spacing.base },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
});
