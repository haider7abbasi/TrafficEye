import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ViolationDetailScreen } from '../screens/ViolationDetailScreen';
export type HistoryStackParamList = {
  HistoryList: undefined;
  ViolationDetail: { recordId: string };
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: 'transparent' },
        // Nested in bottom tabs: tab bar already reserves bottom inset — avoid a second stack safe area gap.
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}>
      <Stack.Screen name="HistoryList" component={HistoryScreen} />
      <Stack.Screen name="ViolationDetail" component={ViolationDetailScreen} />
    </Stack.Navigator>
  );
}
