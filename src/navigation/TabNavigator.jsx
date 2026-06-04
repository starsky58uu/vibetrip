import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen    from '../screens/Home/HomeScreen';
import TripScreen    from '../screens/Trip/TripScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { Fonts } from '../constants/theme';
import { usePAL } from '../context/DimContext';

const Tab = createBottomTabNavigator();

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

const TABS = [
  { name: 'Home',    zh: '主頁', icon: 'home-outline',   iconActive: 'home'   },
  { name: 'Trip',    zh: '行程', icon: 'time-outline',   iconActive: 'time'   },
  { name: 'Explore', zh: '探索', icon: 'map-outline',    iconActive: 'map'    },
  { name: 'Profile', zh: '我的', icon: 'person-outline', iconActive: 'person' },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const C      = usePAL();

  // 粉色指示線的位置（依當前 tab index 滑動）
  const indicatorAnim = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [state.index]);

  // 每個 tab 的寬度 = (88% 螢幕 - 內距) / 4
  const tabCount = state.routes.length;
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * (100 / tabCount)),
  });

  return (
    <View style={[
      styles.wrap,
      {
        bottom: Math.max(insets.bottom + 10, 24),
        backgroundColor: C.white,
      },
    ]}>
      {/* 滑動指示線 — 外層 wrapper 一個 tab 寬度，內層 24px 小線置中 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicatorWrapper,
          {
            width: `${100 / tabCount}%`,
            transform: [{
              translateX: indicatorAnim.interpolate({
                inputRange: state.routes.map((_, i) => i),
                outputRange: state.routes.map((_, i) => `${i * 100}%`),
              }),
            }],
          },
        ]}
      >
        <View style={[styles.indicatorLine, { backgroundColor: C.pink }]} />
      </Animated.View>
      <View style={styles.row}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tab     = TABS[i];

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
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={21}
                color={focused ? C.black : 'rgba(0,0,0,0.32)'}
              />
              <Text style={[
                styles.label,
                {
                  color: focused ? C.black : 'rgba(0,0,0,0.32)',
                  fontFamily: focused ? Fonts.sansBlack : Fonts.sansMed,
                },
              ]}>
                {tab.zh}
              </Text>
              {/* 不再在這裡畫橫線 — 改由父層 slidingIndicator 滑動到正確位置 */}
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
    position: 'absolute',
    alignSelf: 'center',
    width: '88%',
    height: 64,
    borderRadius: 32,
    // backgroundColor 由元件用 usePAL 動態指定（隨 dim 模式切換）
    // 輕柔陰影取代黑色硬框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 32,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    position: 'relative',
  },
  // 滑動指示線外層（一個 tab 寬度，跟著 active 滑動）
  indicatorWrapper: {
    position: 'absolute',
    bottom: 7,
    left: 0,
    height: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 真正的小線（在 wrapper 內置中）
  indicatorLine: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});