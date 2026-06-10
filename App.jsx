/**
 * App.jsx — VibeTrip root component
 *
 * 結構（由外往內）：
 *   GestureHandlerRootView → SafeAreaProvider → AuthProvider → DimProvider → AppContent
 *
 * - AuthProvider：負責 JWT token、登入狀態（從 SecureStore 恢復）
 * - DimProvider：低明度（莫蘭迪）色票切換
 * - AppContent：等字型 + auth 初始化完成才掛 AppNavigator
 */
import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFontsLoaded } from './src/hooks/useFontsLoaded';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DimProvider } from './src/context/DimContext';
import { PAL_BRIGHT } from './src/constants/palette';
import EnvBanner from './src/components/EnvBanner';

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PAL_BRIGHT.blue} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={PAL_BRIGHT.yellow} />
      <AppNavigator />
      <EnvBanner />
    </View>
  );
}

export default function App() {
  const fontsLoaded = useFontsLoaded();

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PAL_BRIGHT.blue} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DimProvider>
            <AppContent />
          </DimProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: PAL_BRIGHT.yellow,
  },
});
