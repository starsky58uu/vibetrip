import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { T, Fonts } from '../../constants/theme';
import { VIBES, TRIP_DATA } from '../../data/vibeData';
import VibeIcon from '../../components/VibeIcon';
import Masthead from '../../components/Masthead';
import ShakeScreen from './ShakeScreen';
import { apiPost } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function TripScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TripMain" component={TripMain} />
      <Stack.Screen name="Shake" component={ShakeScreen} />
    </Stack.Navigator>
  );
}

function TripMain({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const vibeKey = route?.params?.vibeKey || 'cafe';
  const refreshKey = route?.params?.refreshKey;   // ShakeScreen 回來時帶的時間戳
  const vibeMeta = VIBES.find(v => v.key === vibeKey) || VIBES[0];

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excludeIds, setExcludeIds] = useState([]);

  const fetchTrip = async (exclude = []) => {
    setLoading(true);
    try {
      let latitude = 25.0330;
      let longitude = 121.5654;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const result = await apiPost('/api/v1/trips/recommend', {
        vibe_key: vibeKey,
        latitude,
        longitude,
        exclude_trip_ids: exclude,
      });
      if (result.id) setExcludeIds(prev => [...prev, result.id]);
      setTrip(result);
    } catch (e) {
      console.warn('[TripScreen] API failed, using mock:', e.message);
      setTrip(TRIP_DATA[vibeKey] || TRIP_DATA.cafe);
    } finally {
      setLoading(false);
    }
  };

  // vibeKey 或 refreshKey 任一變動（從 ShakeScreen 回來）時重新拉行程
  useEffect(() => {
    setExcludeIds([]);
    fetchTrip([]);
  }, [vibeKey, refreshKey]);

  if (loading || !trip) {
    return (
      <View style={[styles.container, styles.loadingCenter, { paddingTop: insets.top, backgroundColor: colors.paper }]}>
        <Masthead onMenuPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })} colors={colors} />
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={[styles.loadingText, { color: colors.ink2 }]}>正在生成你的專屬行程…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.paper }]}>
      <Masthead onMenuPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })} colors={colors} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.ink3 }]}>BLIND BOX · 3H</Text>
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <View style={[styles.vibeStamp, { backgroundColor: vibeMeta.accent }]}>
          <VibeIcon kind={vibeMeta.icon} size={30} color={colors.paper} />
        </View>
        <View style={styles.titleText}>
          <Text style={[styles.titleLabel, { color: colors.ink3 }]}>NO.247 · {vibeMeta.en.toUpperCase()}</Text>
          <Text style={[styles.titleH2, { color: colors.ink }]}>{trip.title}</Text>
          {trip.subtitle ? <Text style={[styles.titleSub, { color: colors.tea }]}>「{trip.subtitle}」</Text> : null}
        </View>
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineContainer}>
          <View style={[styles.dashLine, { borderLeftColor: colors.ink4 }]} />
          {trip.items.map((item, i) => (
            <TimelineCard
              key={i}
              item={item}
              index={i}
              vibeColor={vibeMeta.accent}
              colors={colors}
              last={i === trip.items.length - 1}
            />
          ))}
          <View style={styles.endNote}>
            <Text style={[styles.endNoteText, { color: colors.ink3 }]}>— 回家的路自己決定 —</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom - 30, backgroundColor: colors.paper, borderTopColor: colors.line }]}>
        <TouchableOpacity
          style={[styles.btnSecondary, { backgroundColor: colors.paper2, borderColor: colors.line }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Shake', { vibeKey })}
        >
          <ShakeIcon color={colors.ink2} />
          <Text style={[styles.btnSecondaryText, { color: colors.ink }]}>搖一搖</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.ink }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AR')}
        >
          <Text style={[styles.btnPrimaryText, { color: colors.paper }]}>開啟 AR 導航</Text>
          <ArrowIcon color={colors.paper} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimelineCard({ item, index, vibeColor, colors }) {
  const C = colors ?? T;
  return (
    <View style={styles.card}>
      {/* dot */}
      <View style={styles.dotCol}>
        <View style={[styles.dot, { borderColor: vibeColor, backgroundColor: C.card }]}>
          <Text style={[styles.dotNum, { color: vibeColor }]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
      </View>
      {/* content */}
      <View style={[styles.cardContent, { backgroundColor: C.card, borderColor: C.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTimeRow}>
            <Text style={[styles.cardTime, { color: C.ink }]}>{item.time}</Text>
            <Text style={[styles.cardDur, { color: C.ink3 }]}>/ {item.dur}</Text>
          </View>
          <Text style={styles.cardMood}>{item.mood}</Text>
        </View>
        <Text style={[styles.cardActivity, { color: C.ink }]}>{item.activity}</Text>
        <Text style={[styles.cardDesc, { color: C.ink2 }]}>{item.desc}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.chip, { borderColor: vibeColor + '88' }]}>
            <Text style={[styles.chipText, { color: vibeColor }]}>{item.tag}</Text>
          </View>
          <Text style={[styles.cardDist, { color: C.ink3 }]}>→ {item.dist}</Text>
        </View>
      </View>
    </View>
  );
}

// Minimal inline SVGs for buttons
function ShakeIcon({ color }) {
  const c = color ?? T.ink2;
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      {/* phone body */}
      <Path d="M7 2h8a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* home indicator dot */}
      <Path d="M12 17.8a.6.6 0 100 1.2.6.6 0 000-1.2z" fill={c} />
      {/* vibration arcs */}
      <Path d="M19 9c1 1.5 1 3.5 0 5" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M21.5 7c1.8 2.8 1.8 6.2 0 9" stroke={c} strokeWidth={1.4} strokeLinecap="round" opacity="0.55" />
    </Svg>
  );
}
function ArrowIcon({ color }) {
  const c = color ?? T.paper;
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: Fonts.serif, fontSize: 14, color: T.ink2 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 8,
  },
  headerLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: T.ink3,
    letterSpacing: 4,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.paper2,
    borderWidth: 1, borderColor: T.line,
    alignItems: 'center', justifyContent: 'center',
  },

  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  vibeStamp: {
    width: 54, height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  titleText: { flex: 1 },
  titleLabel: { fontFamily: Fonts.mono, fontSize: 9, color: T.ink3, letterSpacing: 3.5 },
  titleH2: { fontFamily: Fonts.serifBold, fontSize: 22, color: T.ink, lineHeight: 28, marginTop: 3 },
  titleSub: { fontFamily: Fonts.latinItalic, fontSize: 13, color: T.tea, marginTop: 3 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 4 },
  timelineContainer: { position: 'relative' },
  dashLine: {
    position: 'absolute',
    left: 21,
    top: 10,
    bottom: 80,
    width: 0,
    borderLeftWidth: 1.5,
    borderLeftColor: T.ink4,
    borderStyle: 'dashed',
    opacity: 0.5,
  },

  card: { flexDirection: 'row', gap: 14, paddingVertical: 10 },
  dotCol: {
    width: 44,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 18,
  },
  dot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.card,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  dotNum: { fontFamily: Fonts.serifBold, fontSize: 11 },

  cardContent: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cardTime: { fontFamily: Fonts.latin, fontSize: 17, fontWeight: '500', color: T.ink },
  cardDur: { fontFamily: Fonts.mono, fontSize: 9, color: T.ink3 },
  cardMood: { fontSize: 18 },
  cardActivity: { fontFamily: Fonts.serifBold, fontSize: 15, color: T.ink, marginBottom: 4 },
  cardDesc: { fontFamily: Fonts.serif, fontSize: 12, color: T.ink2, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  chipText: { fontFamily: Fonts.mono, fontSize: 10 },
  cardDist: { fontFamily: Fonts.mono, fontSize: 9, color: T.ink3 },

  endNote: { paddingVertical: 10, paddingLeft: 44 },
  endNoteText: { fontFamily: Fonts.latinItalic, fontSize: 12, color: T.ink3 },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: T.paper,
    borderTopWidth: 1,
    borderTopColor: T.line,
    alignItems: 'center',     
    justifyContent: 'center',
    height: 80,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: T.paper2,
    borderWidth: 1,
    borderColor: T.line,
  },
  btnSecondaryText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: T.ink,
  },
  btnPrimaryText: { fontFamily: Fonts.serifBold, fontSize: 14, color: T.paper, letterSpacing: 1 },
});
