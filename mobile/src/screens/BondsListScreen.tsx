import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as bondsApi from '../api/bonds';
import { BondOut } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Card, EmptyState, ScoreBar, Screen, SkeletonList, Text, useToast } from '../components/ui';
import { useLanguage } from '../i18n';
import { AuthorityStackParamList, CitizenStackParamList } from '../navigation/types';
import { palette, radii, spacing, stagger } from '../theme';

type Props = NativeStackScreenProps<CitizenStackParamList | AuthorityStackParamList, 'BondsList'>;

function formatCurrency(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function BondsListScreen({ navigation }: Props) {
  const { token } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [bonds, setBonds] = useState<BondOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBonds(await bondsApi.listBonds(token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('bonds.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [token, toast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{t('bonds.title')}</Text>
        <Text variant="bodySm" muted style={styles.subtitle}>
          {t('bonds.subtitle')}
        </Text>
      </Animated.View>

      {loading ? <SkeletonList count={2} /> : null}

      {!loading && bonds.length === 0 ? (
        <EmptyState icon="business-outline" title={t('bonds.emptyTitle')} message={t('bonds.emptyMessage')} />
      ) : null}

      {bonds.map((bond, index) => {
        const pct = bond.target_amount > 0 ? (bond.raised_amount / bond.target_amount) * 100 : 0;
        return (
          <Animated.View key={bond.id} entering={FadeInDown.delay(stagger(index)).duration(400)}>
            <Card style={styles.card} onPress={() => navigation.navigate('BondDetail', { bondId: bond.id })}>
              <View style={styles.cardTop}>
                <View style={styles.cardHeadings}>
                  <Text variant="h3" numberOfLines={2}>
                    {bond.title}
                  </Text>
                  {bond.project_title ? (
                    <Text variant="caption" faint numberOfLines={1}>
                      {bond.project_title}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
              </View>

              <View style={styles.amountRow}>
                <Text variant="label" color={palette.primary}>
                  {formatCurrency(bond.raised_amount)}
                </Text>
                <Text variant="caption" faint>
                  {' '}
                  {t('bonds.of')} {formatCurrency(bond.target_amount)}
                </Text>
              </View>
              <ScoreBar value={pct} max={100} showValue={false} color={palette.primary} style={styles.bar} />

              <View style={styles.metaRow}>
                <Meta icon="people-outline" text={`${bond.investor_count} ${t('bonds.investors')}`} />
                <Meta icon="trending-up-outline" text={`${bond.interest_rate}% · ${bond.tenure_years}${t('bonds.years')}`} />
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={palette.textMuted} />
      <Text variant="caption" muted style={styles.metaText}>
        {text}
      </Text>
    </View>
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
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  subtitle: { marginTop: spacing.xxs },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardHeadings: { flex: 1, marginRight: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.base },
  bar: { marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.base },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: {},
});
