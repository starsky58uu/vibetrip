import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// 引入我們剛剛拆分的模組
import { themeColors } from './src/constants/theme';
import { useFontsLoaded } from './src/hooks/useFontsLoaded';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const fontsLoaded = useFontsLoaded();

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.accentMain} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.background} />
      <SafeAreaView style={styles.appView} edges={['top', 'left', 'right']}>
        {/* 所有的路由和頁面邏輯都交給 AppNavigator 處理 */}
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ 
  appView: { 
    flex: 1, 
    backgroundColor: themeColors.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    backgroundColor: themeColors.background 
  }
});