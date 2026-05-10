import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { PendingApprovalScreen } from '../screens/PendingApprovalScreen';
import { DrawerNavigator } from './DrawerNavigator';
import { useApp } from '../context/AppContext';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  PendingApproval: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Must render only as a direct descendant of NavigationContainer (after auth is ready).
 */
export function RootNavigator() {
  const { hasSession, hasAccess } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasSession && hasAccess ? (
        <Stack.Screen name="Main" component={DrawerNavigator} />
      ) : hasSession ? (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
