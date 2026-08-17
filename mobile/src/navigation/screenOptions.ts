import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { fonts, palette } from '../theme';

/** Shared header/transition styling for every native stack in the app. */
export const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: palette.bg },
  headerShadowVisible: false,
  headerTintColor: palette.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: palette.text },
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: palette.bg },
  animation: 'slide_from_right',
  animationDuration: 260,
};

/** Detail screens pushed over the tab bar. */
export const modalScreenOptions: NativeStackNavigationOptions = {
  ...screenOptions,
  animation: 'slide_from_bottom',
};
