import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input, Screen, Text, useToast } from '../../components/ui';
import { useLanguage } from '../../i18n';
import { AuthStackParamList } from '../../navigation/types';
import { gradients, palette, radii, shadows, spacing, stagger } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError(t('login.errEmpty'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? t('login.errIncorrect')
            : err.message
          : t('login.errNetwork');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.logo, shadows.primary]}>
          <Text variant="display" color={palette.white}>
            U
          </Text>
        </LinearGradient>
        <Text variant="h1" style={styles.title}>
          {t('login.welcomeBack')}
        </Text>
        <Text variant="body" muted center style={styles.subtitle}>
          {t('login.subtitle')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(stagger(1)).duration(450)}>
        <Input
          label={t('login.phoneOrEmail')}
          icon="👤"
          value={identifier}
          onChangeText={(t) => {
            setIdentifier(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.field}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(stagger(2)).duration(450)}>
        <Input
          label={t('login.password')}
          icon="🔒"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            setError(null);
          }}
          secureTextEntry
          error={error}
          containerStyle={styles.field}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(stagger(3)).duration(450)} style={styles.actions}>
        <Button title={t('login.signIn')} onPress={handleLogin} loading={loading} size="lg" />

        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
          <Text variant="bodySm" muted center>
            {t('login.newHere')} <Text variant="label" color={palette.primary}>{t('login.createAccount')}</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
  logo: { width: 76, height: 76, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.lg },
  subtitle: { marginTop: spacing.xs, maxWidth: 300 },
  field: { marginBottom: spacing.md },
  actions: { marginTop: spacing.sm },
  linkWrap: { marginTop: spacing.lg, paddingVertical: spacing.sm },
});
