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
  SeverityChip,
  SkeletonList,
  StatCard,
  StatRow,
  StatusChip,
  Text,
  useToast,
} from '../../components/ui';
import { CitizenTabScreenProps } from '../../navigation/types';
import { categoryStyle, palette, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';

type Props = CitizenTabScreenProps<'Home'>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CitizenHomeScreen({ navigation }: Props) {
  const { token, user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<ComplaintOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      try {
        setComplaints(await complaintsApi.listMine(token));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load your reports');
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
              <Text variant="bodySm" muted>
                {greeting()}
              </Text>
              <Text variant="h1">{firstName || 'Citizen'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <StatRow style={styles.stats}>
                <StatCard label="Reports" value={stats.total} icon="📝" />
                <StatCard label="In hotspots" value={stats.clustered} icon="🔥" color={palette.accent} />
                <StatCard label="Resolved" value={stats.resolved} icon="✅" color={palette.success} />
              </StatRow>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(420)}>
              <Text variant="overline" muted style={styles.sectionLabel}>
                My Reports
              </Text>
            </Animated.View>

            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="📝"
              title="No reports yet"
              message="Spotted a pothole, broken streetlight or blocked drain? Report it and the AI will route it to the right project."
              actionLabel="Report an issue"
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
  const cat = categoryStyle(complaint.category);
  const created = new Date(complaint.created_at);
  const when = created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <Card onPress={onPress} accent={cat.color} style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: cat.soft }]}>
          <Text style={styles.rowIconText}>{cat.icon}</Text>
        </View>
        <View style={styles.rowHeadings}>
          <Text variant="label" numberOfLines={1}>
            {cat.label}
          </Text>
          <Text variant="caption" faint>
            {complaint.reference_code} · {when}
          </Text>
        </View>
        <StatusChip status={complaint.status} size="sm" />
      </View>

      <Text variant="bodySm" muted numberOfLines={2} style={styles.rowDescription}>
        {complaint.description ?? complaint.raw_text ?? complaint.transcript ?? 'Processing…'}
      </Text>

      <View style={styles.rowChips}>
        <SeverityChip severity={complaint.severity} size="sm" />
        <CategoryChip category={complaint.category} size="sm" />
        {complaint.channel !== 'text' ? (
          <Text variant="caption" faint style={styles.channel}>
            {complaint.channel === 'voice' ? '🎤 Voice' : complaint.channel === 'image' ? '📷 Photo' : '☎️ Phone'}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base },
  header: { paddingTop: spacing.md, paddingBottom: spacing.base },
  stats: { marginBottom: spacing.lg },
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
