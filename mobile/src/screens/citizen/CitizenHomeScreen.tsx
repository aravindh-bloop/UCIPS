import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as complaintsApi from '../../api/complaints';
import { ComplaintOut } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  Card,
  CategoryChip,
  EmptyState,
  SeverityChip,
  SkeletonList,
  StatCard,
  StatRow,
  StatusChip,
  Text,
  useToast,
  HeroBanner,
} from '../../components/ui';
import { useLanguage } from '../../i18n';
import { localeForLanguage } from '../../i18n/locale';
import { TranslationKey } from '../../i18n/en';
import { CitizenTabScreenProps } from '../../navigation/types';
import { categoryStyle, palette, radii, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

type Props = CitizenTabScreenProps<'Home'>;

function greetingKey(): TranslationKey {
  const h = new Date().getHours();
  if (h < 12) return 'home.greetingMorning';
  if (h < 17) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

function QuickTile({ icon, label, color, iconColor, onPress, palette }: { icon: any, label: string, color: string, iconColor: string, onPress: () => void, palette: any }) {
  return (
    <Pressable style={[styles.quickTile, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={28} color={iconColor} style={{ marginBottom: spacing.xs }} />
      <Text variant="caption" center style={{ color: palette.text, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export default function CitizenHomeScreen({ navigation }: Props) {
  const { theme, toggleTheme, palette } = useAppTheme();
  const { token, user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<ComplaintOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode) {
          const area = geocode.city || geocode.subregion || geocode.region || geocode.name;
          if (area) setLocationName(area);
        }
      } catch (err) {
        console.warn('Failed to fetch location', err);
      }
    })();
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      try {
        setComplaints(await complaintsApi.listMine(token));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('home.errLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, toast],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const clustered = complaints.filter((c) => c.status === 'clustered').length;
    return { total: complaints.length, clustered, resolved };
  }, [complaints]);

  const firstName = (user?.name ?? '').split(' ')[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
      <FlatList
        data={loading ? [] : complaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <Pressable onPress={() => navigation.navigate('Menu')}>
                <Ionicons name="menu-outline" size={32} color={palette.text} />
              </Pressable>
              <View style={styles.topBarRight}>
                <Pressable style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={24} color={palette.text} />
                </Pressable>
                <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                  <Text variant="h3" style={{ color: palette.white }}>{firstName[0] || 'U'}</Text>
                </View>
              </View>
            </View>

            <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
              <Text variant="body" muted style={{ fontSize: 18, marginBottom: spacing.xs }}>
                {t(greetingKey())}
              </Text>
              <View style={styles.headerContent}>
                <View style={{ flex: 1 }}>
                  <Text variant="h1" style={{ fontSize: 32, color: palette.text }}>{firstName || t('home.citizen')} 👋</Text>
                  <Text variant="bodySm" muted style={{ marginTop: spacing.xs, color: palette.textMuted }}>
                    {t('home.tagline')}
                  </Text>
                </View>
                <Pressable style={[styles.themeToggle, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={toggleTheme}>
                  <Ionicons name="sunny" size={18} color={theme === 'light' ? palette.warning : palette.textMuted} />
                  <Ionicons name="moon" size={18} color={theme === 'dark' ? palette.accent : palette.textMuted} style={{ marginLeft: spacing.sm }} />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(40).duration(420)}>
              <HeroBanner onPress={() => navigation.navigate('Report')} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <StatRow style={styles.stats}>
                <StatCard label={t('home.statReports')} value={stats.total} icon="document-text" color={palette.primary} />
                <StatCard label={t('home.statHotspots')} value={stats.clustered} icon="flame" color={palette.warning} />
                <StatCard label={t('home.statResolved')} value={stats.resolved} icon="checkmark-circle" color={palette.success} />
              </StatRow>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(110).duration(420)}>
              <View style={styles.quickReportHeader}>
                <Text variant="h3">{t('home.quickReport')}</Text>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => navigation.navigate('Report')}>
                  <Text variant="label" color={palette.primary}>{t('home.viewAll')} </Text>
                  <Ionicons name="chevron-forward" size={12} color={palette.primary} />
                </Pressable>
              </View>
              <View style={styles.quickGrid}>
                <QuickTile icon="mic" label={t('home.voiceReport')} color="#F3E8FF" iconColor="#A855F7" onPress={() => navigation.navigate('Report', { initialMode: 'voice' })} palette={palette} />
                <QuickTile icon="camera" label={t('home.photoReport')} color="#E0F2FE" iconColor="#0EA5E9" onPress={() => navigation.navigate('Report', { initialMode: 'image' })} palette={palette} />
                <QuickTile icon="create" label={t('home.writeReport')} color="#DCFCE7" iconColor="#22C55E" onPress={() => navigation.navigate('Report', { initialMode: 'text' })} palette={palette} />
                <QuickTile icon="location" label={t('home.selectLocation')} color="#FEF3C7" iconColor="#F59E0B" onPress={() => navigation.navigate('Report', { initialMode: 'text' })} palette={palette} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(420)}>
              <Pressable
                style={[styles.financeCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => navigation.navigate('MyFinance')}
              >
                <View style={[styles.financeIcon, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="wallet-outline" size={22} color={palette.primary} />
                </View>
                <View style={styles.financeText}>
                  <Text variant="label">{t('finance.title')}</Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {t('finance.homeCardSubtitle')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(420)}>
              <Text variant="h3" style={styles.sectionLabel}>
                {t('home.recentActivity')}
              </Text>
            </Animated.View>

            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="clipboard-outline"
              title={t('home.emptyTitle')}
              message={t('home.emptyMessage')}
              actionLabel={t('home.emptyAction')}
              onAction={() => navigation.navigate('Report')}
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(stagger(index)).duration(420)}>
            <ComplaintRow
              complaint={item}
              onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

function ComplaintRow({ complaint, onPress }: { complaint: ComplaintOut; onPress: () => void }) {
  const { language, t } = useLanguage();
  const cat = categoryStyle(complaint.category);
  const catLabel = complaint.category ? t(`category.${complaint.category}` as TranslationKey) : cat.label;
  const created = new Date(complaint.created_at);
  const when = created.toLocaleDateString(localeForLanguage(language), { day: 'numeric', month: 'short' });

  return (
    <Card onPress={onPress} accent={cat.color} style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: cat.soft }]}>
          <Text style={styles.rowIconText}>{cat.icon}</Text>
        </View>
        <View style={styles.rowHeadings}>
          <Text variant="label" numberOfLines={1}>
            {catLabel}
          </Text>
          <Text variant="caption" faint>
            {complaint.reference_code} · {when}
          </Text>
        </View>
        <StatusChip status={complaint.status} size="sm" />
      </View>

      <Text variant="bodySm" muted numberOfLines={2} style={styles.rowDescription}>
        {complaint.description ?? complaint.raw_text ?? complaint.transcript ?? t('home.processing')}
      </Text>

      <View style={styles.rowChips}>
        <SeverityChip severity={complaint.severity} size="sm" />
        <CategoryChip category={complaint.category} size="sm" />
        {complaint.channel !== 'text' ? (
          <Text variant="caption" faint style={styles.channel}>
            {complaint.channel === 'voice' ? t('home.channelVoice') : complaint.channel === 'image' ? t('home.channelPhoto') : t('home.channelPhone')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: { padding: spacing.xs },
  avatar: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.white },
  header: { paddingTop: spacing.xs, paddingBottom: spacing.xs },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  themeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  stats: { marginBottom: spacing.lg },
  quickReportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  quickGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  quickTile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, borderRadius: radii.xl },
  financeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  financeText: { flex: 1 },
  sectionLabel: { marginBottom: spacing.md },
  row: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontSize: 18 },
  rowHeadings: { flex: 1, marginLeft: spacing.md },
  rowDescription: { marginTop: spacing.md },
  rowChips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  channel: { marginLeft: 'auto' },
});
