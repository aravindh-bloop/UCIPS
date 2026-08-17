import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { palette, radii, shadows, spacing, spring, TAB_BAR_HEIGHT } from '../../theme';

/** Icon name per route, resolved by the route names used in CitizenTabs / AuthorityTabs. */
const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Report: { active: 'add-circle', inactive: 'add-circle-outline' },
  Nearby: { active: 'location', inactive: 'location-outline' },
  Hotspots: { active: 'flame', inactive: 'flame-outline' },
  Projects: { active: 'construct', inactive: 'construct-outline' },
  Budget: { active: 'wallet', inactive: 'wallet-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function TabItem({
  routeName,
  label,
  focused,
  onPress,
}: {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const active = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, spring.smooth);
  }, [focused, active]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + active.value * 0.08 }, { translateY: -active.value * 2 }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scale: 0.6 + active.value * 0.4 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  const icons = ICONS[routeName] ?? ICONS.Home;

  return (
    <Pressable
      style={styles.item}
      onPressIn={() => {
        pressScale.value = withSpring(0.9, spring.press);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, spring.press);
      }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
    >
      <Animated.View style={[styles.itemInner, containerStyle]}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.pill, pillStyle]} />
          <Animated.View style={iconStyle}>
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={21}
              color={focused ? palette.primary : palette.textFaint}
            />
          </Animated.View>
        </View>
        <Text variant="caption" color={focused ? palette.primary : palette.textFaint} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, shadows.lg, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        return (
          <TabItem
            key={route.key}
            routeName={route.name}
            label={label}
            focused={focused}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TAB_BAR_HEIGHT - 16 },
  itemInner: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', height: 30, width: 54 },
  pill: {
    position: 'absolute',
    width: 54,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: palette.primarySoft,
  },
  label: { marginTop: 2, fontSize: 10.5 },
});
