import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CaptureScreen } from '../screens/CaptureScreen';
import { HistoryScreen } from '../screens/HistoryScreen';

export type BottomTabParamList = {
  Capture: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  iconWrapActive: {},
  emoji: { fontSize: 22 },
});

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 64,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
        tabBarItemStyle: { paddingTop: 4 },
      }}>
      <Tab.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarAccessibilityLabel: 'Scan, open camera and detection',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarAccessibilityLabel: 'Violation history',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
