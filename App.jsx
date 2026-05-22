import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { T } from './src/constants/theme';
import { useFontsLoaded } from './src/hooks/useFontsLoaded';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// 內層 wrapper：等 auth 初始化（從 SecureStore 恢復 token）完成再渲染導航
function AppContent() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const fontsLoaded = useFontsLoaded();

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', backgroundColor: T.paper },
});
