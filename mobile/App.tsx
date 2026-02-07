import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { store, loadAuth, setCredentials, setLoading, loadLanguage, setLanguage } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import './src/i18n';
import i18n from './src/i18n';

function AppContent() {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Load saved language
        const lang = await loadLanguage();
        dispatch(setLanguage(lang));
        i18n.changeLanguage(lang);

        // Load saved auth
        const auth = await loadAuth();
        if (auth) {
          dispatch(setCredentials(auth));
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a5f2a" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
