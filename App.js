import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// 空白畫面，把內容做好再換掉
const HomeScreen = () => <View style={styles.screen}><Text style={styles.text}>主頁 (Vibe盲盒)</Text></View>;
const ResultScreen = () => <View style={styles.screen}><Text style={styles.text}>盲盒 (3小時行程)</Text></View>;
const ArScreen = () => <View style={styles.screen}><Text style={styles.text}>AR 實境雷達</Text></View>;
const MapScreen = () => <View style={styles.screen}><Text style={styles.text}>旅人足跡</Text></View>;

// 頂部導覽列
const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}> 
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              tabBarStyle: { backgroundColor: '#1e293b' }, 
              tabBarActiveTintColor: '#60a5fa', 
              tabBarInactiveTintColor: '#94a3b8', 
              tabBarIndicatorStyle: { backgroundColor: '#60a5fa' },
              tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '探索' }} />
            <Tab.Screen name="Result" component={ResultScreen} options={{ tabBarLabel: '行程' }} />
            <Tab.Screen name="AR" component={ArScreen} options={{ tabBarLabel: 'AR 雷達' }} />
            <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: '足跡' }} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});