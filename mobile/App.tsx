import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, View, ActivityIndicator, StatusBar, NativeModules, StyleSheet, Platform } from 'react-native';

import { store, loadAuth, setCredentials, setLoading, loadLanguage, setLanguage, loadTheme, setThemeMode } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import { getDB } from './src/db/database';
import './src/i18n';
import i18n from './src/i18n';

import notifee from '@notifee/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationService from './src/services/PushNotificationService';

function AppContent() {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Request Notification Permission (Android 13+)
        if (Platform.OS === 'android') {
          // Initialize FCM and Notifee
          await PushNotificationService.initialize();

          // Only check battery optimization if we haven't asked already
          const hasAskedBattery = await AsyncStorage.getItem('hasAskedBatteryOptimization');

          if (!hasAskedBattery) {
            const batteryOptimizationEnabled = await notifee.isBatteryOptimizationEnabled();
            const powerManagerInfo = await notifee.getPowerManagerInfo();

            if (batteryOptimizationEnabled || powerManagerInfo.activity) {
              Alert.alert(
                'Auto-Start Required',
                'To get instant chat notifications when your phone is locked (especially on Realme/Xiaomi/Oppo phones), you must enable "Auto-Start" and remove "Battery Restrictions".',
                [
                  {
                    text: 'Keep Disabled',
                    style: 'cancel',
                    onPress: async () => {
                      await AsyncStorage.setItem('hasAskedBatteryOptimization', 'true');
                    }
                  },
                  {
                    text: 'Open Settings',
                    onPress: async () => {
                      await AsyncStorage.setItem('hasAskedBatteryOptimization', 'true');
                      if (powerManagerInfo.activity) {
                        notifee.openPowerManagerSettings();
                      } else {
                        notifee.openBatteryOptimizationSettings();
                      }
                    }
                  }
                ],
                { cancelable: false }
              );
            }
          }
        }

        // Load saved language
        const lang = await loadLanguage();
        dispatch(setLanguage(lang));
        i18n.changeLanguage(lang);

        // Load saved theme
        const theme = await loadTheme();
        dispatch(setThemeMode(theme));

        // Load saved auth
        const auth = await loadAuth();

        // Initialize local SQLite database before rendering UI
        await getDB();

        if (auth) {
          dispatch(setCredentials(auth));
          // Refresh token now that we have auth
          PushNotificationService.refreshFCMToken();
        } else {
          dispatch(setLoading(false));
        }

      } catch (error) {
        console.error('Init error:', error);
        dispatch(setLoading(false));
      } finally {
        setIsReady(true);
      }
    };

    initApp();
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' as const },
          medium: { fontFamily: 'System', fontWeight: '500' as const },
          bold: { fontFamily: 'System', fontWeight: '700' as const },
          heavy: { fontFamily: 'System', fontWeight: '900' as const },
        },
      }}
    >
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
