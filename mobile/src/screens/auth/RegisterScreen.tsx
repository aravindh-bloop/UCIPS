import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ApiError } from '../../api/client';
import { Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input, Screen, Text, useToast } from '../../components/ui';
import { useLanguage } from '../../i18n';
import { haptics } from '../../lib/haptics';
import { AuthStackParamList } from '../../navigation/types';
import { palette, radii, spacing, stagger } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { registerStart, registerVerify } = useAuth();
  const toast = useToast();
  const { language, t } = useLanguage();

  const ROLES: { value: Role; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'citizen', label: t('register.roleCitizen'), description: t('register.roleCitizenDesc'), icon: 'person' },
    { value: 'authority', label: t('register.roleAuthority'), description: t('register.roleAuthorityDesc'), icon: 'shield-checkmark' },
  ];

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('citizen');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!name.trim() || !phone.trim() || !password || !aadhaar.trim()) {
      setError(t('register.errAllRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('register.errPasswordLength'));
      return;
    }
    if (aadhaar.replace(/\s/g, '').length !== 12) {
      setError(t('register.errAadhaarLength'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await registerStart({
        name: name.trim(),
        phone: phone.trim(),
        password,
        role,
        preferred_language: language,
        aadhaar_number: aadhaar.trim(),
      });
      haptics.success();
      setStep('otp');
      setOtp('');
      setDevOtp(result.dev_otp ?? null);
      if (!result.dev_otp) toast.success(t('register.otpSentToast'));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? t('register.errConflict')
            : err.message
          : t('login.errNetwork');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.trim().length !== 6) {
      setError(t('register.errOtpLength'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerVerify(phone.trim(), otp.trim());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('login.errNetwork');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={{ top: true, bottom: true }}>
      <Pressable
        onPress={() => (step === 'otp' ? setStep('details') : navigation.goBack())}
        style={styles.backButton}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('common.goBack')}
      >
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Pressable>

      {step === 'details' ? (
        <>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
            <Text variant="h1">{t('register.title')}</Text>
            <Text variant="body" muted style={styles.subtitle}>
              {t('register.subtitle')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(1)).duration(420)}>
            <Input label={t('register.fullName')} icon="✏️" value={name} onChangeText={setName} containerStyle={styles.field} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(2)).duration(420)}>
            <Input
              label={t('register.phoneNumber')}
              icon="📱"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(3)).duration(420)}>
            <Input
              label={t('register.aadhaarNumber')}
              icon="🪪"
              value={aadhaar}
              onChangeText={setAadhaar}
              keyboardType="number-pad"
              maxLength={12}
              placeholder={t('register.aadhaarPlaceholder')}
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(4)).duration(420)}>
            <Input
              label={t('register.password')}
              icon="🔒"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error}
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(5)).duration(420)}>
            <Text variant="overline" muted style={styles.roleLabel}>
              {t('register.iAmA')}
            </Text>
            <View style={styles.roleRow}>
              {ROLES.map((option) => {
                const selected = role === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.roleCard, selected && styles.roleCardActive]}
                    onPress={() => {
                      haptics.select();
                      setRole(option.value);
                    }}
                  >
                    <View style={[styles.roleIcon, selected && styles.roleIconActive]}>
                      <Ionicons name={option.icon} size={17} color={selected ? palette.white : palette.textMuted} />
                    </View>
                    <Text variant="label" color={selected ? palette.primary : palette.text}>
                      {option.label}
                    </Text>
                    <Text variant="caption" muted style={styles.roleDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(6)).duration(420)} style={styles.actions}>
            <Button title={t('register.sendOtp')} onPress={handleStart} loading={loading} size="lg" />
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
              <Text variant="bodySm" muted center>
                {t('register.alreadyHaveAccount')} <Text variant="label" color={palette.primary}>{t('register.signIn')}</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
            <Text variant="h1">{t('register.verifyTitle')}</Text>
            <Text variant="body" muted style={styles.subtitle}>
              {t('register.verifySubtitle', { phone })}
            </Text>
          </Animated.View>

          {devOtp ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.demoBanner}>
              <Ionicons name="warning" size={16} color={palette.warning} />
              <View style={styles.demoBannerText}>
                <Text variant="label" color={palette.warning}>
                  {t('register.demoModeTitle')}
                </Text>
                <Text variant="bodySm" muted style={styles.demoOtpLine}>
                  {t('register.demoModeBody')} {' '}
                  <Text variant="label" color={palette.text}>{devOtp}</Text>
                </Text>
                <Pressable onPress={() => setOtp(devOtp)} hitSlop={8}>
                  <Text variant="caption" color={palette.primary} style={styles.demoFillLink}>
                    {t('register.demoModeFill')}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInUp.delay(stagger(1)).duration(420)}>
            <Input
              label={t('register.otpLabel')}
              icon="🔑"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              error={error}
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(2)).duration(420)} style={styles.actions}>
            <Button title={t('register.verifyButton')} onPress={handleVerify} loading={loading} size="lg" />
            <Pressable onPress={handleStart} style={styles.linkWrap}>
              <Text variant="bodySm" muted center>
                {t('register.didntGetIt')} <Text variant="label" color={palette.primary}>{t('register.resendOtp')}</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  demoBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.warning,
    backgroundColor: palette.warningSoft,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  demoBannerText: { flex: 1 },
  demoOtpLine: { marginTop: 2, lineHeight: 18 },
  demoFillLink: { marginTop: spacing.xs, textDecorationLine: 'underline' },
  subtitle: { marginTop: spacing.xs },
  field: { marginBottom: spacing.md },
  roleLabel: { marginTop: spacing.xs, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  roleCardActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  roleIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  roleIconActive: { backgroundColor: palette.primary },
  roleDescription: { marginTop: 2 },
  actions: { marginTop: spacing.xl },
  linkWrap: { marginTop: spacing.lg, paddingVertical: spacing.sm },
});
