import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import HomeScreen    from '../screens/Home/HomeScreen';
import TripScreen    from '../screens/Trip/TripScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',    zh: '主頁', icon: 'home-outline',    iconActive: 'home'    },
  { name: 'Trip',    zh: '行程', icon: 'time-outline',    iconActive: 'time'    },
  { name: 'Explore', zh: '探索', icon: 'map-outline',     iconActive: 'map'     },
  { name: 'Profile', zh: '我的', icon: 'person-outline',  iconActive: 'person'  },
];

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.outerWrap, { paddingBottom: insets.bottom + 4, backgroundColor: colors.paper }]}>
      <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.line }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tab = TABS[i];

          const handlePress = () => {
            if (route.name === 'Profile') {
              navigation.navigate('Profile', { screen: 'ProfileMain' });
            } else if (route.name === 'Trip') {
              navigation.navigate('Trip', { screen: 'TripMain' });
            } else {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={handlePress}
              style={[styles.tabItem, focused && { backgroundColor: colors.ink }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={20}
                color={focused ? colors.paper : colors.ink3}
              />
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
  outerWrap: {
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  bar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 100,
    padding: 6,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 100,
  },
});
