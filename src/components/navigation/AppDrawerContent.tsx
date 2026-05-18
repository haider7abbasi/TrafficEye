import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  BarChart3,
  ChevronRight,
  FileStack,
  FolderOpen,
  Home,
  Info,
  ListChecks,
  Ruler,
  Settings,
  Shield,
  FileText,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { getFocusedLeafRouteName } from '../../navigation/drawerNavUtils';
import type { DrawerParamList } from '../../navigation/drawerTypes';
import {
  BG_LIGHT_BLUE,
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  BRAND_ON_PRIMARY_SUBTLE,
  ON_PRIMARY_MUTED,
  ON_PRIMARY_SUBTLE,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  WHITE,
} from '../../theme/brandColors';

type DrawerRoute = keyof DrawerParamList;

type DrawerNavItem = {
  key: DrawerRoute;
  label: string;
  subtitle?: string;
  Icon: LucideIcon;
  params?: object;
  /** Additional focused route names that highlight this row (e.g. bottom tab aliases). */
  matchLeaves?: string[];
};

type DrawerSection = {
  id: string;
  title: string;
  items: DrawerNavItem[];
};

const HOME_ITEM: DrawerNavItem = {
  key: 'MainTabs',
  label: 'Home',
  subtitle: 'Capture dashboard',
  Icon: Home,
  params: { screen: 'Capture' },
  matchLeaves: ['Capture', 'MainTabs'],
};

const OFFICER_SECTIONS: DrawerSection[] = [
  {
    id: 'enforcement',
    title: 'Enforcement',
    items: [
      {
        key: 'MyChallans',
        label: 'My challans',
        subtitle: 'Issued by you',
        Icon: FolderOpen,
      },
      {
        key: 'CandidateQueue',
        label: 'Candidate queue',
        subtitle: 'Review & confirm',
        Icon: ListChecks,
        matchLeaves: ['CandidateQueue', 'Queue'],
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      {
        key: 'Analytics',
        label: 'Analytics',
        subtitle: 'Trends & statistics',
        Icon: BarChart3,
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    items: [
      {
        key: 'DetectionRules',
        label: 'Detection rules',
        subtitle: 'Model & policy map',
        Icon: Ruler,
      },
    ],
  },
];

const ADMIN_SECTIONS: DrawerSection[] = [
  {
    id: 'enforcement',
    title: 'Enforcement',
    items: [
      {
        key: 'MyChallans',
        label: 'My challans',
        subtitle: 'Your issued challans',
        Icon: FolderOpen,
      },
      {
        key: 'AllChallans',
        label: 'All challans',
        subtitle: 'Department-wide records',
        Icon: FileStack,
        matchLeaves: ['AllChallans', 'Queue'],
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    items: [
      {
        key: 'ApproveOfficers',
        label: 'Approve officers',
        subtitle: 'Pending registrations',
        Icon: BadgeCheck,
      },
      {
        key: 'ManageRules',
        label: 'Manage rules',
        subtitle: 'Detection thresholds',
        Icon: Wrench,
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      {
        key: 'Analytics',
        label: 'Analytics',
        subtitle: 'Trends & statistics',
        Icon: BarChart3,
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    items: [
      {
        key: 'DetectionRules',
        label: 'Detection rules',
        subtitle: 'Model & policy map',
        Icon: Ruler,
      },
    ],
  },
];

const LEGAL_SECTION: DrawerSection = {
  id: 'legal',
  title: 'Legal',
  items: [
    {
      key: 'PrivacyPolicy',
      label: 'Privacy policy',
      subtitle: 'Data collection & retention',
      Icon: Shield,
    },
    {
      key: 'TermsPolicy',
      label: 'Terms & usage',
      subtitle: 'Acceptable use rules',
      Icon: FileText,
    },
  ],
};

const ACCOUNT_SECTION: DrawerSection = {
  id: 'account',
  title: 'Account',
  items: [
    {
      key: 'Profile',
      label: 'Profile',
      subtitle: 'Officer details',
      Icon: User,
    },
    {
      key: 'Settings',
      label: 'Settings',
      subtitle: 'Preferences & sign out',
      Icon: Settings,
    },
    {
      key: 'About',
      label: 'About TrafficEye',
      subtitle: 'Version & legal',
      Icon: Info,
    },
  ],
};

function isItemActive(leaf: string | undefined, item: DrawerNavItem): boolean {
  if (!leaf) {
    return false;
  }
  if (item.key === 'MainTabs') {
    const tab = (item.params as { screen?: string } | undefined)?.screen ?? 'Capture';
    return leaf === tab || leaf === 'MainTabs';
  }
  if (item.matchLeaves?.includes(leaf)) {
    return true;
  }
  return leaf === item.key;
}

function roleLabel(role?: string): string {
  if (role === 'admin') {
    return 'Administrator';
  }
  if (role === 'officer') {
    return 'Traffic officer';
  }
  return role ?? 'Officer';
}

type NavRowProps = {
  item: DrawerNavItem;
  active: boolean;
  onPress: () => void;
};

function DrawerNavRow({ item, active, onPress }: NavRowProps) {
  const Icon = item.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        active && styles.navRowActive,
        pressed && styles.navRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}>
      {active ? <View style={styles.navActiveBar} /> : null}
      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
        <Icon
          size={20}
          color={active ? PRIMARY_BLUE : TEXT_MUTED}
          strokeWidth={active ? 2.5 : 2}
        />
      </View>
      <View style={styles.navTextCol}>
        <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight
        size={18}
        color={active ? PRIMARY_BLUE : '#cbd5e1'}
        strokeWidth={2}
      />
    </Pressable>
  );
}

type SectionBlockProps = {
  section: DrawerSection;
  focusedLeaf: string | undefined;
  onNavigate: (item: DrawerNavItem) => void;
};

function DrawerSectionBlock({ section, focusedLeaf, onNavigate }: SectionBlockProps) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.items.map((item, index) => {
          const active = isItemActive(focusedLeaf, item);
          return (
            <View key={`${section.id}-${item.key}`}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <DrawerNavRow item={item} active={active} onPress={() => onNavigate(item)} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useApp();
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const focusedLeaf = getFocusedLeafRouteName(state);
  const profileFocused = focusedLeaf === 'Profile';

  const sections = useMemo(
    () => (user?.role === 'admin' ? ADMIN_SECTIONS : OFFICER_SECTIONS),
    [user?.role],
  );

  const initials = (user?.name ?? 'U')
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navigateItem = (item: DrawerNavItem) => {
    navigation.closeDrawer();
    if (item.params) {
      navigation.navigate(item.key, item.params as never);
    } else {
      navigation.navigate(item.key as never);
    }
  };

  const openProfile = () => {
    navigation.closeDrawer();
    navigation.navigate('Profile');
  };

  const homeActive = isItemActive(focusedLeaf, HOME_ITEM);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerBrandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>TE</Text>
          </View>
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>TrafficEye</Text>
            <Text style={styles.brandTagline}>Smart enforcement</Text>
          </View>
        </View>

        <Pressable
          onPress={openProfile}
          style={({ pressed }) => [
            styles.profileCard,
            profileFocused && styles.profileCardActive,
            pressed && styles.profileCardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileTextCol}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name ?? 'Officer'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel(user?.role)}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={ON_PRIMARY_SUBTLE} strokeWidth={2} />
        </Pressable>
      </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Main</Text>
          <View style={styles.sectionCard}>
            <DrawerNavRow
              item={HOME_ITEM}
              active={homeActive}
              onPress={() => navigateItem(HOME_ITEM)}
            />
          </View>
        </View>

        {sections.map(section => (
          <DrawerSectionBlock
            key={section.id}
            section={section}
            focusedLeaf={focusedLeaf}
            onNavigate={navigateItem}
          />
        ))}

        <DrawerSectionBlock
          section={LEGAL_SECTION}
          focusedLeaf={focusedLeaf}
          onNavigate={navigateItem}
        />

        <DrawerSectionBlock
          section={ACCOUNT_SECTION}
          focusedLeaf={focusedLeaf}
          onNavigate={navigateItem}
        />

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>TrafficEye</Text>
          <Text style={styles.footerVersion}>Enforcement mobile · v0.0.1</Text>
        </View>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_LIGHT_BLUE,
  },
  header: {
    backgroundColor: BRAND_HEADER_BG,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: BRAND_HEADER_BG_DEEP,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTextCol: { flex: 1 },
  brandTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandTagline: {
    color: BRAND_ON_PRIMARY_SUBTLE,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileCardActive: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileCardPressed: { opacity: 0.94 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WHITE, fontSize: 17, fontWeight: '800' },
  profileTextCol: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { color: WHITE, fontSize: 16, fontWeight: '800' },
  profileEmail: { color: ON_PRIMARY_SUBTLE, fontSize: 12 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  rolePillText: {
    color: ON_PRIMARY_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 4,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0A1F44',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      default: { elevation: 2 },
    }),
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: SURFACE_PANEL,
  },
  navRowActive: {
    backgroundColor: BG_LIGHT_BLUE,
  },
  navRowPressed: {
    backgroundColor: '#DCEEFF',
  },
  navActiveBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: PRIMARY_BLUE,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
  },
  navTextCol: { flex: 1, minWidth: 0 },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  navLabelActive: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SURFACE_PANEL_BORDER,
    marginLeft: 60,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  footerVersion: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
