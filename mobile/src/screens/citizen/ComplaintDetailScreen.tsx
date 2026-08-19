import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ApiError } from '../../api/client';
import * as complaintsApi from '../../api/complaints';
import { ComplaintOut, FeedbackOut } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../config';
import { Button, Card, Input, Screen, SeverityChip, Skeleton, StatusChip, Text, useToast } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { CitizenStackParamList, AuthorityStackParamList } from '../../navigation/types';
import { categoryStyle, palette, radii, spacing, spring } from '../../theme';

type Props = NativeStackScreenProps<CitizenStackParamList | AuthorityStackParamList, 'ComplaintDetail'>;

export default function ComplaintDetailScreen({ route }: Props) {
  const { complaintId } = route.params;
  const { token } = useAuth();
  const toast = useToast();

  const [complaint, setComplaint] = useState<ComplaintOut | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setComplaint(await complaintsApi.getOne(token, complaintId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load this report');
    } finally {
      setLoading(false);
    }
    try {
      setFeedback(await complaintsApi.getFeedback(token, complaintId));
    } catch {
      setFeedback(null); // 404 = no feedback yet, which is normal
    }
  }, [token, complaintId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitFeedback() {
    if (!token || !rating) return;
    setSubmitting(true);
    try {
      setFeedback(await complaintsApi.submitFeedback(token, complaintId, rating, comment.trim() || undefined));
      toast.success('Thanks for your feedback');
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409 ? 'You already reviewed this report' : 'Could not submit feedback',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !complaint) {
    return (
      <Screen scroll>
        <Skeleton width="100%" height={150} radius={radii.lg} style={{ marginTop: spacing.base }} />
        <Skeleton width="60%" height={16} style={{ marginTop: spacing.lg }} />
        <Skeleton width="90%" height={13} style={{ marginTop: spacing.md }} />
        <Skeleton width="80%" height={13} style={{ marginTop: spacing.sm }} />
      </Screen>
    );
  }

  const cat = categoryStyle(complaint.category);
  const created = new Date(complaint.created_at);

  return (
    <Screen scroll>
      <Animated.View entering={FadeInDown.duration(420)}>
        <LinearGradient
          colors={[cat.color, cat.color + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroIcon}>{cat.icon}</Text>
          <Text variant="h2" color={palette.white}>
            {cat.label}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.85)" style={styles.heroRef}>
            {complaint.reference_code}
          </Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text variant="caption" color={palette.white}>
                {complaint.channel === 'voice' ? '🎤 Voice' : complaint.channel === 'image' ? '📷 Photo' : complaint.channel === 'phone' ? '☎️ Phone' : '📝 Text'}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Text variant="caption" color={palette.white}>
                {created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.chipRow}>
        <StatusChip status={complaint.status} />
        <SeverityChip severity={complaint.severity} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(420)}>
        <Card style={styles.card}>
          <Text variant="overline" muted>
            AI Summary
          </Text>
          <Text variant="body" style={styles.summary}>
            {complaint.description ?? '—'}
          </Text>
        </Card>
      </Animated.View>

      {complaint.image_url ? (
        <Animated.View entering={FadeInDown.delay(180).duration(420)}>
          <Image
            source={{ uri: `${API_BASE_URL}${complaint.image_url}` }}
            style={styles.photo}
            contentFit="cover"
            transition={260}
          />
        </Animated.View>
      ) : null}

      {complaint.transcript ? (
        <Animated.View entering={FadeInDown.delay(200).duration(420)}>
          <Card style={styles.card}>
            <Text variant="overline" muted>
              What you said
            </Text>
            <Text variant="body" style={styles.transcript}>
              “{complaint.transcript}”
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      {complaint.raw_text && complaint.raw_text !== complaint.description ? (
        <Animated.View entering={FadeInDown.delay(220).duration(420)}>
          <Card style={styles.card}>
            <Text variant="overline" muted>
              Your words
            </Text>
            <Text variant="body" style={styles.summary}>
              {complaint.raw_text}
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(240).duration(420)}>
        <Card style={styles.card}>
          <Text variant="overline" muted>
            Location
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={cat.color} />
            <Text variant="body" style={styles.locationText}>
              {complaint.lat.toFixed(5)}, {complaint.lng.toFixed(5)}
            </Text>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(420)}>
        {feedback ? (
          <Card style={styles.card} accent={palette.success}>
            <Text variant="overline" color={palette.success}>
              Your feedback
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= feedback.rating ? 'star' : 'star-outline'}
                  size={20}
                  color={n <= feedback.rating ? palette.warning : palette.textFaint}
                />
              ))}
            </View>
            {feedback.comment ? (
              <Text variant="bodySm" muted style={styles.feedbackComment}>
                “{feedback.comment}”
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text variant="overline" muted>
              Rate the resolution
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} index={n} rating={rating} onPress={() => { haptics.select(); setRating(n); }} />
              ))}
            </View>
            <Input
              label="Comment (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              multilineHeight={90}
              containerStyle={styles.commentInput}
            />
            <Button
              title="Submit Feedback"
              onPress={submitFeedback}
              loading={submitting}
              disabled={!rating}
              style={styles.feedbackButton}
            />
          </Card>
        )}
      </Animated.View>
    </Screen>
  );
}

function Star({ index, rating, onPress }: { index: number; rating: number | null; onPress: () => void }) {
  const filled = !!rating && index <= rating;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (filled) {
      scale.value = withSpring(1.18, spring.bouncy, () => {
        scale.value = withSpring(1, spring.bouncy);
      });
    }
  }, [filled, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={style}>
        <Ionicons name={filled ? 'star' : 'star-outline'} size={30} color={filled ? palette.warning : palette.textFaint} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.base },
  heroIcon: { fontSize: 34, marginBottom: spacing.sm },
  heroRef: { marginTop: 2, letterSpacing: 0.6 },
  heroChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
  card: { marginTop: spacing.md },
  summary: { marginTop: spacing.xs },
  transcript: { marginTop: spacing.xs, fontStyle: 'italic' },
  photo: { width: '100%', height: 210, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: palette.surfaceAlt },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  locationText: { letterSpacing: 0.3 },
  starsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  feedbackComment: { marginTop: spacing.md, fontStyle: 'italic' },
  commentInput: { marginTop: spacing.base },
  feedbackButton: { marginTop: spacing.base },
});
