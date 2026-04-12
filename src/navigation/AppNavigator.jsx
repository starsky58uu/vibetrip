import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack'; 

import TabNavigator from './TabNavigator';
import WeatherDetailScreen from '../screens/WeatherDetailScreen'; 

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* 將 TabNavigator 作為主要入口 */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        {/* 其他需要被堆疊的獨立頁面放這裡 */}
        <Stack.Screen name="WeatherDetail" component={WeatherDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}