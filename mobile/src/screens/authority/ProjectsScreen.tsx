import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as projectsApi from '../../api/projects';
import { ProjectOut } from '../../api/types';
import { Card, EmptyState, ScoreBar, SkeletonList, StatCard, StatRow, StatusChip, Text, useToast } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { categoryStyle, palette, radii, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];

function formatCurrency(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function ProjectsScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setProjects(await projectsApi.list('priority'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load projects');
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
    const cost = projects.reduce((sum, p) => sum + p.estimated_cost, 0);
    const beneficiaries = projects.reduce((sum, p) => sum + p.estimated_beneficiaries, 0);
    return { count: projects.length, cost, beneficiaries };
  }, [projects]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={loading ? [] : projects}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.primary} colors={[palette.primary]} />
        }
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
              <Text variant="h1">Ranked Projects</Text>
              <Text variant="bodySm" muted style={styles.subtitle}>
                AI-generated interventions, scored and explained
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <StatRow style={styles.stats}>
                <StatCard label="Projects" value={stats.count} icon="🏗️" />
                <StatCard label="Total ask" value={stats.cost / 10_000_000} decimals={2} prefix="₹" suffix=" Cr" icon="💰" color={palette.warning} />
                <StatCard label="People" value={stats.beneficiaries} grouped icon="👥" color={palette.success} />
              </StatRow>
            </Animated.View>

            {loading ? <SkeletonList count={4} /> : null}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="🏗️" title="No projects yet" message="Projects are generated once hotspots form and pass evidence validation." />}
        renderItem={({ item, index }) => {
          const cat = categoryStyle(item.category);
          const isOpen = expanded === item.id;
          const rankColor = RANK_COLORS[index] ?? palette.textFaint;

          return (
            <Animated.View entering={FadeInDown.delay(stagger(index)).duration(420)}>
              <Card style={styles.card} accent={cat.color}>
                <View style={styles.cardTop}>
                  <View style={[styles.rank, { backgroundColor: index < 3 ? rankColor : palette.surfaceAlt }]}>
                    <Text variant="label" color={index < 3 ? palette.white : palette.textMuted}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.cardHeadings}>
                    <Text variant="h3" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <StatusChip status={item.status} size="sm" />
                      <Text variant="caption" faint>
                        {cat.icon} {cat.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.priorityBox}>
                  <View>
                    <Text variant="overline" muted>
                      Priority
                    </Text>
                    <Text variant="h1" color={cat.color}>
                      {item.priority_score.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.priorityFacts}>
                    <Fact icon="cash-outline" label="Cost" value={formatCurrency(item.estimated_cost)} />
                    <Fact icon="people-outline" label="Beneficiaries" value={item.estimated_beneficiaries.toLocaleString('en-IN')} />
                  </View>
                </View>

                <View style={styles.scores}>
                  <ScoreBar label="Demand" value={item.demand_score} color={palette.primary} delay={stagger(index) + 120} style={styles.score} />
                  <ScoreBar label="Impact" value={item.impact_score} color={palette.success} delay={stagger(index) + 170} style={styles.score} />
                  <ScoreBar label="Urgency" value={item.urgency_score} color={palette.warning} delay={stagger(index) + 220} style={styles.score} />
                  <ScoreBar label="Feasibility" value={item.feasibility_score} color={palette.info} delay={stagger(index) + 270} style={styles.score} />
                </View>

                <Text variant="bodySm" muted numberOfLines={isOpen ? undefined : 2} style={styles.description}>
                  {item.description}
                </Text>

                {item.explanation ? (
                  <>
                    <Pressable
                      style={styles.explainToggle}
                      onPress={() => {
                        haptics.tap();
                        setExpanded(isOpen ? null : item.id);
                      }}
                    >
                      <Ionicons name="sparkles" size={13} color={palette.accent} />
                      <Text variant="caption" color={palette.accent} style={styles.explainLabel}>
                        {isOpen ? 'Hide AI reasoning' : 'Why this ranking?'}
                      </Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={palette.accent} />
                    </Pressable>

                    {isOpen ? (
                      <Animated.View entering={FadeIn.duration(240)} style={styles.explanationBox}>
                        <Text variant="bodySm" style={styles.explanationText}>
                          {item.explanation}
                        </Text>
                      </Animated.View>
                    ) : null}
                  </>
                ) : null}
              </Card>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color={palette.textMuted} />
      <View style={styles.factText}>
        <Text variant="caption" faint>
          {label}
        </Text>
        <Text variant="label">{value}</Text>
      </View>
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
  cardTop: { flexDirection: 'row' },
  rank: { width: 30, height: 30, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  cardHeadings: { flex: 1, marginLeft: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  priorityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.base,
  },
  priorityFacts: { flex: 1, marginLeft: spacing.lg, gap: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  factText: { flex: 1 },
  scores: { marginTop: spacing.base, gap: spacing.md },
  score: {},
  description: { marginTop: spacing.base },
  explainToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.xs },
  explainLabel: { flex: 1 },
  explanationBox: {
    backgroundColor: palette.primarySoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  explanationText: { lineHeight: 20 },
});
