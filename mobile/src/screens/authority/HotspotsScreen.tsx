import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as hotspotsApi from '../../api/hotspots';
import { ClusterOut } from '../../api/types';
import { HotspotMap } from '../../components/HotspotMap';
import {
  Button,
  Card,
  EmptyState,
  ScoreBar,
  SegmentedControl,
  SkeletonList,
  StatCard,
  StatRow,
  Text,
  useToast,
  type Segment,
} from '../../components/ui';
import { AuthorityTabScreenProps } from '../../navigation/types';
import { categoryStyle, palette, radii, shadows, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';
import { useLanguage } from '../../i18n';

type Props = AuthorityTabScreenProps<'Hotspots'>;
type ViewMode = 'list' | 'map';

export default function HotspotsScreen({ navigation }: Props) {
  const toast = useToast();
  const { t } = useLanguage();
  const viewModes: Segment<ViewMode>[] = [
    { value: 'list', label: t('common.list'), icon: '📋' },
    { value: 'map', label: t('common.map'), icon: '🗺️' },
  ];
  const insets = useSafeAreaInsets();
  const [hotspots, setHotspots] = useState<ClusterOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<ClusterOut | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setHotspots(await hotspotsApi.list());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('hotspots.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, t],
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

  const header = (
    <View>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{t('hotspots.title')}</Text>
        <Text variant="bodySm" muted style={styles.subtitle}>
          {t('hotspots.subtitle')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(420)}>
        <StatRow style={styles.stats}>
          <StatCard label={t('hotspots.statHotspots')} value={stats.hotspots} icon="🔥" />
          <StatCard label={t('hotspots.statReports')} value={stats.complaints} icon="📝" color={palette.info} />
          <StatCard label={t('hotspots.statTopDemand')} value={stats.topDemand} decimals={1} icon="📈" color={palette.accent} />
        </StatRow>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(420)}>
        <SegmentedControl
          segments={viewModes}
          value={viewMode}
          onChange={(v) => {
            setSelected(null);
            setViewMode(v);
          }}
          style={styles.toggle}
        />
      </Animated.View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.list}>
          {header}
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  if (viewMode === 'map') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.list}>{header}</View>
        <View style={[styles.mapWrap, { marginBottom: TAB_BAR_HEIGHT + insets.bottom }]}>
          {hotspots.length === 0 ? (
            <EmptyState icon="🗺️" title={t('nearby.noHotspotsTitle')} message={t('hotspots.noHotspotsMessage')} />
          ) : (
            <>
              <HotspotMap hotspots={hotspots} onSelectHotspot={setSelected} />
              {selected ? (
                <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOut.duration(160)} style={[styles.previewCard, shadows.xl]}>
                  <SelectedHotspotPreview
                    hotspot={selected}
                    maxDemand={maxDemand}
                    onViewDetails={() => navigation.navigate('HotspotDetail', { clusterId: selected.id })}
                    onDismiss={() => setSelected(null)}
                  />
                </Animated.View>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={hotspots}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.primary} colors={[palette.primary]} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="🗺️" title={t('nearby.noHotspotsTitle')} message={t('hotspots.noHotspotsMessage')} />}
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
                  label={t('hotspots.demandScore')}
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

function SelectedHotspotPreview({
  hotspot,
  maxDemand,
  onViewDetails,
  onDismiss,
}: {
  hotspot: ClusterOut;
  maxDemand: number;
  onViewDetails: () => void;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  const cat = categoryStyle(hotspot.category);
  return (
    <View style={styles.preview}>
      <View style={styles.previewTop}>
        <View style={[styles.previewIcon, { backgroundColor: cat.soft }]}>
          <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
        </View>
        <View style={styles.previewHeadings}>
          <Text variant="h3" numberOfLines={1}>
            {cat.label}
          </Text>
          <Text variant="caption" faint>
            {hotspot.ward_name} · {hotspot.complaint_count} reports
          </Text>
        </View>
        <Ionicons name="close-circle" size={22} color={palette.textFaint} onPress={onDismiss} />
      </View>
      <ScoreBar label={t('hotspots.demandScore')} value={hotspot.demand_score} max={maxDemand} color={cat.color} decimals={1} style={styles.previewBar} />
      <Button title={t('common.viewComplaints')} onPress={onViewDetails} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base },
  header: { paddingTop: spacing.md, paddingBottom: spacing.base },
  subtitle: { marginTop: spacing.xxs },
  stats: { marginBottom: spacing.lg },
  toggle: { marginBottom: spacing.base },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  rank: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.sm },
  cardHeadings: { flex: 1, marginLeft: spacing.md },
  bar: { marginTop: spacing.base },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },

  mapWrap: { flex: 1, marginHorizontal: spacing.base, position: 'relative' },
  previewCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.base,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  preview: {},
  previewTop: { flexDirection: 'row', alignItems: 'center' },
  previewIcon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  previewHeadings: { flex: 1, marginLeft: spacing.md },
  previewBar: { marginTop: spacing.base, marginBottom: spacing.base },
});
