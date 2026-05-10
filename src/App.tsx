import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import { waitForNativeFirebaseReady } from './utils/waitForNativeFirebase';
import { AppProvider, useApp } from './context/AppContext';
import { RootNavigator } from './navigation/RootNavigator';
import { persistor, store } from './store';

function AuthSplash() {
  return (
    <View style={styles.splash} accessibilityLabel="Loading">
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

function PersistLoading() {
  return (
    <View style={styles.splash} accessibilityLabel="Restoring saved preferences">
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

/**
 * NavigationContainer must wrap a Navigator — not a plain View — or you can get a blank screen.
 * Show splash outside NavigationContainer until Firebase Auth has emitted initial state.
 */
function AppNavigationShell() {
  const { authReady } = useApp();

  if (!authReady) {
    return <AuthSplash />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    let cancelled = false;
    waitForNativeFirebaseReady()
      .then(() => {
        if (cancelled || !__DEV__) {
          return;
        }
        try {
          const app = getApp();
          console.log(
            '[Firebase] Default app connected:',
            app.name,
            '| projectId:',
            (app.options as { projectId?: string }).projectId,
          );
        } catch (e) {
          console.warn('[Firebase] getApp failed:', e);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={<PersistLoading />} persistor={persistor}>
            <AppProvider>
              <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
              <AppNavigationShell />
            </AppProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
});
