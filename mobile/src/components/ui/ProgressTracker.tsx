import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProgressStage } from '../../api/types';
import { useLanguage } from '../../i18n';
import { localeForLanguage } from '../../i18n/locale';
import { palette, radii, spacing, stagger } from '../../theme';
import { Text } from './Text';

interface ProgressTrackerProps {
  stages: ProgressStage[];
}

/**
 * Delivery-tracker style vertical stepper. Each stage's state comes from the backend, which
 * derives it from actual pipeline state (cluster membership, generated project, approved
 * budget run) rather than a stored progress column -- so this can't show progress the system
 * didn't actually make.
 */
export function ProgressTracker({ stages }: ProgressTrackerProps) {
  const { language } = useLanguage();
  const locale = localeForLanguage(language);

  return (
    <View>
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const done = stage.state === 'done';
        const current = stage.state === 'current';

        const dotColor = done ? palette.success : current ? palette.primary : palette.surfaceAlt;
        const labelColor = done || current ? palette.text : palette.textFaint;

        return (
          <Animated.View key={stage.key} entering={FadeInDown.delay(stagger(index)).duration(360)} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: dotColor }, current && styles.dotCurrent]}>
                {done ? (
                  <Ionicons name="checkmark" size={13} color={palette.white} />
                ) : current ? (
                  <View style={styles.pulseCore} />
                ) : null}
              </View>
              {!isLast ? (
                <View style={[styles.connector, { backgroundColor: done ? palette.success : palette.border }]} />
              ) : null}
            </View>

            <View style={[styles.content, isLast && styles.contentLast]}>
              <Text variant="label" color={labelColor}>
                {stage.label}
              </Text>
              {stage.detail ? (
                <Text variant="caption" muted style={styles.detail}>
                  {stage.detail}
                </Text>
              ) : null}
              {stage.at ? (
                <Text variant="caption" faint style={styles.timestamp}>
                  {new Date(stage.at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: 26 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    borderWidth: 3,
    borderColor: palette.primarySoft,
  },
  pulseCore: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: palette.white,
  },
  connector: { width: 2, flex: 1, minHeight: 22 },
  content: { flex: 1, marginLeft: spacing.md, paddingBottom: spacing.lg },
  contentLast: { paddingBottom: 0 },
  detail: { marginTop: 2 },
  timestamp: { marginTop: 2 },
});
