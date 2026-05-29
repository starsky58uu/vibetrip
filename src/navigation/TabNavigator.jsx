import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import HomeScreen    from '../screens/Home/HomeScreen';
import TripScreen    from '../screens/Trip/TripScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

// Tab 順序固定，色順序＝跳色 palette
const TABS = [
  { name: 'Home',    zh: '主頁', icon: 'home-outline',   iconActive: 'home'   },
  { name: 'Trip',    zh: '行程', icon: 'time-outline',   iconActive: 'time'   },
  { name: 'Explore', zh: '探索', icon: 'map-outline',    iconActive: 'map'    },
  { name: 'Profile', zh: '我的', icon: 'person-outline', iconActive: 'person' },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // 每 tab 對應的跳色（朱 / 山吹 / 紺 / 抹茶）
  const TAB_COLORS = [colors.cRed, colors.cYellow, colors.cBlue, colors.cGreen];

  return (
    <View style={[
      styles.wrap,
      {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#000000',
        borderTopWidth: 2,
        paddingBottom: Math.max(insets.bottom - 4, 4),
      },
    ]}>
      <View style={styles.row}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tab     = TABS[i];
          const c       = TAB_COLORS[i];

          const handlePress = () => {
            if (route.name === 'Profile') {
              navigation.navigate('Profile', { screen: 'ProfileMain' });
            } else if (route.name === 'Trip') {
              // 不帶 params，僅聚焦 Tab，不清空 TripMain 已生成的行程
              navigation.navigate('Trip');
            } else {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={handlePress}
              style={styles.item}
              activeOpacity={0.7}
            >
              {/* 上方短色線 — 僅當前 tab 顯示 */}
              {focused && (
                <View style={[styles.indicator, { backgroundColor: c }]} />
              )}
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={20}
                color={focused ? colors.ink : colors.ink4}
              />
              <Text style={[
                styles.label,
                {
                  color: focused ? colors.ink : colors.ink4,
                  fontWeight: focused ? '700' : '500',
                },
              ]}>
                {tab.zh}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Trip"    component={TripScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
