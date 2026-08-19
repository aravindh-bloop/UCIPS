import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useToast } from '../../components/ui';
import { palette, radii, spacing, shadows } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Menu'>;

function MenuItem({ icon, label, onPress, color = palette.text, danger = false }: { icon: string, label: string, onPress: () => void, color?: string, danger?: boolean }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconBox, danger && { backgroundColor: palette.dangerSoft }]}>
          <Ionicons name={icon as any} size={22} color={danger ? palette.danger : color} />
        </View>
        <Text variant="body" style={{ color: danger ? palette.danger : palette.text, marginLeft: spacing.md, fontWeight: '500' }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.borderStrong} />
    </Pressable>
  );
}

export default function MenuScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const toast = useToast();
  const { theme, toggleTheme } = useAppTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      toast.error(t('menu.errLogout'));
    }
  };

  function openLanguagePicker() {
    Alert.alert(t('language.title'), t('language.subtitle'), [
      { text: t('language.english'), onPress: () => setLanguage('en') },
      { text: t('language.tamil'), onPress: () => setLanguage('ta') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text variant="h1" style={{ color: palette.white }}>{user?.name?.[0] || 'U'}</Text>
          </View>
          <Text variant="h2" style={{ marginTop: spacing.md }}>{user?.name || t('home.citizen')}</Text>
          <Text variant="bodySm" muted>{user?.phone || '+91 00000 00000'}</Text>
        </View>

        <View style={styles.section}>
          <Text variant="overline" muted style={styles.sectionTitle}>{t('menu.account')}</Text>
          <View style={styles.card}>
            <MenuItem icon="person-outline" label={t('menu.myProfile')} onPress={() => { navigation.goBack(); toast.success(t('menu.goToProfile')); }} />
            <View style={styles.divider} />
            <MenuItem icon="shield-checkmark-outline" label={t('menu.privacySecurity')} onPress={() => toast.success(t('menu.privacySoon'))} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="overline" muted style={styles.sectionTitle}>{t('menu.preferences')}</Text>
          <View style={styles.card}>
            <MenuItem icon={theme === 'dark' ? "moon-outline" : "sunny-outline"} label={theme === 'dark' ? t('menu.darkMode') : t('menu.lightMode')} onPress={toggleTheme} />
            <View style={styles.divider} />
            <MenuItem icon="language-outline" label={`${t('menu.language')} (${language === 'ta' ? t('language.tamil') : t('language.english')})`} onPress={openLanguagePicker} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <MenuItem icon="log-out-outline" label={t('menu.logOut')} onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backButton: { padding: spacing.xs },
  content: { paddingHorizontal: spacing.base },
  profileSection: { alignItems: 'center', marginVertical: spacing.xl },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm, paddingLeft: spacing.xs },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 52 },
});
