import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as hotspotsApi from '../../api/hotspots';
import { ClusterOut } from '../../api/types';
import { HotspotMap } from '../../components/HotspotMap';
import {
  Card,
  EmptyState,
  ScoreBar,
  SegmentedControl,
  SkeletonList,
  Text,
  useToast,
  type Segment,
} from '../../components/ui';
import { categoryStyle, palette, radii, shadows, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';
import { useLanguage } from '../../i18n';

interface HotspotWithDistance extends ClusterOut {
  distanceKm: number | null;
}

type ViewMode = 'list' | 'map';

/** Haversine distance in km -- accurate enough at city scale. */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyHotspotsScreen() {
  const toast = useToast();
  const { t } = useLanguage();
  const viewModes: Segment<ViewMode>[] = [
    { value: 'list', label: t('common.list'), icon: '📋' },
    { value: 'map', label: t('common.map'), icon: '🗺️' },
  ];
  const insets = useSafeAreaInsets();
  const [hotspots, setHotspots] = useState<HotspotWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<HotspotWithDistance | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const list = await hotspotsApi.list();

        let myLat: number | null = null;
        let myLng: number | null = null;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({});
          myLat = position.coords.latitude;
          myLng = position.coords.longitude;
          setLocationDenied(false);
        } else {
          setLocationDenied(true);
        }

        const withDistance: HotspotWithDistance[] = list.map((h) => ({
          ...h,
          distanceKm: myLat !== null && myLng !== null ? distanceKm(myLat, myLng, h.centroid_lat, h.centroid_lng) : null,
        }));

        withDistance.sort((a, b) => {
          if (a.distanceKm === null || b.distanceKm === null) return b.demand_score - a.demand_score;
          return a.distanceKm - b.distanceKm;
        });

        setHotspots(withDistance);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('nearby.loadError'));
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

  const maxDemand = hotspots.reduce((m, h) => Math.max(m, h.demand_score), 1);

  const header = (
    <View>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{t('nearby.title')}</Text>
        <Text variant="bodySm" muted style={styles.subtitle}>
          {t('nearby.subtitle')}
        </Text>
      </Animated.View>

      {locationDenied ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={15} color={palette.warning} />
          <Text variant="caption" color={palette.warning} style={styles.noticeText}>
            {t('common.locationOff')}
          </Text>
        </View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(60).duration(420)}>
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

      {loading ? <SkeletonList count={3} /> : null}
    </View>
  );

  if (!loading && viewMode === 'map') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.list}>{header}</View>
        <View style={[styles.mapWrap, { marginBottom: TAB_BAR_HEIGHT + insets.bottom }]}>
          {hotspots.length === 0 ? (
            <EmptyState icon="🗺️" title={t('nearby.noHotspotsTitle')} message={t('nearby.noHotspotsMessage')} />
          ) : (
            <>
              <HotspotMap hotspots={hotspots} onSelectHotspot={(cluster) => setSelected(cluster as HotspotWithDistance)} />
              {selected ? (
                <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOut.duration(160)} style={[styles.previewCard, shadows.xl]}>
                  <MapPreview hotspot={selected} maxDemand={maxDemand} onDismiss={() => setSelected(null)} />
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
        data={loading ? [] : hotspots}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.primary} colors={[palette.primary]} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="🗺️" title={t('nearby.noHotspotsTitle')} message={t('nearby.noHotspotsMessage')} />
          )
        }
        renderItem={({ item, index }) => {
          const cat = categoryStyle(item.category);
          return (
            <Animated.View entering={FadeInDown.delay(stagger(index)).duration(420)}>
              <Card accent={cat.color} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.icon, { backgroundColor: cat.soft }]}>
                    <Text style={styles.iconText}>{cat.icon}</Text>
                  </View>
                  <View style={styles.cardHeadings}>
                    <Text variant="label">{cat.label}</Text>
                    <Text variant="caption" faint>
                      {item.ward_name}
                      {item.distanceKm !== null ? ` · ${t('common.kmAway', { distance: item.distanceKm.toFixed(1) })}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.countPill, { backgroundColor: cat.soft }]}>
                    <Text variant="label" color={cat.color}>
                      {item.complaint_count}
                    </Text>
                    <Text variant="caption" color={cat.color}>
                      {t('nearby.reports')}
                    </Text>
                  </View>
                </View>

                <ScoreBar
                  label={t('nearby.communityDemand')}
                  value={item.demand_score}
                  max={maxDemand}
                  color={cat.color}
                  decimals={1}
                  delay={stagger(index) + 120}
                  style={styles.bar}
                />
              </Card>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

function MapPreview({ hotspot, maxDemand, onDismiss }: { hotspot: HotspotWithDistance; maxDemand: number; onDismiss: () => void }) {
  const { t } = useLanguage();
  const cat = categoryStyle(hotspot.category);
  return (
    <View>
      <View style={styles.previewTop}>
        <View style={[styles.icon, { backgroundColor: cat.soft }]}>
          <Text style={styles.iconText}>{cat.icon}</Text>
        </View>
        <View style={styles.previewHeadings}>
          <Text variant="h3" numberOfLines={1}>
            {cat.label}
          </Text>
          <Text variant="caption" faint>
            {hotspot.ward_name} · {hotspot.complaint_count} {t('nearby.reports')}
            {hotspot.distanceKm !== null ? ` · ${t('common.kmAway', { distance: hotspot.distanceKm.toFixed(1) })}` : ''}
          </Text>
        </View>
        <Ionicons name="close-circle" size={22} color={palette.textFaint} onPress={onDismiss} />
      </View>
      <ScoreBar label={t('nearby.communityDemand')} value={hotspot.demand_score} max={maxDemand} color={cat.color} decimals={1} style={styles.previewBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base },
  header: { paddingTop: spacing.md, paddingBottom: spacing.base },
  subtitle: { marginTop: spacing.xxs },
  toggle: { marginTop: spacing.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.warningSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: { flex: 1 },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  cardHeadings: { flex: 1, marginLeft: spacing.md },
  countPill: { alignItems: 'center', borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  bar: { marginTop: spacing.base },

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
  previewTop: { flexDirection: 'row', alignItems: 'center' },
  previewHeadings: { flex: 1, marginLeft: spacing.md },
  previewBar: { marginTop: spacing.base },
});
