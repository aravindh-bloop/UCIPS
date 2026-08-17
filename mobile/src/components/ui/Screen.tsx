import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing } from '../../theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Use false when the screen owns a FlatList. */
  scroll?: boolean;
  /** Apply the top safe-area inset. Off by default since stack headers already handle it. */
  edges?: { top?: boolean; bottom?: boolean };
  padded?: boolean;
  background?: string;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding so content clears a floating tab bar. */
  bottomInset?: number;
}

export function Screen({
  children,
  scroll = false,
  edges,
  padded = true,
  background = palette.bg,
  contentStyle,
  refreshing,
  onRefresh,
  bottomInset = 0,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = edges?.top ? insets.top : 0;
  const paddingBottom = (edges?.bottom ? insets.bottom : 0) + bottomInset;

  const inner: ViewStyle = {
    paddingTop,
    paddingBottom,
    paddingHorizontal: padded ? spacing.base : 0,
  };

  if (scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[inner, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.flex, { backgroundColor: background }, inner, contentStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
});
