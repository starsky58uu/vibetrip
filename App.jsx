import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // 🌟 新增 Stack 導航
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// 匯入頁面
import HomeScreen from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';
import ArScreen from './src/screens/ArScreen'; 
import MapScreen from './src/screens/MapScreen'; 
import WeatherDetailScreen from './src/screens/WeatherDetailScreen'; 

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator(); // 🌟 建立 Stack 實例

const themeColors = {
  background: '#362360',
  textMain: '#E9F3FB',
  textSub: '#84A6D3',
  accentMain: '#C95E9E',
};

// 🌟 1. 先定義底部 Tab 的組合
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { 
          position: 'absolute',
          bottom: 20,
          left: 15,
          right: 15,
          backgroundColor: 'rgba(54, 35, 96, 0.95)', 
          height: 70, 
          paddingBottom: 10,
          paddingTop: 5,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: themeColors.textSub,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 0.8,
          shadowRadius: 0, 
        },
        tabBarActiveTintColor: themeColors.accentMain,
        tabBarInactiveTintColor: themeColors.textSub,
        tabBarLabelStyle: { fontFamily: 'VibePixel', fontSize: 11 },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Result') iconName = focused ? 'gift' : 'gift-outline';
          else if (route.name === 'AR') iconName = focused ? 'scan' : 'scan-outline';
          else if (route.name === 'Footprint') iconName = focused ? 'map' : 'map-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '主頁', headerShown: false }} />
      <Tab.Screen name="Result" component={ResultScreen} options={{ tabBarLabel: '行程', headerShown: false }} />
      <Tab.Screen name="AR" component={ArScreen} options={{ tabBarLabel: 'AR雷達', headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Footprint" component={MapScreen} options={{ tabBarLabel: '足跡', headerShown: false }} />
    </Tab.Navigator>
  );
}

// 🌟 2. 主 App 邏輯
export default function App() {
  const [fontsLoaded] = useFonts({
    'VibePixel': require('./src/assets/fonts/Cubic_11.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#362360' }}>
        <ActivityIndicator size="large" color="#C95E9E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.background} />
      <SafeAreaView style={styles.appView} edges={['top', 'left', 'right']}>
        <NavigationContainer>
          {/* 🌟 使用 Stack 導航作為最外層 */}
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* 第一層：包含四個 Tab 的主畫面 */}
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* 第二層：天氣詳情頁面（點擊後會覆蓋在 Tab 之上，讓畫面更乾淨） */}
            <Stack.Screen 
              name="WeatherDetail" 
              component={WeatherDetailScreen} 
              options={{
                animationEnabled: true,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: { opacity: current.progress } // 增加一個簡單的淡入效果
                })
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appView: { flex: 1, backgroundColor: '#362360' },
});