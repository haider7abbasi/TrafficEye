import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  createDrawerNavigator,
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

const OFFICER_MENU_ITEMS: {
  key: keyof DrawerParamList;
  label: string;
  icon: string;
  params?: object;
}[] = [
  { key: 'MainTabs', label: 'Dashboard', icon: '🏠', params: { screen: 'Capture' } },
  { key: 'MainTabs', label: 'Scan', icon: '📷', params: { screen: 'Capture' } },
  { key: 'MainTabs', label: 'History', icon: '📋', params: { screen: 'History' } },
  { key: 'CandidateQueue', label: 'Candidate Queue', icon: '🧾' },
  { key: 'MyChallans', label: 'My Challans', icon: '🗂️' },
  { key: 'Analytics', label: 'Analytics', icon: '📊' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
  { key: 'Settings', label: 'Settings', icon: '⚙️' },
  { key: 'DetectionRules', label: 'Detection rules', icon: '📐' },
  { key: 'About', label: 'About', icon: 'ℹ️' },
];

const ADMIN_MENU_ITEMS: {
  key: keyof DrawerParamList;
  label: string;
  icon: string;
  params?: object;
}[] = [
  { key: 'MainTabs', label: 'Dashboard', icon: '🏠', params: { screen: 'Capture' } },
  { key: 'MainTabs', label: 'Scan', icon: '📷', params: { screen: 'Capture' } },
  { key: 'MainTabs', label: 'History', icon: '📋', params: { screen: 'History' } },
  { key: 'MyChallans', label: 'My Challans', icon: '🗂️' },
  { key: 'AllChallans', label: 'All Challans', icon: '📚' },
  { key: 'ManageRules', label: 'Manage Rules', icon: '🛠️' },
  { key: 'ApproveOfficers', label: 'Approve Officers', icon: '✅' },
  { key: 'Analytics', label: 'Analytics', icon: '📊' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
  { key: 'Settings', label: 'Settings', icon: '⚙️' },
  { key: 'DetectionRules', label: 'Detection rules', icon: '📐' },
  { key: 'About', label: 'About', icon: 'ℹ️' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useApp();
  const { navigation } = props;
  const menuItems = user?.role === 'admin' ? ADMIN_MENU_ITEMS : OFFICER_MENU_ITEMS;

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    navigation.closeDrawer();
    await logout();
  };

  return (
    <View style={drawerStyles.root}>
      {/* Profile Header */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.avatarCircle}>
          <Text style={drawerStyles.avatarText}>{initials}</Text>
        </View>
        <Text style={drawerStyles.userName}>{user?.name ?? 'User'}</Text>
        <Text style={drawerStyles.userEmail}>{user?.email ?? ''}</Text>
        <Text style={drawerStyles.userRole}>{user?.role ?? 'Officer'}</Text>
      </View>

      {/* Navigation Items */}
      <ScrollView style={drawerStyles.nav} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, idx) => (
          <Pressable
            key={`${item.key}-${idx}`}
            style={({ pressed }) => [drawerStyles.navItem, pressed && drawerStyles.navItemPressed]}
            onPress={() => {
              navigation.closeDrawer();
              if (item.params) {
                navigation.navigate(item.key, item.params as any);
              } else {
                navigation.navigate(item.key as any);
              }
            }}>
            <Text style={drawerStyles.navIcon}>{item.icon}</Text>
            <Text style={drawerStyles.navLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Logout Footer */}
      <View style={drawerStyles.footer}>
        <Pressable style={drawerStyles.logoutBtn} onPress={handleLogout}>
          <Text style={drawerStyles.logoutIcon}>🚪</Text>
          <Text style={drawerStyles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const drawerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1d4ed8',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  userEmail: { color: '#bfdbfe', fontSize: 12 },
  userRole: { color: '#93c5fd', fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  nav: { flex: 1, paddingTop: 8, paddingHorizontal: 10 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 1,
  },
  navItemPressed: { backgroundColor: '#eff6ff' },
  navIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  navLabel: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  logoutIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  logoutText: { fontSize: 15, color: '#dc2626', fontWeight: '600' },
});

function HeaderTitle() {
  return (
    <View>
      <Text style={headerStyles.title}>Traffic Violation</Text>
      <Text style={headerStyles.subtitle}>Detection System</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#bfdbfe', fontSize: 11 },
});

export function DrawerNavigator() {
  const { user } = useApp();

  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerStyle: { width: 280 },
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitle: () => <HeaderTitle />,
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.toggleDrawer()}
            style={{ marginLeft: 14, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={12}>
            <Text style={{ color: '#fff', fontSize: 24 }}>☰</Text>
          </Pressable>
        ),
        headerRight: () => (
          <View style={{ marginRight: 14, alignItems: 'flex-end' }}>
            <Text style={{ color: '#bfdbfe', fontSize: 10 }}>Welcome</Text>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
              {user?.name ?? ''}
            </Text>
          </View>
        ),
      })}>
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ title: 'Dashboard' }}
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
