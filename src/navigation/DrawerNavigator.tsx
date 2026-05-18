import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
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
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsPolicyScreen } from '../screens/TermsPolicyScreen';
import { useApp } from '../context/AppContext';
import {
  BRAND_HEADER_BG,
  BRAND_ON_PRIMARY_SUBTLE,
} from '../theme/brandColors';
import { Home, Menu } from 'lucide-react-native';
import { AppDrawerContent } from '../components/navigation/AppDrawerContent';
import type { DrawerParamList } from './drawerTypes';

export type { DrawerParamList } from './drawerTypes';

const Drawer = createDrawerNavigator<DrawerParamList>();

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

function navigateToHome(navigation: { navigate: (name: string, params?: object) => void }) {
  navigation.navigate('MainTabs', { screen: 'Capture' });
}

export function DrawerNavigator() {
  const { user } = useApp();

  return (
    <Drawer.Navigator
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        sceneContainerStyle: { backgroundColor: 'transparent' },
        drawerStyle: { width: 300, backgroundColor: '#EAF4FF' },
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
            onPress={() => navigateToHome(navigation)}
            style={{ marginRight: 14, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Go to home">
            <Home color="#fff" size={26} strokeWidth={2.5} />
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
      <Drawer.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy policy' }}
      />
      <Drawer.Screen
        name="TermsPolicy"
        component={TermsPolicyScreen}
        options={{ title: 'Terms & policy' }}
      />
    </Drawer.Navigator>
  );
}
