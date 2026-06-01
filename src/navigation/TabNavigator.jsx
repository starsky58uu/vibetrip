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

const TABS = [
  { name: 'Home',    zh: '主頁', icon: 'home-outline',   iconActive: 'home'   },
  { name: 'Trip',    zh: '行程', icon: 'time-outline',   iconActive: 'time'   },
  { name: 'Explore', zh: '探索', icon: 'map-outline',    iconActive: 'map'    },
  { name: 'Profile', zh: '我的', icon: 'person-outline', iconActive: 'person' },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const TAB_COLORS = [colors.cRed, colors.cYellow, colors.cBlue, colors.cGreen];

  return (
    <View style={[
      styles.wrap,
      {
        // 動態計算底部距離，避開 iPhone 底部的橫條
        bottom: Math.max(insets.bottom + 10, 24),
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
              {/* 上方短色線改為在 icon 正上方微調 */}
              {focused && (
                <View style={[styles.indicator, { backgroundColor: c }]} />
              )}
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
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
    // 讓導覽列變成懸浮的白色膠囊
    position: 'absolute',
    alignSelf: 'center',
    width: '88%',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000000', // 加上黑邊呼應整體像素風格
    // 陰影設定
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 6, // 往下移一點才不會切到圓角
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
});