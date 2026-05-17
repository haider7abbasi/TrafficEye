import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Shield } from 'lucide-react-native';
import {
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  BRAND_ON_PRIMARY_SUBTLE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../../theme/brandColors';

type Props = {
  children: ReactNode;
  onBack: () => void;
  backLabel?: string;
  formTitle: string;
  formSubtitle?: string;
  headerExtra?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared auth chrome: readable back control, green brand hero, elevated form card.
 * Works on the light AppScreenBackground scrim (no light-on-light title text).
 */
export function AuthScreenShell({
  children,
  onBack,
  backLabel = 'Choose role',
  formTitle,
  formSubtitle,
  headerExtra,
  contentContainerStyle,
}: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <ScrollView
          contentContainerStyle={[styles.scroll, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable
            style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}>
            <ChevronLeft size={22} color={BRAND_HEADER_BG_DEEP} strokeWidth={2.5} />
            <Text style={styles.backText}>{backLabel}</Text>
          </Pressable>

          <View style={styles.hero}>
            <View style={styles.heroInner}>
              <View style={styles.heroIconWrap}>
                <Shield size={32} color={BRAND_HEADER_BG} strokeWidth={2.2} />
              </View>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTitle}>Traffic Eye</Text>
                <Text style={styles.heroTagline}>Smart traffic enforcement</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.formTitle}>{formTitle}</Text>
              {formSubtitle ? <Text style={styles.formSubtitle}>{formSubtitle}</Text> : null}
            </View>
            {headerExtra}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingRight: 12,
    gap: 2,
  },
  backRowPressed: { opacity: 0.75 },
  backText: {
    color: BRAND_HEADER_BG_DEEP,
    fontSize: 15,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: BRAND_HEADER_BG_DEEP,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: { flex: 1 },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroTagline: {
    color: BRAND_ON_PRIMARY_SUBTLE,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: SURFACE_PANEL,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE_PANEL_BORDER,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  formSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
  },
});

/** Shared field styles for login / signup forms. */
export const authFormStyles = StyleSheet.create({
  roleBanner: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  roleBannerOfficer: {
    backgroundColor: '#EAF4FF',
    borderColor: '#DCEEFF',
  },
  roleBannerAdmin: {
    backgroundColor: '#f8fafc',
    borderColor: SURFACE_PANEL_BORDER,
  },
  roleBannerText: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 4 },
  roleBannerHint: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1, lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
  },
  inputIconSlot: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  input: { flex: 1, paddingVertical: 13, color: TEXT_PRIMARY, fontSize: 15 },
  passwordToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },
  btn: {
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 18,
    minHeight: 50,
    justifyContent: 'center',
    shadowColor: BRAND_HEADER_BG_DEEP,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnDisabled: { opacity: 0.88 },
  btnLast: { marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  linkText: {
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  linkStrong: {
    color: BRAND_HEADER_BG_DEEP,
    fontWeight: '800',
  },
  helpBox: {
    backgroundColor: '#EAF4FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCEEFF',
    gap: 4,
  },
  helpTitle: { fontSize: 12, fontWeight: '800', color: BRAND_HEADER_BG_DEEP, marginBottom: 2 },
  helpHint: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17 },
});
