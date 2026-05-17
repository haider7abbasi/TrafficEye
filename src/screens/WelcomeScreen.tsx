import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  BRAND_ON_PRIMARY_SUBTLE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../theme/brandColors';
import {
  ChevronRight,
  Shield,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react-native';

type WelcomeNav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

type PortalCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  onPress: () => void;
};

function PortalCard({ title, subtitle, icon, iconBg, accentColor, onPress }: PortalCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.portalCard, pressed && styles.portalCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sign in as ${title}`}>
      <View style={[styles.portalIconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.portalTextCol}>
        <Text style={styles.portalTitle}>{title}</Text>
        <Text style={styles.portalSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.portalAction, { borderColor: accentColor }]}>
        <Text style={[styles.portalActionText, { color: accentColor }]}>Sign in</Text>
        <ChevronRight size={18} color={accentColor} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNav>();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces>
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIconWrap}>
              <Shield size={34} color={BRAND_HEADER_BG} strokeWidth={2.2} />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>Traffic Eye</Text>
              <Text style={styles.heroTagline}>Smart traffic enforcement</Text>
            </View>
          </View>
          <Text style={styles.heroLead}>
            City Traffic Police — violation detection, candidate review, and digital challans in one
            place.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Welcome</Text>
            <Text style={styles.panelSubtitle}>Choose your portal to continue</Text>
          </View>

          <PortalCard
            title="Officer"
            subtitle="Capture evidence, review AI candidates, and issue challans"
            icon={<ShieldCheck size={26} color={BRAND_HEADER_BG_DEEP} strokeWidth={2.2} />}
            iconBg="#EAF4FF"
            accentColor={BRAND_HEADER_BG_DEEP}
            onPress={() => navigation.navigate('Login', { roleHint: 'officer' })}
          />

          <PortalCard
            title="Administrator"
            subtitle="Approve officers, manage rules, and oversee all challans"
            icon={<UserCog size={26} color="#334155" strokeWidth={2.2} />}
            iconBg="#f1f5f9"
            accentColor="#334155"
            onPress={() => navigation.navigate('Login', { roleHint: 'admin' })}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New officer</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerBlock}>
            <View style={styles.registerIconWrap}>
              <UserPlus size={22} color={BRAND_HEADER_BG_DEEP} strokeWidth={2.2} />
            </View>
            <View style={styles.registerTextCol}>
              <Text style={styles.registerTitle}>Request officer access</Text>
              <Text style={styles.registerDesc}>
                Submit your work details for review. An administrator will approve your profile before you
                can sign in and use enforcement features.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && styles.registerBtnPressed]}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Start officer registration">
            <Text style={styles.registerBtnText}>Start registration</Text>
          </Pressable>
        </View>

        <Text style={styles.footNote}>Authorized personnel only · Secure sign-in required</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
    flexGrow: 1,
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
    gap: 14,
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  },
  heroLead: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  panel: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  panelHeader: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE_PANEL_BORDER,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  panelSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  portalCardPressed: {
    opacity: 0.92,
    backgroundColor: '#f1f5f9',
  },
  portalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTextCol: {
    flex: 1,
    minWidth: 0,
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  portalSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 17,
  },
  portalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 4,
  },
  portalActionText: {
    fontSize: 13,
    fontWeight: 800,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: SURFACE_PANEL_BORDER,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  registerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  registerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerTextCol: { flex: 1 },
  registerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  registerDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  registerBtn: {
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: BRAND_HEADER_BG_DEEP,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  registerBtnPressed: { opacity: 0.9 },
  registerBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footNote: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
