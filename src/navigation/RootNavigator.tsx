import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { PendingApprovalScreen } from '../screens/PendingApprovalScreen';
import { DrawerNavigator } from './DrawerNavigator';
import { withAppScreenBackground } from './withAppScreenBackground';
import { useApp } from '../context/AppContext';

const MainWithBackground = withAppScreenBackground(DrawerNavigator);
const WelcomeWithBackground = withAppScreenBackground(WelcomeScreen);
const LoginWithBackground = withAppScreenBackground(LoginScreen);
const SignupWithBackground = withAppScreenBackground(SignupScreen);
const PendingWithBackground = withAppScreenBackground(PendingApprovalScreen);

export type RootStackParamList = {
  Welcome: undefined;
  Login: { roleHint?: 'officer' | 'admin' } | undefined;
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
        <Stack.Screen name="Main" component={MainWithBackground} />
      ) : hasSession ? (
        <Stack.Screen name="PendingApproval" component={PendingWithBackground} />
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeWithBackground} />
          <Stack.Screen name="Login" component={LoginWithBackground} />
          <Stack.Screen name="Signup" component={SignupWithBackground} />
        </>
      )}
    </Stack.Navigator>
  );
}
