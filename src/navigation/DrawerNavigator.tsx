import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { BottomTabNavigator } from './BottomTabNavigator';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { DetectionRulesScreen } from '../screens/DetectionRulesScreen';
import { ApproveOfficersScreen } from '../screens/ApproveOfficersScreen';
import { CandidateQueueScreen } from '../screens/CandidateQueueScreen';
import { AllChallansScreen } from '../screens/AllChallansScreen';
import { ManageRulesScreen } from '../screens/ManageRulesScreen';
import { MyChallansScreen } from '../screens/MyChallansScreen';
import { useApp } from '../context/AppContext';
import {
  BRAND_DRAWER_PRESS,
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  BRAND_ON_PRIMARY_MUTED,
  BRAND_ON_PRIMARY_SUBTLE,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from '../theme/brandColors';
import {
  BadgeCheck,
  ChevronRight,
  FolderOpen,
  Info,
  Menu,
  Ruler,
  Settings,
  Wrench,
} from 'lucide-react-native';
import { getFocusedLeafRouteName } from './drawerNavUtils';

export type DrawerParamList = {
  MainTabs: { screen?: string } | undefined;
  Analytics: undefined;
  ApproveOfficers: undefined;
  CandidateQueue: undefined;
  MyChallans: undefined;
  ManageRules: undefined;
  AllChallans: undefined;
  Profile: undefined;
  Settings: undefined;
  About: undefined;
  DetectionRules: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

type DrawerIconProps = { size?: number; color?: string; strokeWidth?: number };

type DrawerMenuItem = {
  key: keyof DrawerParamList;
  label: string;
  Icon: React.ComponentType<DrawerIconProps>;
  params?: object;
};

const OFFICER_MENU_ITEMS: DrawerMenuItem[] = [
  { key: 'MyChallans', label: 'My challans', Icon: FolderOpen },
  { key: 'Settings', label: 'Settings', Icon: Settings },
  { key: 'DetectionRules', label: 'Detection rules', Icon: Ruler },
  { key: 'About', label: 'About', Icon: Info },
];

const ADMIN_MENU_ITEMS: DrawerMenuItem[] = [
  { key: 'MyChallans', label: 'My challans', Icon: FolderOpen },
  { key: 'ManageRules', label: 'Manage rules', Icon: Wrench },
  { key: 'ApproveOfficers', label: 'Approve officers', Icon: BadgeCheck },
  { key: 'Settings', label: 'Settings', Icon: Settings },
  { key: 'DetectionRules', label: 'Detection rules', Icon: Ruler },
  { key: 'About', label: 'About', Icon: Info },
];

function isMenuItemActive(leaf: string | undefined, item: DrawerMenuItem): boolean {
  if (!leaf) {
    return false;
  }
  if (item.key === 'MainTabs') {
    const tab = (item.params as { screen?: string } | undefined)?.screen;
    return tab === leaf;
  }
  return item.key === leaf;
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useApp();
  const { navigation, state } = props;
  const menuItems = user?.role === 'admin' ? ADMIN_MENU_ITEMS : OFFICER_MENU_ITEMS;
  const focusedLeaf = getFocusedLeafRouteName(state);
  const profileFocused = focusedLeaf === 'Profile';

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const openProfile = () => {
    navigation.closeDrawer();
    navigation.navigate('Profile');
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerStyles.scrollRoot}
      contentContainerStyle={drawerStyles.scrollContent}
      showsVerticalScrollIndicator>
      <Pressable
        onPress={openProfile}
        style={({ pressed }) => [
          drawerStyles.accountBlock,
          profileFocused && drawerStyles.accountBlockActive,
          pressed && drawerStyles.accountBlockPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open profile">
        <View style={drawerStyles.avatarRow}>
          <View style={drawerStyles.avatarCircle}>
            <Text style={drawerStyles.avatarText}>{initials}</Text>
          </View>
          <View style={drawerStyles.accountTextCol}>
            <Text style={drawerStyles.userName} numberOfLines={1}>
              {user?.name ?? 'User'}
            </Text>
            <Text style={drawerStyles.userEmail} numberOfLines={2}>
              {user?.email ?? ''}
            </Text>
            <View style={drawerStyles.rolePill}>
              <Text style={drawerStyles.userRole}>{user?.role ?? 'Officer'}</Text>
            </View>
            <Text style={drawerStyles.accountHint}>Tap to open profile</Text>
          </View>
        </View>
      </Pressable>

      <Text style={drawerStyles.sectionLabel}>More</Text>
      {menuItems.map((item, idx) => {
        const active = isMenuItemActive(focusedLeaf, item);
        return (
          <Pressable
            key={`${item.key}-${idx}`}
            style={({ pressed }) => [
              drawerStyles.navRow,
              active && drawerStyles.navRowActive,
              pressed && drawerStyles.navRowPressed,
            ]}
            onPress={() => {
              navigation.closeDrawer();
              if (item.params) {
                navigation.navigate(item.key, item.params as any);
              } else {
                navigation.navigate(item.key as any);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}>
            <View style={drawerStyles.navIconSlot}>
              <item.Icon
                size={22}
                color={active ? BRAND_HEADER_BG_DEEP : TEXT_PRIMARY}
                strokeWidth={active ? 2.5 : 2}
              />
            </View>
            <Text style={[drawerStyles.navLabel, active && drawerStyles.navLabelActive]}>{item.label}</Text>
            <ChevronRight
              size={22}
              color={active ? BRAND_HEADER_BG : '#94a3b8'}
              strokeWidth={2}
            />
          </Pressable>
        );
      })}
      <View style={drawerStyles.scrollBottomPad} />
    </DrawerContentScrollView>
  );
}

const drawerStyles = StyleSheet.create({
  scrollRoot: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { paddingBottom: 24 },
  accountBlock: {
    backgroundColor: BRAND_HEADER_BG,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_HEADER_BG_DEEP,
  },
  accountBlockActive: {
    backgroundColor: BRAND_HEADER_BG_DEEP,
  },
  accountBlockPressed: { opacity: 0.94 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  accountTextCol: { flex: 1, minWidth: 0, gap: 4 },
  userName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  userEmail: { color: BRAND_ON_PRIMARY_SUBTLE, fontSize: 12, lineHeight: 16 },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  userRole: {
    color: BRAND_ON_PRIMARY_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  accountHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_ON_PRIMARY_SUBTLE,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_MUTED,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#f1f5f9',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  navRowActive: {
    backgroundColor: '#EAF4FF',
  },
  navRowPressed: { backgroundColor: BRAND_DRAWER_PRESS },
  navIconSlot: { width: 28, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 16, color: TEXT_PRIMARY, fontWeight: '600' },
  navLabelActive: { color: BRAND_HEADER_BG_DEEP, fontWeight: '800' },
  scrollBottomPad: { height: 8, backgroundColor: '#fff' },
});

function HeaderTitle() {
  return (
    <View>
      <Text style={headerStyles.title}>Traffic Eye</Text>
      <Text style={headerStyles.subtitle} numberOfLines={1}>
        AI enforcement · monitoring
      </Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: BRAND_ON_PRIMARY_SUBTLE, fontSize: 11, lineHeight: 14, maxWidth: 220 },
});

export function DrawerNavigator() {
  const { user, logout } = useApp();

  const confirmLogout = () => {
    Alert.alert('Log out', 'Sign out of TrafficEye?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        sceneContainerStyle: { backgroundColor: 'transparent' },
        drawerStyle: { width: 304, backgroundColor: '#f1f5f9' },
        headerStyle: { backgroundColor: BRAND_HEADER_BG },
        headerTintColor: '#fff',
        headerTitle: () => <HeaderTitle />,
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.toggleDrawer()}
            style={{ marginLeft: 14, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={12}>
            <Menu color="#fff" size={26} strokeWidth={2.5} />
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            onPress={confirmLogout}
            style={{ marginRight: 14, paddingVertical: 8, paddingHorizontal: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Log out">
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Log out</Text>
          </Pressable>
        ),
      })}>
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ title: 'Home' }}
      />
      <Drawer.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Drawer.Screen
        name="MyChallans"
        component={MyChallansScreen}
        options={{ title: 'My Challans' }}
      />
      {user?.role === 'admin' ? (
        <>
          <Drawer.Screen
            name="AllChallans"
            component={AllChallansScreen}
            options={{ title: 'All Challans' }}
          />
          <Drawer.Screen
            name="ManageRules"
            component={ManageRulesScreen}
            options={{ title: 'Manage Rules' }}
          />
          <Drawer.Screen
            name="ApproveOfficers"
            component={ApproveOfficersScreen}
            options={{ title: 'Approve Officers' }}
          />
        </>
      ) : (
        <Drawer.Screen
          name="CandidateQueue"
          component={CandidateQueueScreen}
          options={{ title: 'Candidate Queue' }}
        />
      )}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
      <Drawer.Screen
        name="DetectionRules"
        component={DetectionRulesScreen}
        options={{ title: 'Detection rules' }}
      />
    </Drawer.Navigator>
  );
}
