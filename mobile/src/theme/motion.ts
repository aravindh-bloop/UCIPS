import { Easing } from 'react-native-reanimated';

/**
 * Shared motion tokens. Every animation in the app pulls its timing/spring config from
 * here so the whole product feels like one motion system rather than per-screen guesses.
 */

export const duration = {
  instant: 100,
  fast: 160,
  base: 260,
  slow: 420,
  slower: 650,
} as const;

export const easing = {
  /** Standard "decelerate" curve -- good default for entrances and most UI motion. */
  standard: Easing.bezier(0.22, 1, 0.36, 1),
  /** For elements leaving the screen. */
  exit: Easing.bezier(0.4, 0, 1, 1),
  linear: Easing.linear,
} as const;

export const spring = {
  /** Tight, snappy -- button/card press feedback. */
  press: { damping: 18, stiffness: 380, mass: 0.55 },
  /** Soft overshoot -- elements entering or values settling. */
  enter: { damping: 16, stiffness: 140, mass: 0.9 },
  /** Very bouncy -- celebratory moments (approval success, submit confirmation). */
  bouncy: { damping: 11, stiffness: 190, mass: 0.8 },
  /** No overshoot -- layout/position changes that shouldn't wobble. */
  smooth: { damping: 26, stiffness: 210, mass: 1 },
} as const;

/** Delay between consecutive items in a staggered list entrance. */
export const STAGGER_STEP = 55;

export function stagger(index: number, step = STAGGER_STEP, max = 8): number {
  return Math.min(index, max) * step;
}
