// App.tsx
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import * as SplashScreen from 'expo-splash-screen';

global.Buffer = Buffer;

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

import { forceDevMode } from '@/shared/utils/devModeUtils';

// Run this immediately at app startup
forceDevMode().catch(console.error);

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/shared/navigation/RootNavigator';
import { navigationRef } from './src/shared/hooks/useAppNavigation';
import { store, persistor } from './src/shared/state/store';
import './src/shared/utils/polyfills';
import COLORS from './src/assets/colors';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';

import TransactionNotification from './src/core/shared-ui/TransactionNotification';
import { IncomingCallModal } from '@/core/chat';

// Import DevMode components
import DevDrawer from './src/core/dev-mode/DevDrawer';

// Import Notification Service
import notificationService from './src/shared/services/notificationService';

// Import Environment Error provider and new components
import DevModeStatusBar from './src/core/dev-mode/DevModeStatusBar';
import { DevModeProvider, useDevMode } from '@/shared/context/DevModeContext';
import { DefaultCustomizationConfig } from '@/shared/config';
import { CustomizationProvider } from '@/shared/config/CustomizationProvider';
import { EnvErrorProvider, useEnvError } from '@/shared/context/EnvErrorContext';
import { EnvWarningDrawer } from './src/core/dev-mode';

const PersistLoading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
  </View>
);

const GlobalUIElements = () => (
  <>
    <TransactionNotification />
    <IncomingCallModal />
  </>
);

const DevModeComponents = () => {
  const { isDevMode } = useDevMode();
  if (!isDevMode) return null;
  return (
    <>
      <DevModeStatusBar />
      <DevDrawer />
    </>
  );
};

const StandardModeComponents = () => {
  const { isDevMode } = useDevMode();
  const { error } = useEnvError();
  if (isDevMode || !error) return null;
  return <EnvWarningDrawer />;
};

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [config] = useState(DefaultCustomizationConfig);

  // SANITY CHECK: Purge hardcoded test wallet from persistence
  useEffect(() => {
    const purgeTestWallet = async () => {
      try {
        const BUGHACKER_ADDR = '2ggoPe4b9KFQQ5hghks3S9QWYdbSsGq1sJFscVNva5ZM';
        const persistedData = await AsyncStorage.getItem('persist:root');
        if (persistedData && persistedData.includes(BUGHACKER_ADDR)) {
          console.warn('[App] Detected hardcoded test wallet in persistence. Purging auth state...');
          // We could use persistor.purge(), but let's be surgical and just logout
          store.dispatch({ type: 'auth/logoutSuccess' });
          await AsyncStorage.removeItem('persist:root'); // Full reset for safety
          console.log('[App] Persistence purged. Please restart the app.');
        }
      } catch (e) {
        console.error('Failed to purge test wallet:', e);
      }
    };
    purgeTestWallet();
  }, []);

  const onBeforeLift = async () => {
    try {
      // Small delay to ensure any additional UI stabilizes
      await new Promise(resolve => setTimeout(resolve, 500));
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomizationProvider config={config}>
        <SafeAreaProvider>
          <StatusBar backgroundColor={COLORS.background} barStyle="light-content" translucent={true} />
          <ReduxProvider store={store}>
            <PersistGate loading={<PersistLoading />} persistor={persistor} onBeforeLift={onBeforeLift}>
              <DevModeProvider>
                <EnvErrorProvider>
                  <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                    <NavigationContainer ref={navigationRef}>
                      <View style={{ flex: 1 }}>
                        <RootNavigator />
                        <GlobalUIElements />
                      </View>
                    </NavigationContainer>

                    <DevModeComponents />
                    <StandardModeComponents />
                  </View>
                </EnvErrorProvider>
              </DevModeProvider>
            </PersistGate>
          </ReduxProvider>
        </SafeAreaProvider>
      </CustomizationProvider>
    </GestureHandlerRootView>
  );
}
