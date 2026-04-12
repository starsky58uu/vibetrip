import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack'; 

import TabNavigator from './TabNavigator';
import WeatherDetailScreen from '../screens/Weather/WeatherDetailScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="WeatherDetail" component={WeatherDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}