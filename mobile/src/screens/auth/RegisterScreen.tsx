import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ApiError } from '../../api/client';
import { Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input, Screen, Text, useToast } from '../../components/ui';
import { haptics } from '../../lib/haptics';
import { AuthStackParamList } from '../../navigation/types';
import { palette, radii, spacing, stagger } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const ROLES: { value: Role; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'citizen', label: 'Citizen', description: 'Report issues in my area', icon: 'person' },
  { value: 'authority', label: 'Authority', description: 'Review and fund projects', icon: 'shield-checkmark' },
];

export default function RegisterScreen({ navigation }: Props) {
  const { registerStart, registerVerify } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('citizen');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!name.trim() || !phone.trim() || !password || !aadhaar.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (aadhaar.replace(/\s/g, '').length !== 12) {
      setError('Aadhaar number must be 12 digits.');
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
        preferred_language: 'en',
        aadhaar_number: aadhaar.trim(),
      });
      haptics.success();
      setStep('otp');
      if (result.dev_otp) {
        setOtp(result.dev_otp);
        toast.success(`Demo mode: OTP is ${result.dev_otp} (no SMS gateway connected)`);
      } else {
        toast.success('OTP sent to your phone');
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? 'An account with this phone, email, or Aadhaar number already exists.'
            : err.message
          : 'Could not reach the server. Check your connection.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerVerify(phone.trim(), otp.trim());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection.';
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
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Pressable>

      {step === 'details' ? (
        <>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
            <Text variant="h1">Create account</Text>
            <Text variant="body" muted style={styles.subtitle}>
              Join UCIPS and help shape what gets built.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(1)).duration(420)}>
            <Input label="Full name" icon="✏️" value={name} onChangeText={setName} containerStyle={styles.field} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(2)).duration(420)}>
            <Input
              label="Phone number"
              icon="📱"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(3)).duration(420)}>
            <Input
              label="Aadhaar number"
              icon="🪪"
              value={aadhaar}
              onChangeText={setAadhaar}
              keyboardType="number-pad"
              maxLength={12}
              placeholder="12-digit Aadhaar for identity verification"
              containerStyle={styles.field}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(4)).duration(420)}>
            <Input
              label="Password"
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
              I am a
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
            <Button title="Send OTP" onPress={handleStart} loading={loading} size="lg" />
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
              <Text variant="bodySm" muted center>
                Already have an account? <Text variant="label" color={palette.primary}>Sign in</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
            <Text variant="h1">Verify your phone</Text>
            <Text variant="body" muted style={styles.subtitle}>
              Enter the OTP sent to {phone}.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(stagger(1)).duration(420)}>
            <Input
              label="6-digit OTP"
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
            <Button title="Verify & Create Account" onPress={handleVerify} loading={loading} size="lg" />
            <Pressable onPress={handleStart} style={styles.linkWrap}>
              <Text variant="bodySm" muted center>
                Didn't get it? <Text variant="label" color={palette.primary}>Resend OTP</Text>
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
