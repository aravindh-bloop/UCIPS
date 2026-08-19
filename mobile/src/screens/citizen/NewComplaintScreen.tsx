import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import * as complaintsApi from '../../api/complaints';
import { ComplaintOut } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  Button,
  Card,
  CategoryChip,
  Input,
  Screen,
  SegmentedControl,
  SeverityChip,
  Text,
  useToast,
  type Segment,
} from '../../components/ui';
import { useLanguage } from '../../i18n';
import { haptics } from '../../lib/haptics';
import { CitizenTabScreenProps, CitizenTabParamList } from '../../navigation/types';
import { palette, radii, shadows, spacing, TAB_BAR_HEIGHT } from '../../theme';

type Props = CitizenTabScreenProps<'Report'>;
type Mode = 'text' | 'voice' | 'image';

export default function NewComplaintScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<CitizenTabParamList, 'Report'>>();
  const initialMode = route.params?.initialMode ?? 'text';

  const { token } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const MODES: Segment<Mode>[] = [
    { value: 'text', label: t('newComplaint.modeText'), icon: '📝' },
    { value: 'voice', label: t('newComplaint.modeVoice'), icon: '🎤' },
    { value: 'image', label: t('newComplaint.modePhoto'), icon: '📷' },
  ];

  const [mode, setMode] = useState<Mode>(initialMode as Mode);

  useEffect(() => {
    if (route.params?.initialMode) {
      setMode(route.params.initialMode as Mode);
    }
  }, [route.params?.initialMode]);

  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ComplaintOut | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [answeringFollowUp, setAnsweringFollowUp] = useState(false);
  const [justRefined, setJustRefined] = useState(false);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }), -1, false);
    } else {
      pulse.value = 0;
    }
  }, [isRecording, pulse]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));

  const captureLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error(t('newComplaint.errLocationPermission'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      haptics.success();
    } catch {
      toast.error(t('newComplaint.errLocation'));
    } finally {
      setLocating(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void captureLocation();
  }, [captureLocation]);

  async function startRecording() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('newComplaint.errMicPermission'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      haptics.press();
      setRecordedUri(null);
      setElapsed(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast.error(t('newComplaint.errStartRecording'));
    }
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      setRecordedUri(recorder.uri ?? null);
      haptics.success();
    } catch {
      toast.error(t('newComplaint.errStopRecording'));
    } finally {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function pickImage(fromCamera: boolean) {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('newComplaint.errPickerPermission'));
        return;
      }
      const picked = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (!picked.canceled && picked.assets.length > 0) {
        setImage(picked.assets[0]);
        haptics.select();
      }
    } catch {
      toast.error(t('newComplaint.errPicker'));
    }
  }

  function reset() {
    setText('');
    setCaption('');
    setImage(null);
    setRecordedUri(null);
    setElapsed(0);
    setResult(null);
    setPendingQuestion(null);
    setFollowUpAnswer('');
    setJustRefined(false);
  }

  async function submitFollowUp() {
    if (!token || !result || !pendingQuestion || !followUpAnswer.trim()) return;
    setAnsweringFollowUp(true);
    try {
      const refined = await complaintsApi.answerFollowUp(token, result.id, pendingQuestion, followUpAnswer.trim());
      setResult(refined);
      setPendingQuestion(null);
      setJustRefined(true);
      haptics.success();
      toast.success(t('newComplaint.refinedToast'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('newComplaint.errFollowUp'));
    } finally {
      setAnsweringFollowUp(false);
    }
  }

  async function submit() {
    if (!token) return;
    if (!coords) {
      toast.error(t('newComplaint.errNoLocation'));
      return;
    }
    if (mode === 'text' && !text.trim()) return toast.error(t('newComplaint.errNoText'));
    if (mode === 'voice' && !recordedUri) return toast.error(t('newComplaint.errNoVoice'));
    if (mode === 'image' && !image) return toast.error(t('newComplaint.errNoImage'));

    setSubmitting(true);
    try {
      let complaint: ComplaintOut;
      if (mode === 'text') {
        complaint = await complaintsApi.submitText(token, { text: text.trim(), lat: coords.lat, lng: coords.lng, language: 'en' });
      } else if (mode === 'voice') {
        complaint = await complaintsApi.submitVoice(token, { uri: recordedUri!, lat: coords.lat, lng: coords.lng, languageCode: 'unknown' });
      } else {
        complaint = await complaintsApi.submitImage(token, {
          uri: image!.uri,
          mimeType: image!.mimeType,
          lat: coords.lat,
          lng: coords.lng,
          caption: caption.trim() || undefined,
        });
      }
      setResult(complaint);
      setPendingQuestion(complaint.follow_up_question ?? null);
      toast.success(t('newComplaint.reportedAs', { code: complaint.reference_code }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.status === 502
            ? t('newComplaint.errAiBusy')
            : err.message
          : t('newComplaint.errSubmit'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Success state ------------------------------------------------------
  if (result) {
    return (
      <Screen scroll edges={{ top: true }} bottomInset={TAB_BAR_HEIGHT + insets.bottom}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={38} color={palette.white} />
          </View>
          <Text variant="h1" center style={styles.successTitle}>
            {t('newComplaint.successTitle')}
          </Text>
          <Text variant="body" muted center>
            {t('newComplaint.reference', { code: result.reference_code })}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(450)}>
          <Card style={styles.resultCard}>
            <Text variant="overline" muted>
              {t('newComplaint.aiAnalysis')}
            </Text>
            <View style={styles.resultChips}>
              <CategoryChip category={result.category} />
              <SeverityChip severity={result.severity} />
            </View>
            <Text variant="body" style={styles.resultDescription}>
              {result.description}
            </Text>
            {result.transcript ? (
              <View style={styles.transcriptBox}>
                <Text variant="overline" muted>
                  {t('newComplaint.transcript')}
                </Text>
                <Text variant="bodySm" style={styles.transcriptText}>
                  “{result.transcript}”
                </Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {pendingQuestion ? (
          <Animated.View entering={FadeInDown.delay(200).duration(450)}>
            <Card style={styles.followUpCard} accent={palette.warning}>
              <View style={styles.followUpHeader}>
                <Ionicons name="help-circle" size={16} color={palette.warning} />
                <Text variant="overline" color={palette.warning} style={styles.followUpHeaderText}>
                  {t('newComplaint.followUpTitle')}
                </Text>
              </View>
              <Text variant="body" style={styles.followUpText}>
                {pendingQuestion}
              </Text>
              <Input
                label={t('newComplaint.yourAnswer')}
                value={followUpAnswer}
                onChangeText={setFollowUpAnswer}
                multiline
                multilineHeight={80}
                containerStyle={styles.followUpInput}
              />
              <View style={styles.followUpActions}>
                <Button
                  title={t('newComplaint.submitAnswer')}
                  onPress={submitFollowUp}
                  loading={answeringFollowUp}
                  disabled={!followUpAnswer.trim()}
                  size="sm"
                  fullWidth={false}
                  style={styles.followUpSubmit}
                />
                <Pressable onPress={() => setPendingQuestion(null)} style={styles.skipButton} disabled={answeringFollowUp}>
                  <Text variant="caption" muted>
                    {t('common.skip')}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        ) : justRefined ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.refinedBanner}>
              <Ionicons name="sparkles" size={13} color={palette.success} />
              <Text variant="caption" color={palette.success} style={styles.refinedText}>
                {t('newComplaint.refined')}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(280).duration(450)} style={styles.successActions}>
          <Button title={t('newComplaint.viewMyReports')} onPress={() => { reset(); navigation.navigate('Home'); }} />
          <Button title={t('newComplaint.reportAnother')} onPress={reset} variant="secondary" style={styles.secondaryAction} />
        </Animated.View>
      </Screen>
    );
  }

  // ---- Compose state ------------------------------------------------------
  return (
    <Screen scroll edges={{ top: true }} bottomInset={TAB_BAR_HEIGHT + insets.bottom}>
      <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
        <Text variant="h1">{t('newComplaint.title')}</Text>
        <Text variant="bodySm" muted style={styles.headerSub}>
          {t('newComplaint.subtitle')}
        </Text>
      </Animated.View>

      <SegmentedControl segments={MODES} value={mode} onChange={setMode} style={styles.modes} />

      {mode === 'text' ? (
        <Animated.View key="text" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          <Input
            label={t('newComplaint.problemLabel')}
            value={text}
            onChangeText={setText}
            multiline
            multilineHeight={140}
            placeholder={t('newComplaint.problemPlaceholder')}
          />
        </Animated.View>
      ) : null}

      {mode === 'voice' ? (
        <Animated.View key="voice" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          <Card style={styles.voiceCard}>
            <View style={styles.micWrap}>
              {isRecording ? <Animated.View style={[styles.micPulse, pulseStyle]} /> : null}
              <Pressable
                style={[styles.micButton, isRecording && styles.micButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={30} color={palette.white} />
              </Pressable>
            </View>

            {isRecording ? (
              <Text variant="h3" color={palette.danger} style={styles.voiceStatus}>
                {formatDuration(elapsed)}
              </Text>
            ) : recordedUri ? (
              <View style={styles.voiceReady}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <Text variant="label" color={palette.success}>
                  {` ${t('newComplaint.voiceRecorded', { duration: formatDuration(elapsed) })}`}
                </Text>
              </View>
            ) : (
              <Text variant="bodySm" muted center style={styles.voiceStatus}>
                {t('newComplaint.voiceIdle')}
              </Text>
            )}

            {recordedUri && !isRecording ? (
              <Pressable onPress={startRecording} style={styles.recordAgain}>
                <Text variant="caption" color={palette.primary}>
                  {t('newComplaint.recordAgain')}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      {mode === 'image' ? (
        <Animated.View key="image" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          {image ? (
            <Animated.View entering={FadeIn.duration(260)}>
              <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" transition={220} />
              <Pressable onPress={() => setImage(null)} style={styles.removeImage}>
                <Ionicons name="close" size={15} color={palette.white} />
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.pickRow}>
              <PickTile icon="camera" label={t('newComplaint.takePhoto')} onPress={() => pickImage(true)} />
              <PickTile icon="images" label={t('newComplaint.choosePhoto')} onPress={() => pickImage(false)} />
            </View>
          )}
          <Input label={t('newComplaint.captionLabel')} value={caption} onChangeText={setCaption} containerStyle={styles.caption} />
        </Animated.View>
      ) : null}

      <Pressable onPress={() => void captureLocation()} style={styles.locationCard} disabled={locating}>
        <View style={[styles.locationIcon, coords && styles.locationIconActive]}>
          <Ionicons name="location" size={17} color={coords ? palette.white : palette.primary} />
        </View>
        <View style={styles.locationText}>
          <Text variant="label">{coords ? t('newComplaint.locationCaptured') : locating ? t('newComplaint.gettingLocation') : t('newComplaint.addLocation')}</Text>
          <Text variant="caption" muted>
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : t('newComplaint.locationRequired')}
          </Text>
        </View>
        <Ionicons name={coords ? 'checkmark-circle' : 'chevron-forward'} size={18} color={coords ? palette.success : palette.textFaint} />
      </Pressable>

      <Button title={t('newComplaint.submit')} onPress={submit} loading={submitting} size="lg" style={styles.submit} />
    </Screen>
  );
}

function PickTile({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.pickTile} onPress={onPress}>
      <View style={styles.pickIcon}>
        <Ionicons name={icon} size={20} color={palette.primary} />
      </View>
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerSub: { marginTop: spacing.xxs },
  modes: { marginBottom: spacing.lg },

  voiceCard: { alignItems: 'center', paddingVertical: spacing.xl },
  micWrap: { alignItems: 'center', justifyContent: 'center' },
  micPulse: { position: 'absolute', width: 78, height: 78, borderRadius: radii.pill, backgroundColor: palette.danger },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: radii.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  micButtonActive: { backgroundColor: palette.danger, shadowColor: palette.danger },
  voiceStatus: { marginTop: spacing.base },
  voiceReady: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.base },
  recordAgain: { marginTop: spacing.md, padding: spacing.sm },

  pickRow: { flexDirection: 'row', gap: spacing.md },
  pickTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.xl,
  },
  pickIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  preview: { width: '100%', height: 210, borderRadius: radii.lg, backgroundColor: palette.surfaceAlt },
  removeImage: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: spacing.md },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.base,
    marginTop: spacing.lg,
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconActive: { backgroundColor: palette.success },
  locationText: { flex: 1, marginLeft: spacing.md },
  submit: { marginTop: spacing.lg },

  successWrap: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  successIcon: {
    width: 74,
    height: 74,
    borderRadius: radii.pill,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { marginTop: spacing.base },
  resultCard: { marginBottom: spacing.md },
  resultChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  resultDescription: { marginTop: spacing.md },
  transcriptBox: {
    marginTop: spacing.base,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  transcriptText: { marginTop: spacing.xs, fontStyle: 'italic' },
  followUpCard: { marginBottom: spacing.md },
  followUpHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  followUpHeaderText: {},
  followUpText: { marginTop: spacing.sm },
  followUpInput: { marginTop: spacing.base },
  followUpActions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  followUpSubmit: { marginRight: spacing.md },
  skipButton: { padding: spacing.sm },
  refinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.successSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  refinedText: {},
  successActions: { marginTop: spacing.lg },
  secondaryAction: { marginTop: spacing.md },
});
