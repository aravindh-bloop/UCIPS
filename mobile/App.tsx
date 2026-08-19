import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BrandSplash from './src/components/BrandSplash';
import { ToastProvider } from './src/components/ui';
import { AuthProvider } from './src/auth/AuthContext';
import { LanguageProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationTheme } from './src/navigation/navigationTheme';
import { ThemeProvider } from './src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const [showCover, setShowCover] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCover(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showCover) {
    return (
      <View style={styles.coverContainer}>
        <Image source={require('./assets/cover.png')} style={styles.coverImage} resizeMode="cover" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!ready ? (
          <BrandSplash />
        ) : (
          <ToastProvider>
            <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  <NavigationContainer theme={navigationTheme}>
                    <RootNavigator />
                  </NavigationContainer>
                </AuthProvider>
              </LanguageProvider>
            </ThemeProvider>
          </ToastProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
});
