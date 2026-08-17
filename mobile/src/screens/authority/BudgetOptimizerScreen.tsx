import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as budgetApi from '../../api/budget';
import { ApiError } from '../../api/client';
import { BudgetRunOut, ProjectOut } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { AnimatedNumber, Button, Card, Input, Screen, Text, useToast } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { categoryStyle, gradients, palette, radii, shadows, spacing, stagger, TAB_BAR_HEIGHT } from '../../theme';

const PRESETS = [
  { label: '₹25 L', value: 2_500_000 },
  { label: '₹50 L', value: 5_000_000 },
  { label: '₹1 Cr', value: 10_000_000 },
  { label: '₹2 Cr', value: 20_000_000 },
];

function formatCurrency(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function BudgetOptimizerScreen() {
  const { token } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [budget, setBudget] = useState('');
  const [run, setRun] = useState<BudgetRunOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  const amount = Number(budget.replace(/[^0-9]/g, ''));

  async function optimize() {
    if (!token) return;
    if (!amount || amount <= 0) {
      toast.error('Enter a budget amount first');
      return;
    }
    setLoading(true);
    setRun(null);
    try {
      const result = await budgetApi.optimize(token, amount);
      setRun(result);
      haptics.success();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.status === 403
            ? 'Only authority accounts can run the optimizer'
            : err.message
          : 'Could not run the optimizer',
      );
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!token || !run) return;
    setApproving(true);
    try {
      setRun(await budgetApi.approve(token, run.id));
      toast.success('Budget approved — projects moved to funded');
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409 ? 'This run was already approved' : 'Could not approve this run',
      );
    } finally {
      setApproving(false);
    }
  }

  const utilization = run && run.total_budget > 0 ? run.total_cost / run.total_budget : 0;

  return (
    <Screen scroll edges={{ top: true }} bottomInset={TAB_BAR_HEIGHT + insets.bottom}>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">Budget Optimizer</Text>
        <Text variant="bodySm" muted style={styles.subtitle}>
          0/1 knapsack over ranked projects — maximum impact per rupee
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(420)}>
        <Input
          label="Available budget (₹)"
          icon="💰"
          value={budget}
          onChangeText={setBudget}
          keyboardType="number-pad"
          containerStyle={styles.input}
        />
        <View style={styles.presets}>
          {PRESETS.map((preset) => {
            const active = amount === preset.value;
            return (
              <Pressable
                key={preset.value}
                style={[styles.preset, active && styles.presetActive]}
                onPress={() => {
                  haptics.select();
                  setBudget(String(preset.value));
                }}
              >
                <Text variant="caption" color={active ? palette.primary : palette.textMuted}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button title="Run Optimization" onPress={optimize} loading={loading} size="lg" icon="⚡" style={styles.runButton} />
      </Animated.View>

      {run ? (
        <Animated.View entering={FadeIn.duration(360)}>
          <Animated.View entering={FadeInDown.duration(420)}>
            <LinearGradient
              colors={run.status === 'approved' ? gradients.success : gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.summary, shadows.lg]}
            >
              <View style={styles.summaryTop}>
                <View>
                  <Text variant="overline" color="rgba(255,255,255,0.75)">
                    Expected impact
                  </Text>
                  <AnimatedNumber value={run.total_expected_impact} decimals={2} variant="display" color={palette.white} />
                </View>
                <View style={styles.summaryBadge}>
                  <Ionicons
                    name={run.status === 'approved' ? 'checkmark-circle' : 'time-outline'}
                    size={13}
                    color={palette.white}
                  />
                  <Text variant="caption" color={palette.white}>
                    {run.status === 'approved' ? ' Approved' : ' Draft'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryFacts}>
                <SummaryFact label="Allocated" value={formatCurrency(run.total_cost)} />
                <SummaryFact label="Budget" value={formatCurrency(run.total_budget)} />
                <SummaryFact label="Selected" value={`${run.selected.length} / ${run.selected.length + run.excluded.length}`} />
              </View>

              <View style={styles.utilTrack}>
                <View style={[styles.utilFill, { width: `${Math.min(100, utilization * 100)}%` }]} />
              </View>
              <Text variant="caption" color="rgba(255,255,255,0.8)">
                {(utilization * 100).toFixed(1)}% of budget utilised
              </Text>
            </LinearGradient>
          </Animated.View>

          {run.status !== 'approved' ? (
            <Animated.View entering={FadeInDown.delay(120).duration(420)}>
              <Button title="Approve This Allocation" onPress={approve} loading={approving} variant="success" icon="✓" style={styles.approve} />
            </Animated.View>
          ) : null}

          <Section title="Funded" count={run.selected.length} color={palette.success} />
          {run.selected.map((project, index) => (
            <Animated.View key={project.id} entering={FadeInDown.delay(stagger(index)).duration(400)}>
              <ProjectRow project={project} included />
            </Animated.View>
          ))}

          {run.excluded.length > 0 ? (
            <>
              <Section title="Not funded" count={run.excluded.length} color={palette.textMuted} />
              {run.excluded.map((project, index) => (
                <Animated.View key={project.id} entering={FadeInDown.delay(stagger(index)).duration(400)}>
                  <ProjectRow project={project} included={false} />
                </Animated.View>
              ))}
            </>
          ) : null}
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryFact}>
      <Text variant="caption" color="rgba(255,255,255,0.72)">
        {label}
      </Text>
      <Text variant="label" color={palette.white}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text variant="overline" color={color}>
        {title} · {count}
      </Text>
    </View>
  );
}

function ProjectRow({ project, included }: { project: ProjectOut; included: boolean }) {
  const cat = categoryStyle(project.category);
  return (
    <Card
      style={included ? styles.projectCard : [styles.projectCard, styles.projectCardMuted]}
      accent={included ? cat.color : palette.borderStrong}
    >
      <View style={styles.projectTop}>
        <Text variant="label" style={styles.projectTitle} numberOfLines={2}>
          {cat.icon} {project.title}
        </Text>
        <Text variant="label" color={included ? cat.color : palette.textFaint}>
          {project.priority_score.toFixed(2)}
        </Text>
      </View>
      <View style={styles.projectMeta}>
        <Text variant="caption" muted>
          {formatCurrency(project.estimated_cost)}
        </Text>
        <Text variant="caption" faint>
          {' · '}
          {project.estimated_beneficiaries.toLocaleString('en-IN')} people
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  subtitle: { marginTop: spacing.xxs },
  input: { marginBottom: spacing.md },
  presets: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  runButton: { marginBottom: spacing.xl },

  summary: { borderRadius: radii.lg, padding: spacing.lg },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  summaryFacts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.base },
  summaryFact: {},
  utilTrack: { height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginBottom: spacing.sm },
  utilFill: { height: '100%', backgroundColor: palette.white, borderRadius: 6 },
  approve: { marginTop: spacing.base },

  section: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  projectCard: { marginBottom: spacing.sm },
  projectCardMuted: { opacity: 0.62 },
  projectTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  projectTitle: { flex: 1 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
});
