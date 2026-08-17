import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../../lib/haptics';
import { palette, radii, shadows, spacing } from '../../theme';
import { Text } from './Text';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const KIND_STYLE: Record<ToastKind, { bg: string; color: string; icon: string }> = {
  success: { bg: palette.successSoft, color: palette.success, icon: '✓' },
  error: { bg: palette.dangerSoft, color: palette.danger, icon: '!' },
  info: { bg: palette.infoSoft, color: palette.info, icon: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((kind: ToastKind, message: string) => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, kind, message });
    if (kind === 'success') haptics.success();
    else if (kind === 'error') haptics.error();
    timer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const value: ToastContextValue = {
    success: useCallback((m: string) => show('success', m), [show]),
    error: useCallback((m: string) => show('error', m), [show]),
    info: useCallback((m: string) => show('info', m), [show]),
  };

  const style = toast ? KIND_STYLE[toast.kind] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && style ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.duration(260)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.wrap, { top: insets.top + spacing.sm }]}
          pointerEvents="box-none"
        >
          <Pressable onPress={() => setToast(null)} style={[styles.toast, shadows.lg, { backgroundColor: style.bg }]}>
            <View style={[styles.badge, { backgroundColor: style.color }]}>
              <Text variant="caption" color={palette.white}>
                {style.icon}
              </Text>
            </View>
            <Text variant="bodySm" color={palette.text} style={styles.message}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.base, right: spacing.base, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  message: { flex: 1 },
});
