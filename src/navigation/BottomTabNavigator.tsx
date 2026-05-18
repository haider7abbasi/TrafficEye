import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CaptureScreen } from '../screens/CaptureScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { AppBottomTabBar } from './AppBottomTabBar';
import { QueueTabScreen } from './QueueTabScreen';

export type BottomTabParamList = {
  /** `cameraRequestId` — set by the center Capture FAB to choose photo or video capture. */
  Capture: { cameraRequestId?: number } | undefined;
  Queue: undefined;
  History: undefined;
  Analytics: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Capture"
      tabBar={props => <AppBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen name="Capture" component={CaptureScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Queue" component={QueueTabScreen} options={{ title: 'Queue' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Insights' }} />
    </Tab.Navigator>
  );
}
