import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { T } from './src/constants/theme';
import { useFontsLoaded } from './src/hooks/useFontsLoaded';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// 註：先前曾用 Text.render 全域 patch 套用 Noto Sans TC，但 RN Text 內部本身有 hooks，
// 包裝其 render 在某些情境下會讓 React 認為 hook 數量改變而報「Rendered more hooks…」。
// 已移除該 patch。需要明確 NotoSansTC 字體的元件直接用 fontFamily: Fonts.sansBold 等指定；
// 未指定的 Text 走系統字（iOS SF Pro / Android Roboto），跨平台都正常。

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
