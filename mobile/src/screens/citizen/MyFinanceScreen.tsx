import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { ApiError } from '../../api/client';
import * as financeApi from '../../api/finance';
import { SchemeDiscoverResponse, SchemeGrievanceOut, SchemeItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, Input, Screen, SegmentedControl, Skeleton, Text, useToast, type Segment } from '../../components/ui';
import { useLanguage } from '../../i18n';
import { TranslationKey } from '../../i18n/en';
import { CitizenStackParamList } from '../../navigation/types';
import { palette, radii, spacing, stagger } from '../../theme';

type Props = NativeStackScreenProps<CitizenStackParamList, 'MyFinance'>;
type Mode = 'discover' | 'reports';

export default function MyFinanceScreen({ navigation }: Props) {
  const { token } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  const MODES: Segment<Mode>[] = [
    { value: 'discover', label: t('finance.tabDiscover'), iconName: 'search' },
    { value: 'reports', label: t('finance.tabReports'), iconName: 'document-text-outline' },
  ];

  const [mode, setMode] = useState<Mode>('discover');

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{t('finance.title')}</Text>
        <Text variant="bodySm" muted style={styles.subtitle}>
          {t('finance.subtitle')}
        </Text>
      </Animated.View>

      <SegmentedControl segments={MODES} value={mode} onChange={setMode} style={styles.modes} />

      {mode === 'discover' ? (
        <Animated.View key="discover" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          <DiscoverPanel token={token} onReportMissing={() => setMode('reports')} />
        </Animated.View>
      ) : (
        <Animated.View key="reports" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          <ReportsPanel token={token} />
        </Animated.View>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------
// Discover panel
// ---------------------------------------------------------------------------------------

function DiscoverPanel({ token, onReportMissing }: { token: string | null; onReportMissing: () => void }) {
  const toast = useToast();
  const { t } = useLanguage();

  const [profession, setProfession] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SchemeDiscoverResponse | null>(null);

  async function submit() {
    if (!token) return;
    if (!profession.trim() || !state.trim()) {
      toast.error(t('finance.errProfessionState'));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await financeApi.discoverSchemes(token, {
        profession: profession.trim(),
        state: state.trim(),
        age: age.trim() ? Number(age.trim()) : undefined,
        notes: notes.trim() || undefined,
      });
      setResult(res);
      if (res.schemes.length === 0) toast.info(t('finance.noSchemesFound'));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.status === 502
            ? t('finance.errLookupBusy')
            : err.message
          : t('finance.errLookup'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Card style={styles.formCard}>
        <Input label={t('finance.professionLabel')} iconName="briefcase-outline" value={profession} onChangeText={setProfession} containerStyle={styles.field} />
        <Input label={t('finance.stateLabel')} iconName="location-outline" value={state} onChangeText={setState} containerStyle={styles.field} />
        <Input
          label={t('finance.ageLabel')}
          iconName="calendar-outline"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          containerStyle={styles.field}
        />
        <Input
          label={t('finance.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          multiline
          multilineHeight={70}
          containerStyle={styles.field}
        />
        <Button title={t('finance.findSchemes')} onPress={submit} loading={loading} size="lg" />
      </Card>

      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton width="100%" height={110} radius={radii.lg} />
          <Skeleton width="100%" height={110} radius={radii.lg} style={styles.skeletonGap} />
        </View>
      ) : null}

      {result && !result.grounded ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.ungroundedNotice}>
          <Ionicons name="information-circle-outline" size={14} color={palette.textMuted} />
          <Text variant="caption" muted style={styles.ungroundedText}>
            {t('finance.ungroundedNotice')}
          </Text>
        </Animated.View>
      ) : null}

      {result
        ? result.schemes.map((scheme, index) => (
            <SchemeCard key={`${scheme.name}-${index}`} scheme={scheme} index={index} onReportMissing={onReportMissing} />
          ))
        : null}

      {result && result.sources.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(stagger(result.schemes.length)).duration(400)}>
          <Text variant="overline" muted style={styles.sourcesHeading}>
            {t('finance.sources')}
          </Text>
          {result.sources.map((source, i) => (
            <Pressable key={i} onPress={() => Linking.openURL(source.uri)} style={styles.sourceRow}>
              <Ionicons name="link" size={12} color={palette.primary} />
              <Text variant="caption" color={palette.primary} numberOfLines={1} style={styles.sourceText}>
                {source.title}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

function SchemeCard({ scheme, index, onReportMissing }: { scheme: SchemeItem; index: number; onReportMissing: () => void }) {
  const { token } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [reporting, setReporting] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitGrievance() {
    if (!token || !description.trim()) return;
    setSubmitting(true);
    try {
      await financeApi.createGrievance(token, scheme.name, description.trim());
      setSubmitted(true);
      toast.success(t('finance.grievanceSubmitted'));
      setTimeout(onReportMissing, 700);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('finance.errGrievanceSubmit'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(stagger(index)).duration(400)}>
      <Card style={styles.schemeCard} accent={palette.primary}>
        <Text variant="h3">{scheme.name}</Text>
        <Text variant="caption" faint style={styles.provider}>
          {scheme.provider}
        </Text>

        <Field label={t('finance.eligibility')} value={scheme.eligibility} />
        <Field label={t('finance.benefit')} value={scheme.benefit} />
        <Field label={t('finance.howToApply')} value={scheme.how_to_apply} />

        {!reporting && !submitted ? (
          <Pressable onPress={() => setReporting(true)} style={styles.reportLink}>
            <Ionicons name="alert-circle-outline" size={14} color={palette.warning} />
            <Text variant="caption" color={palette.warning} style={styles.reportLinkText}>
              {t('finance.appliedNeverGot')}
            </Text>
          </Pressable>
        ) : null}

        {reporting && !submitted ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.grievanceForm}>
            <Input
              label={t('finance.describeWhatHappened')}
              value={description}
              onChangeText={setDescription}
              multiline
              multilineHeight={70}
              containerStyle={styles.field}
            />
            <Button
              title={t('finance.submitReport')}
              onPress={submitGrievance}
              loading={submitting}
              disabled={!description.trim()}
              size="sm"
              fullWidth={false}
            />
          </Animated.View>
        ) : null}

        {submitted ? (
          <Text variant="caption" color={palette.success} style={styles.reportLinkText}>
            {t('finance.grievanceSubmitted')}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text variant="overline" muted>
        {label}
      </Text>
      <Text variant="bodySm" style={styles.fieldValue}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------
// Reports panel
// ---------------------------------------------------------------------------------------

function ReportsPanel({ token }: { token: string | null }) {
  const toast = useToast();
  const { t } = useLanguage();
  const [grievances, setGrievances] = useState<SchemeGrievanceOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setGrievances(await financeApi.listMyGrievances(token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('finance.errLoadReports'));
    } finally {
      setLoading(false);
    }
  }, [token, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View>
        <Skeleton width="100%" height={90} radius={radii.lg} />
        <Skeleton width="100%" height={90} radius={radii.lg} style={styles.skeletonGap} />
      </View>
    );
  }

  if (grievances.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text variant="body" muted center>
          {t('finance.noReportsYet')}
        </Text>
      </Card>
    );
  }

  return (
    <View>
      {grievances.map((g, index) => (
        <GrievanceRow key={g.id} grievance={g} index={index} onUpdated={load} />
      ))}
    </View>
  );
}

function GrievanceRow({ grievance, index, onUpdated }: { grievance: SchemeGrievanceOut; index: number; onUpdated: () => void }) {
  const { token } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitFollowUp() {
    if (!token || !grievance.follow_up_question || !answer.trim()) return;
    setSubmitting(true);
    try {
      await financeApi.answerGrievanceFollowUp(token, grievance.id, grievance.follow_up_question, answer.trim());
      toast.success(t('finance.diagnosisUpdated'));
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('finance.errFollowUp'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(stagger(index)).duration(400)}>
      <Card style={styles.grievanceCard}>
        <View style={styles.grievanceHeader}>
          <Text variant="label">{grievance.scheme_name}</Text>
          <StatusPill status={grievance.status} />
        </View>
        <Text variant="bodySm" muted numberOfLines={2} style={styles.grievanceText}>
          {grievance.raw_text}
        </Text>

        {grievance.failure_description ? (
          <View style={styles.diagnosisBox}>
            <Ionicons name="sparkles" size={13} color={palette.primary} />
            <Text variant="bodySm" style={styles.diagnosisText}>
              {grievance.failure_description}
            </Text>
          </View>
        ) : null}

        {grievance.follow_up_question ? (
          <View style={styles.followUpBox}>
            <Text variant="caption" color={palette.warning}>
              {grievance.follow_up_question}
            </Text>
            <Input
              label={t('finance.yourAnswer')}
              value={answer}
              onChangeText={setAnswer}
              containerStyle={styles.field}
            />
            <Button
              title={t('finance.submitAnswer')}
              onPress={submitFollowUp}
              loading={submitting}
              disabled={!answer.trim()}
              size="sm"
              fullWidth={false}
            />
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const meta: Record<string, { color: string; key: TranslationKey }> = {
    received: { color: palette.textMuted, key: 'finance.statusReceived' },
    diagnosed: { color: palette.primary, key: 'finance.statusDiagnosed' },
    clustered: { color: palette.warning, key: 'finance.statusClustered' },
    escalated: { color: palette.warning, key: 'finance.statusEscalated' },
    resolved: { color: palette.success, key: 'finance.statusResolved' },
  };
  const entry = meta[status] ?? { color: palette.textMuted, key: 'finance.statusReceived' as TranslationKey };
  return (
    <View style={[styles.pill, { backgroundColor: entry.color + '22' }]}>
      <Text variant="caption" color={entry.color}>
        {t(entry.key)}
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
  modes: { marginBottom: spacing.lg },
  formCard: { marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  skeletonWrap: { marginTop: spacing.sm },
  skeletonGap: { marginTop: spacing.md },
  ungroundedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  ungroundedText: { flex: 1 },
  schemeCard: { marginBottom: spacing.md },
  provider: { marginTop: 2, marginBottom: spacing.md },
  fieldRow: { marginBottom: spacing.sm },
  fieldValue: { marginTop: 2 },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  reportLinkText: { marginLeft: 2 },
  grievanceForm: { marginTop: spacing.md },
  sourcesHeading: { marginTop: spacing.sm, marginBottom: spacing.sm },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  sourceText: { flex: 1 },
  emptyCard: { paddingVertical: spacing.xl },
  grievanceCard: { marginBottom: spacing.md },
  grievanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grievanceText: { marginTop: spacing.xs },
  diagnosisBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: palette.primarySoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  diagnosisText: { flex: 1 },
  followUpBox: { marginTop: spacing.md },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
});
