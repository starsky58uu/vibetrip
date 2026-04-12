import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { themeColors } from '../constants/theme';

import HomeScreen from '../screens/Home/HomeScreen';
import ResultScreen from '../screens/BlindBox/ResultScreen';
import ArScreen from '../screens/AR/ArScreen';
import MapScreen from '../screens/Map/MapScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { 
          position: 'absolute', bottom: 20, left: 15, right: 15,
          backgroundColor: 'rgba(54, 35, 96, 0.95)', height: 70, 
          paddingBottom: 10, paddingTop: 5, borderRadius: 20,
          borderWidth: 2, borderColor: themeColors.textSub,
          elevation: 5, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.8, shadowRadius: 0, 
        },
        tabBarActiveTintColor: themeColors.accentMain,
        tabBarInactiveTintColor: themeColors.textSub,
        tabBarLabelStyle: { fontFamily: 'VibePixel', fontSize: 11 },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Result') iconName = focused ? 'gift' : 'gift-outline';
          else if (route.name === 'AR') iconName = focused ? 'scan' : 'scan-outline';
          else if (route.name === 'Map') iconName = focused ? 'map' : 'map-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '主頁', headerShown: false }} />
      <Tab.Screen name="Result" component={ResultScreen} options={{ tabBarLabel: '盲盒', headerShown: false }} />
      <Tab.Screen name="AR" component={ArScreen} options={{ tabBarLabel: 'AR雷達', headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: '足跡', headerShown: false }} />
    </Tab.Navigator>
  );
}