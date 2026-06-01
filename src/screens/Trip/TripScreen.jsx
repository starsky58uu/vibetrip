import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Image,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { Fonts } from '../../constants/theme';
import { VIBES } from '../../data/vibeData';
import ShakeScreen from './ShakeScreen';
import { apiPost } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

const SAVED_TRIPS_KEY = 'vt_saved_trips';

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
  purple: '#9B26B6', 
};

// 動畫圖片陣列
const VIBE_FRAMES = [
  [require('../../../assets/vibe1.png'),  require('../../../assets/vibe2.png')],
  [require('../../../assets/vibe3.png'),  require('../../../assets/vibe4.png')],
  [require('../../../assets/vibe5.png'),  require('../../../assets/vibe6.png')],
  [require('../../../assets/vibe7.png'),  require('../../../assets/vibe8.png')],
  [require('../../../assets/vibe9.png'),  require('../../../assets/vibe10.png')],
  [require('../../../assets/vibe11.png'), require('../../../assets/vibe12.png')],
  [require('../../../assets/vibe13.png'), require('../../../assets/vibe13.png')],
];

// 判斷膠囊背景該配的字色
const inkFor = (bg) => (bg === PAL.blue ? PAL.white : PAL.black);

function getMoodIcon(tag = '', mood = '') {
  const t = (tag || '').toLowerCase();
  if (t.includes('咖啡') || t.includes('cafe'))            return 'cafe-outline';
  if (t.includes('散步') || t.includes('漫步') || t.includes('消化') || t.includes('公園')) return 'walk-outline';
  if (t.includes('拍照') || t.includes('攝影'))            return 'camera-outline';
  if (t.includes('甜點') || t.includes('蛋糕') || t.includes('冰')) return 'ice-cream-outline';
  if (t.includes('飲料') || t.includes('手搖'))            return 'cafe-outline';
  if (t.includes('書'))                                    return 'book-outline';
  if (t.includes('選物') || t.includes('文創') || t.includes('禮') || t.includes('購物')) return 'bag-handle-outline';
  if (t.includes('宵夜') || t.includes('深夜') || t.includes('夜間')) return 'moon-outline';
  if (t.includes('酒') || t.includes('bar') || t.includes('居酒')) return 'wine-outline';
  if (t.includes('博物') || t.includes('展覽') || t.includes('美術')) return 'business-outline';
  if (t.includes('美食') || t.includes('必吃') || t.includes('小吃') || t.includes('餐') || t.includes('吃')) return 'restaurant-outline';
  const MOOD = {
    '☕': 'cafe-outline', '🍵': 'cafe-outline', '🧋': 'cafe-outline',
    '🍜': 'restaurant-outline', '🍣': 'restaurant-outline', '🍔': 'restaurant-outline',
    '🍰': 'ice-cream-outline', '🧁': 'ice-cream-outline', '🍦': 'ice-cream-outline',
    '🍷': 'wine-outline', '🥂': 'wine-outline', '🍸': 'wine-outline', '🍺': 'beer-outline',
    '🌿': 'leaf-outline', '🌳': 'leaf-outline', '🌸': 'flower-outline',
    '📷': 'camera-outline', '📸': 'camera-outline',
    '📚': 'book-outline', '📖': 'book-outline',
    '🛍': 'bag-handle-outline', '🛍️': 'bag-handle-outline',
    '🌙': 'moon-outline', '⭐': 'star-outline',
  };
  return MOOD[mood] || 'location-outline';
}

const LOADING_FRAMES = [
  require('../../../assets/loading1.png'),
  require('../../../assets/loading2.png'),
  require('../../../assets/loading3.png'),
];

const LOADING_MSGS = [
  '正在取得你的位置…',
  '搜尋附近真實店家…',
  '為你安排行程中…',
  '確認路線距離…',
];

function calcTotalMin(items = []) {
  if (!items.length) return 0;
  const stay = items.reduce((acc, it) => acc + (parseInt(it.dur) || 45), 0);
  const transit = 10 * (items.length - 1);
  return stay + transit;
}
function fmtDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}小時${m}分` : `${h}小時`;
}

const Stack = createNativeStackNavigator();
let _tripCache = null;

function applyCurrentTimes(trip) {
  if (!trip?.items?.length) return trip;
  const now = new Date();
  const startMin = Math.ceil((now.getHours() * 60 + now.getMinutes() + 5) / 5) * 5;
  let cursor = startMin;
  return {
    ...trip,
    items: trip.items.map(item => {
      const hh = String(Math.floor(cursor / 60) % 24).padStart(2, '0');
      const mm = String(cursor % 60).padStart(2, '0');
      const durMins = parseInt(item.dur) || 45;
      cursor += durMins + 10;
      return { ...item, time: `${hh}:${mm}` };
    }),
  };
}

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
  const { isLoggedIn } = useAuth();
  
  const vibeKey = route?.params?.vibeKey || 'cafe';
  const rawVibeIndex = VIBES.findIndex(v => v.key === vibeKey);
  const safeVibeIndex = Math.max(0, rawVibeIndex) % VIBE_FRAMES.length;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [excludeIds, setExcludeIds] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [loadingFrame, setLoadingFrame] = useState(0);
  const [titleFrameIdx, setTitleFrameIdx] = useState(0);

  const loadingIntervalRef = useRef(null);
  const frameIntervalRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTitleFrameIdx(p => (p === 0 ? 1 : 0)), 450);
    return () => clearInterval(t);
  }, []);

  const fetchTrip = async (exclude = []) => {
    setLoading(true);
    setLoadError(false);
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
      }, { timeoutMs: 25000 });
      if (result.id) setExcludeIds(prev => [...prev, result.id]);
      const withTimes = applyCurrentTimes(result);
      _tripCache = withTimes;
      setTrip(withTimes);
    } catch (e) {
      console.warn('[TripScreen] 行程生成失敗:', e.message);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasExplicit = !!(route?.params?.vibeKey || route?.params?.refreshKey);
    if (!hasExplicit) {
      if (_tripCache) {
        setTrip(_tripCache);
        setLoading(false);
        return;
      }
    }
    setSaved(false);
    const isShake = !!route?.params?.refreshKey;
    if (isShake && _tripCache?.id) {
      setExcludeIds(prev => {
        const next = [...prev, _tripCache.id];
        fetchTrip(next);
        return next;
      });
    } else {
      setExcludeIds([]);
      fetchTrip([]);
    }
  }, [route?.params?.vibeKey, route?.params?.refreshKey]);

  const handleSaveTrip = useCallback(async () => {
    if (!trip) return;
    setSaving(true);
    try {
      if (isLoggedIn) {
        let lat = 25.0330, lon = 121.5654;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        } catch {}
        await apiPost('/api/v1/spots/personal', {
          latitude:  lat + (Math.random() - 0.5) * 0.001,
          longitude: lon + (Math.random() - 0.5) * 0.001,
          content:   `📍 ${trip.title}\n${trip.items.map((it, i) => `${i + 1}. ${it.activity}`).join('\n')}`,
          is_public: false,
        });
        Alert.alert('已儲存', '行程已同步至你的雲端帳號 ☁️');
      } else {
        const raw = await AsyncStorage.getItem(SAVED_TRIPS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({ ...trip, savedAt: new Date().toISOString() });
        await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(list.slice(0, 50)));
        Alert.alert('已儲存', '行程已存在手機裡，登入後可同步至雲端 📱');
      }
      setSaved(true);
    } catch (e) {
      Alert.alert('儲存失敗', '請稍後再試');
    } finally {
      setSaving(false);
    }
  }, [trip, isLoggedIn]);

  useEffect(() => {
    if (loading) {
      setLoadingMsgIdx(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MSGS.length);
      }, 2400);
    } else if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    return () => clearInterval(loadingIntervalRef.current);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      setLoadingFrame(0);
      frameIntervalRef.current = setInterval(() => {
        setLoadingFrame(prev => (prev + 1) % LOADING_FRAMES.length);
      }, 320);
    } else if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    return () => clearInterval(frameIntervalRef.current);
  }, [loading]);

  if (loadError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerBody}>
          <View style={styles.errPillWrapper}>
            <View style={[styles.offsetShadow, { backgroundColor: PAL.purple }]} />
            <View style={[styles.errPill, { transform: [{ rotate: '-1.5deg' }] }]}>
              <Ionicons name="alert-circle" size={26} color={PAL.black} />
              <Text style={styles.errTitle}>找不到合適行程</Text>
            </View>
          </View>
          <Text style={styles.errSub}>網路逾時或服務暫時忙碌{'\n'}請稍後再試一次</Text>
          <View style={styles.retryPillWrapper}>
            <View style={[styles.offsetShadow, { backgroundColor: PAL.pink }]} />
            <TouchableOpacity style={[styles.retryPill, { transform: [{ rotate: '1.5deg' }] }]} onPress={() => fetchTrip(excludeIds)}>
              <Ionicons name="refresh" size={16} color={PAL.white} />
              <Text style={styles.retryText}>重新探索</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading || !trip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerBody}>
          <Image source={LOADING_FRAMES[loadingFrame]} style={styles.loadingImg} resizeMode="contain" />
          <Text style={styles.loadingTitle}>探索中</Text>
          <Text style={styles.loadingText}>{LOADING_MSGS[loadingMsgIdx]}</Text>
          <Text style={styles.loadingHint}>通常約需 5–15 秒</Text>
        </View>
      </View>
    );
  }

  const totalMin = calcTotalMin(trip.items);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* ── 頂部區塊 ── */}
      <View style={styles.headerWrapper}>
        <View style={styles.titleContainer}>
          
          <View style={styles.animalColumn}>
            <Image 
              source={VIBE_FRAMES[safeVibeIndex][titleFrameIdx]} 
              style={styles.titleImage} 
              resizeMode="contain" 
              fadeDuration={0}
            />
            <Text style={styles.durationText}>
              {fmtDuration(totalMin)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.75}
            onPress={saved || saving ? undefined : handleSaveTrip}
            disabled={saving}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={PAL.white} />
            ) : (
              <Ionicons
                name="bookmark"
                size={24} // 書籤尺寸縮小
                color={saved ? PAL.blue : PAL.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 停靠點膠囊 (右 > 左 > 右 > 左) ── */}
        {trip.items.map((item, i) => {
          const isRight = i % 2 === 0; // 0, 2, 4 -> 靠右
          let theme;
          
          if (isRight) {
            // 靠右的膠囊：粉藍交替 (0: 粉, 2: 藍, 4: 粉)
            const isPink = (i / 2) % 2 === 0;
            theme = {
              bg: isPink ? PAL.pink : PAL.blue,
              shadow: isPink ? PAL.blue : PAL.pink, // 陰影是對比色
              align: 'flex-end',
            };
          } else {
            // 靠左的膠囊：全白 (白底紫影)
            theme = {
              bg: PAL.white,
              shadow: PAL.purple,
              align: 'flex-start',
            };
          }

          const ink = inkFor(theme.bg);
          const sub = ink === PAL.white ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)';

          return (
            <View key={i} style={[styles.pillWrapper, { alignSelf: theme.align }]}>
              {/* 實體色塊陰影 */}
              <View style={[styles.pillShadow, { backgroundColor: theme.shadow }]} />

              <View style={[styles.stopPill, { backgroundColor: theme.bg }]}>
                <View style={styles.stopIconCircle}>
                  <Ionicons name={getMoodIcon(item.tag, item.mood)} size={22} color={ink} />
                </View>

                <View style={styles.stopMiddle}>
                  <Text style={[styles.stopName, { color: ink }]} numberOfLines={1}>
                    {item.activity}
                  </Text>
                  <Text style={[styles.stopTime, { color: sub }]}>
                    {item.time} · {item.dur}
                  </Text>
                </View>

                <Text style={[styles.stopNum, { color: ink, opacity: ink === PAL.white ? 0.3 : 0.15 }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── 底部動作列 ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        <View style={styles.btnWrapper}>
          <View style={[styles.offsetShadow, { backgroundColor: PAL.blue }]} />
          <TouchableOpacity
            style={styles.shakePill}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Shake', { vibeKey })}
          >
            <Ionicons name="refresh" size={20} color={PAL.black} style={{ marginRight: 6 }} />
            <Text style={styles.shakeText}>換一批</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.btnWrapper, { flex: 1 }]}>
          <View style={[styles.offsetShadow, { backgroundColor: PAL.pink }]} />
          <TouchableOpacity
            style={styles.actionPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AR', {
              mode: 'trip',
              tripTitle: trip.title,
              tripItems: trip.items.map(item => ({
                name:  item.activity,
                desc:  item.desc  ?? '',
                time:  item.time  ?? '',
                dur:   item.dur   ?? '',
                mood:  item.mood  ?? '📍',
                tag:   item.tag   ?? '',
              })),
            })}
          >
            <Text style={styles.actionPrimaryText}>開始導覽</Text>
            <Ionicons name="arrow-forward" size={18} color={PAL.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── 樣式 ──────────────────────────────────────────────────────────────
const PILL_RADIUS = 999;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAL.yellow },

  /* ── 頂部區塊 ── */
  headerWrapper: {
    paddingTop: 8,
    paddingBottom: 4, 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', 
    transform: [{ translateX: 10 }], // 微調偏移維持小動物視覺置中
  },
  animalColumn: {
    alignItems: 'center', 
  },
  titleImage: {
    height: 130, 
    width: 160,  
  },
  durationText: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    color: PAL.black,
    opacity: 0.55,
    marginTop: -8, 
    letterSpacing: 2,
  },
  saveBtn: {
    marginLeft: -25, 
    marginBottom: 42, // ✅ 往上提，剛好避開下方文字，跟小動物底部完美切齊
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── 中央 Loading/Error ── */
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  loadingImg: { width: 120, height: 120, marginBottom: 4 },
  loadingTitle: { fontFamily: Fonts.sansBlack, fontSize: 22, color: PAL.black, letterSpacing: 1 },
  loadingText: { fontFamily: Fonts.sansMed, fontSize: 14, color: PAL.black, textAlign: 'center', lineHeight: 22 },
  loadingHint: { fontFamily: Fonts.sans, fontSize: 11, color: 'rgba(0,0,0,0.55)', textAlign: 'center', letterSpacing: 1.2, marginTop: 4 },

  errPillWrapper: { position: 'relative' },
  errPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: PAL.white, borderRadius: PILL_RADIUS },
  errTitle: { fontFamily: Fonts.sansBlack, fontSize: 16, color: PAL.black },
  errSub: { fontFamily: Fonts.sansMed, fontSize: 13, color: PAL.black, textAlign: 'center', lineHeight: 20 },
  retryPillWrapper: { position: 'relative', marginTop: 6 },
  retryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 26, paddingVertical: 14, backgroundColor: PAL.blue, borderRadius: PILL_RADIUS },
  retryText: { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.white, letterSpacing: 1 },

  /* ── 列表 ── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12, 
    gap: 40, // 間距加到最大，為了塞入超大偏移陰影
  },

  /* ── 停靠點膠囊 (實體色塊硬陰影) ── */
  pillWrapper: {
    width: '85%', // 留出左右交錯的空間
    position: 'relative',
  },
  pillShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: PILL_RADIUS,
    top: 16,  
    left: 16, 
  },
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: PILL_RADIUS,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 14,
    minHeight: 80,
  },
  stopIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  stopMiddle: { flex: 1 },
  stopName: { fontFamily: Fonts.sansBlack, fontSize: 16, letterSpacing: 0.5 },
  stopTime: { fontFamily: Fonts.sansMed, fontSize: 12, marginTop: 4 },
  stopNum: { fontFamily: Fonts.sansBlack, fontSize: 32, letterSpacing: -1, marginLeft: 8 },

  /* ── 底部動作列 ── */
  bottomBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWrapper: {
    position: 'relative',
  },
  offsetShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: PILL_RADIUS,
    top: 8,
    left: 8,
  },
  shakePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAL.white,
    borderRadius: PILL_RADIUS,
    paddingHorizontal: 20,
    height: 52,
  },
  shakeText: {
    fontFamily: Fonts.sansBlack,
    fontSize: 15,
    color: PAL.black,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: PILL_RADIUS,
    backgroundColor: PAL.blue,
  },
  actionPrimaryText: {
    fontFamily: Fonts.sansBlack,
    fontSize: 16,
    color: PAL.white,
    letterSpacing: 1,
  },
});