import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as hotspotsApi from '../../api/hotspots';
import { ComplaintOut } from '../../api/types';
import { Card, CategoryChip, EmptyState, SeverityChip, SkeletonList, Text, useToast } from '../../components/ui';
import { AuthorityStackParamList } from '../../navigation/types';
import { palette, spacing, stagger } from '../../theme';

type Props = NativeStackScreenProps<AuthorityStackParamList, 'HotspotDetail'>;

export default function HotspotDetailScreen({ route }: Props) {
  const { clusterId } = route.params;
  const toast = useToast();
  const [complaints, setComplaints] = useState<ComplaintOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setComplaints(await hotspotsApi.complaintsFor(clusterId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load complaints');
    } finally {
      setLoading(false);
    }
  }, [clusterId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const channelLabel = (channel: string) =>
    channel === 'voice' ? '🎤 Voice' : channel === 'image' ? '📷 Photo' : channel === 'phone' ? '☎️ Phone' : '📝 Text';

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : complaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <Text variant="overline" muted>
                Underlying evidence
              </Text>
              <Text variant="h2" style={styles.count}>
                {loading ? '—' : `${complaints.length} citizen report${complaints.length === 1 ? '' : 's'}`}
              </Text>
            </Animated.View>
            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="📭" title="No complaints" message="This hotspot has no attached reports." />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(stagger(index)).duration(400)}>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text variant="label">{item.reference_code}</Text>
                <Text variant="caption" faint>
                  {channelLabel(item.channel)}
                </Text>
              </View>
              <Text variant="bodySm" style={styles.description} numberOfLines={3}>
                {item.description ?? item.raw_text ?? item.transcript ?? '—'}
              </Text>
              <View style={styles.chips}>
                <SeverityChip severity={item.severity} size="sm" />
                <CategoryChip category={item.category} size="sm" />
                <Text variant="caption" faint style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.base, paddingBottom: spacing.base },
  count: { marginTop: spacing.xxs },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  description: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  date: { marginLeft: 'auto' },
});
