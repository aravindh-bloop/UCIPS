import * as Haptics from 'expo-haptics';

/**
 * Safe haptics wrapper.
 *
 * expo-haptics' SDK 57 docs page does not carry the "Included in Expo Go" badge that the
 * other Expo modules we use do, so the native module may be unavailable at runtime.
 * Haptics are a nice-to-have, never load-bearing -- so every call is swallowed on failure
 * rather than being allowed to crash a screen. Fire-and-forget: never awaited by callers.
 */

function safe(fn: () => Promise<void>): void {
  try {
    fn().catch(() => {});
  } catch {
    // native module missing -- ignore
  }
}

export const haptics = {
  /** Standard button/card press. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Heavier press -- primary CTAs. */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Toggle / segmented control / rating change. */
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
