import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Card, Screen, Text } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n';
import { localeForLanguage } from '../i18n/locale';
import { AuthorityStackParamList, CitizenStackParamList } from '../navigation/types';
import { gradients, palette, radii, spacing, stagger, TAB_BAR_HEIGHT } from '../theme';

type ProfileNav = NativeStackNavigationProp<CitizenStackParamList | AuthorityStackParamList>;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const navigation = useNavigation<ProfileNav>();

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isAuthority = user?.role === 'authority';

  function confirmLogout() {
    Alert.alert(t('profile.logOutConfirmTitle'), t('profile.logOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logOut'), style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <Screen scroll edges={{ top: true }} bottomInset={TAB_BAR_HEIGHT}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text variant="h1" style={styles.title}>
          {t('profile.title')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(stagger(1)).duration(420)}>
        <Card padded={false} elevation="lg" style={styles.identityCard}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identityHeader}>
            <View style={styles.avatar}>
              <Text variant="h1" color={palette.white}>
                {initials}
              </Text>
            </View>
            <Text variant="h2" color={palette.white} style={styles.name}>
              {user?.name}
            </Text>
            <View style={styles.roleBadge}>
              <Ionicons name={isAuthority ? 'shield-checkmark' : 'person'} size={12} color={palette.white} />
              <Text variant="caption" color={palette.white} style={styles.roleText}>
                {isAuthority ? t('profile.authority') : t('profile.citizen')}
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.details}>
            <DetailRow icon="call-outline" label={t('profile.phone')} value={user?.phone ?? '—'} />
            <DetailRow icon="mail-outline" label={t('profile.email')} value={user?.email ?? '—'} />
            <DetailRow icon="language-outline" label={t('profile.language')} value={language === 'ta' ? t('language.tamil') : language === 'hi' ? t('language.hindi') : language === 'te' ? t('language.telugu') : language === 'ml' ? t('language.malayalam') : language === 'kn' ? t('language.kannada') : t('language.english')} />
            <DetailRow
              icon="calendar-outline"
              label={t('profile.memberSince')}
              value={user ? new Date(user.created_at).toLocaleDateString(localeForLanguage(language), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              last
            />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(stagger(2)).duration(420)}>
        <Pressable onPress={() => navigation.navigate('BondsList')}>
          <Card style={styles.bondsCard}>
            <View style={styles.bondsRow}>
              <View style={[styles.bondsIcon, { backgroundColor: palette.primarySoft }]}>
                <Ionicons name="trending-up-outline" size={22} color={palette.primary} />
              </View>
              <View style={styles.bondsText}>
                <Text variant="label">{t('bonds.title')}</Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {t('bonds.profileCardSubtitle')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </View>
          </Card>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(stagger(3)).duration(420)} style={styles.aboutWrap}>
        <Card>
          <Text variant="overline" muted>
            {t('profile.about')}
          </Text>
          <Text variant="bodySm" muted style={styles.about}>
            {t('profile.aboutText')}
          </Text>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(stagger(4)).duration(420)} style={styles.logoutWrap}>
        <Button title={t('profile.logOut')} onPress={confirmLogout} variant="danger" icon="→" />
      </Animated.View>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={palette.primary} />
      </View>
      <Text variant="bodySm" muted style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="label" style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.base, marginBottom: spacing.lg },
  identityCard: { marginBottom: spacing.base },
  identityHeader: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { marginBottom: spacing.sm },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  roleText: { letterSpacing: 0.4 },
  details: { paddingHorizontal: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: { flex: 1 },
  rowValue: { maxWidth: '52%', textAlign: 'right' },
  bondsCard: { marginBottom: spacing.base },
  bondsRow: { flexDirection: 'row', alignItems: 'center' },
  bondsIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bondsText: { flex: 1 },
  aboutWrap: { marginBottom: spacing.base },
  about: { marginTop: spacing.xs },
  logoutWrap: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
