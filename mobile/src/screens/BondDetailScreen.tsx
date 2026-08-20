import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as bondsApi from '../api/bonds';
import { BondDetailOut, BondInvestmentOut, IncomeBracket } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Card, ProgressTracker, Screen, Skeleton, Text, useToast } from '../components/ui';
import { useLanguage } from '../i18n';
import { TranslationKey } from '../i18n/en';
import { AuthorityStackParamList, CitizenStackParamList } from '../navigation/types';
import { palette, radii, spacing, stagger } from '../theme';

type Props = NativeStackScreenProps<CitizenStackParamList | AuthorityStackParamList, 'BondDetail'>;

const BRACKET_COLOR: Record<IncomeBracket, string> = {
  low: palette.success,
  middle: palette.info,
  high: palette.warning,
};

const BRACKET_LABEL_KEY: Record<IncomeBracket, TranslationKey> = {
  low: 'bonds.lowIncome',
  middle: 'bonds.middleIncome',
  high: 'bonds.highIncome',
};

function formatCurrency(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function BondDetailScreen({ route, navigation }: Props) {
  const { bondId } = route.params;
  const { token } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [bond, setBond] = useState<BondDetailOut | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBond(await bondsApi.getBond(token, bondId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('bonds.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [token, bondId, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !bond) {
    return (
      <Screen scroll>
        <Skeleton width="100%" height={150} radius={radii.lg} style={{ marginTop: spacing.base }} />
        <Skeleton width="60%" height={16} style={{ marginTop: spacing.lg }} />
        <Skeleton width="90%" height={13} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  const pct = bond.target_amount > 0 ? Math.min(100, (bond.raised_amount / bond.target_amount) * 100) : 0;
  const equity = bond.equity;
  const equityTotal = equity.low_amount + equity.middle_amount + equity.high_amount || 1;

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{bond.title}</Text>
        {bond.project_title ? (
          <Text variant="caption" faint style={styles.projectLine}>
            {t('bonds.funds')} {bond.project_title}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(420)}>
        <Card style={styles.card}>
          <Text variant="bodySm" muted>
            {bond.description}
          </Text>
          <View style={styles.statsRow}>
            <Stat label={t('bonds.raised')} value={formatCurrency(bond.raised_amount)} />
            <Stat label={t('bonds.target')} value={formatCurrency(bond.target_amount)} />
            <Stat label={t('bonds.interest')} value={`${bond.interest_rate}%`} />
            <Stat label={t('bonds.tenure')} value={`${bond.tenure_years}${t('bonds.years')}`} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(420)}>
        <Card style={styles.card} accent={equity.equity_gap_flagged ? palette.danger : palette.success}>
          <View style={styles.equityHeader}>
            <Ionicons
              name={equity.equity_gap_flagged ? 'warning' : 'checkmark-circle'}
              size={16}
              color={equity.equity_gap_flagged ? palette.danger : palette.success}
            />
            <Text variant="label" color={equity.equity_gap_flagged ? palette.danger : palette.success} style={styles.equityHeaderText}>
              {equity.equity_gap_flagged ? t('bonds.equityGapFlagged') : t('bonds.equityHealthy')}
            </Text>
          </View>
          {equity.equity_gap_reason ? (
            <Text variant="bodySm" muted style={styles.equityReason}>
              {equity.equity_gap_reason}
            </Text>
          ) : null}

          <View style={styles.equityBarTrack}>
            <View style={[styles.equityBarSegment, { flex: equity.low_amount || 0.0001, backgroundColor: BRACKET_COLOR.low }]} />
            <View style={[styles.equityBarSegment, { flex: equity.middle_amount || 0.0001, backgroundColor: BRACKET_COLOR.middle }]} />
            <View style={[styles.equityBarSegment, { flex: equity.high_amount || 0.0001, backgroundColor: BRACKET_COLOR.high }]} />
          </View>

          <View style={styles.equityLegend}>
            <LegendItem color={BRACKET_COLOR.low} label={t('bonds.lowIncome')} amount={equity.low_amount} count={equity.low_count} total={equityTotal} />
            <LegendItem color={BRACKET_COLOR.middle} label={t('bonds.middleIncome')} amount={equity.middle_amount} count={equity.middle_count} total={equityTotal} />
            <LegendItem color={BRACKET_COLOR.high} label={t('bonds.highIncome')} amount={equity.high_amount} count={equity.high_count} total={equityTotal} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(420)}>
        <Text variant="h3" style={styles.investorsHeading}>
          {t('bonds.investors')} ({bond.investments.length})
        </Text>
      </Animated.View>

      {bond.investments.map((investment, index) => (
        <InvestorRow key={investment.id} investment={investment} index={index} />
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="overline" muted>
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

function LegendItem({ color, label, amount, count, total }: { color: string; label: string; amount: number; count: number; total: number }) {
  const pct = Math.round((amount / total) * 100);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" muted style={styles.legendText}>
        {label} · {pct}% · {count}
      </Text>
    </View>
  );
}

function InvestorRow({ investment, index }: { investment: BondInvestmentOut; index: number }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    investment.verification_status === 'verified'
      ? palette.success
      : investment.verification_status === 'flagged'
        ? palette.danger
        : palette.warning;
  const statusLabel =
    investment.verification_status === 'verified'
      ? t('bonds.verified')
      : investment.verification_status === 'flagged'
        ? t('bonds.flagged')
        : t('bonds.pendingVerification');

  return (
    <Animated.View entering={FadeInDown.delay(stagger(index)).duration(400)}>
      <Card style={styles.investorCard}>
        <Pressable onPress={() => setExpanded((e) => !e)} style={styles.investorTop}>
          <View style={styles.investorLeft}>
            <Text variant="label">{investment.investor_name}</Text>
            <View style={styles.investorMetaRow}>
              <View style={[styles.bracketDot, { backgroundColor: BRACKET_COLOR[investment.income_bracket] }]} />
              <Text variant="caption" faint>
                {t(BRACKET_LABEL_KEY[investment.income_bracket])} · {formatCurrency(investment.amount)}
              </Text>
            </View>
          </View>
          <View style={styles.investorRight}>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
              {investment.aadhaar_verified ? <Ionicons name="shield-checkmark" size={11} color={statusColor} /> : null}
              <Text variant="caption" color={statusColor} style={styles.statusText}>
                {statusLabel}
              </Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textFaint} />
          </View>
        </Pressable>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.trackerWrap}>
            <ProgressTracker stages={investment.tracker} />
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  header: { paddingTop: spacing.md, paddingBottom: spacing.base },
  projectLine: { marginTop: spacing.xxs },
  card: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.base },
  stat: { minWidth: '40%' },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceSunken,
    overflow: 'hidden',
    marginTop: spacing.base,
  },
  progressFill: { height: '100%', backgroundColor: palette.primary, borderRadius: radii.pill },
  equityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  equityHeaderText: {},
  equityReason: { marginTop: spacing.sm },
  equityBarTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginTop: spacing.base,
  },
  equityBarSegment: { height: '100%' },
  equityLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: radii.pill },
  legendText: {},
  investorsHeading: { marginTop: spacing.sm, marginBottom: spacing.md },
  investorCard: { marginBottom: spacing.md },
  investorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  investorLeft: { flex: 1 },
  investorMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  bracketDot: { width: 7, height: 7, borderRadius: radii.pill },
  investorRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusText: {},
  trackerWrap: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
});
