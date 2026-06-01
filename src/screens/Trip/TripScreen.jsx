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

// ── 卡通膠囊風色票 ────────────────────────────────────────────────────────────
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

// 停靠點膠囊輪播色（搭配標題粉紅）
const STOP_COLORS = [PAL.white, PAL.blue, PAL.white, PAL.pink];
// 判斷膠囊背景該配的字色
const inkFor = (bg) => (bg === PAL.blue ? PAL.white : PAL.black);

// ── tag / mood → Ionicons（之後可換成 Open Doodles 或自繪 PNG） ─────────────
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

// loading 動畫圖
const LOADING_FRAMES = [
  require('../../../assets/loading1.png'),
  require('../../../assets/loading2.png'),
  require('../../../assets/loading3.png'),
];

// ── 生成中輪播提示 ─────────────────────────────────────────────────────────────
const LOADING_MSGS = [
  '正在取得你的位置…',
  '搜尋附近真實店家…',
  '為你安排行程中…',
  '確認路線距離…',
];

// ── 計算行程總時長（分） ────────────────────────────────────────────────────────
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

// ── 模組層級快取（跨 tab 切換存活，App 重啟才清除）─────────────────────────────
let _tripCache = null;

// ── 依現在時間重算行程時間欄位 ────────────────────────────────────────────────
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
  const refreshKey = route?.params?.refreshKey;
  const vibeMeta = VIBES.find(v => v.key === vibeKey) || VIBES[0];

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [excludeIds, setExcludeIds] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [loadingFrame, setLoadingFrame] = useState(0);
  const loadingIntervalRef = useRef(null);
  const frameIntervalRef = useRef(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.warn('[TripScreen] 儲存行程失敗', e.message);
    } finally {
      setSaving(false);
    }
  }, [trip, isLoggedIn]);

  // 載入提示輪播（文字）
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
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [loading]);

  // 載入動畫圖片輪播（loading1/2/3）
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
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [loading]);

  // ── 生成失敗：重試畫面（卡通膠囊版） ────────────────────────────────────────
  if (loadError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerBody}>
          <View style={[styles.errPill, { transform: [{ rotate: '-1.5deg' }] }]}>
            <Ionicons name="alert-circle-outline" size={26} color={PAL.black} />
            <Text style={styles.errTitle}>找不到合適行程</Text>
          </View>
          <Text style={styles.errSub}>
            網路逾時或服務暫時忙碌{'\n'}請稍後再試一次
          </Text>
          <TouchableOpacity
            style={[styles.retryPill, { transform: [{ rotate: '1.5deg' }] }]}
            onPress={() => fetchTrip(excludeIds)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={PAL.white} />
            <Text style={styles.retryText}>重新探索</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 載入中：loading1/2/3 圖片輪播 ──────────────────────────────────────────
  if (loading || !trip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerBody}>
          <Image
            source={LOADING_FRAMES[loadingFrame]}
            style={styles.loadingImg}
            resizeMode="contain"
          />
          <Text style={styles.loadingTitle}>探索中</Text>
          <Text style={styles.loadingText}>{LOADING_MSGS[loadingMsgIdx]}</Text>
          <Text style={styles.loadingHint}>通常約需 5–15 秒</Text>
        </View>
      </View>
    );
  }

  // ── 主畫面：卡通膠囊條 ────────────────────────────────────────────────────
  const totalMin = calcTotalMin(trip.items);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 頂部：左 vibe 標籤 ＋ 右收藏鈕 */}
      <View style={styles.topBar}>
        <Text style={styles.topMeta}>
          {vibeMeta.en.toUpperCase()} · {trip.items.length} STOPS · {fmtDuration(totalMin)}
        </Text>
        <TouchableOpacity
          style={[styles.saveCorner, saved && { backgroundColor: PAL.black }]}
          activeOpacity={0.75}
          onPress={saved || saving ? undefined : handleSaveTrip}
          disabled={saving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {saving
            ? <ActivityIndicator size="small" color={PAL.black} />
            : <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={saved ? PAL.white : PAL.black}
              />
          }
        </TouchableOpacity>
      </View>

      {/* 細白線 ＋ 行程標題（單行小字） */}
      <View style={styles.titleLineWrap}>
        <View style={styles.titleLine} />
        <Text style={styles.titleLineText} numberOfLines={1}>
          {trip.title}
        </Text>
        <View style={styles.titleLine} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 停靠點膠囊們 — 字少圖多 */}
        {trip.items.map((item, i) => {
          const bg  = STOP_COLORS[i % STOP_COLORS.length];
          const ink = inkFor(bg);
          const sub = ink === PAL.white ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)';
          const tilt = (i % 2 === 0 ? 0.5 : -0.5) + 'deg';
          return (
            <View
              key={i}
              style={[
                styles.stopPill,
                { backgroundColor: bg, transform: [{ rotate: tilt }] },
              ]}
            >
              {/* 左側：大圖位（先放 Ionicons，之後可換 Open Doodles / 自繪 PNG） */}
              <View style={[styles.stopIconCircle, { borderColor: ink }]}>
                <Ionicons
                  name={getMoodIcon(item.tag, item.mood)}
                  size={30}
                  color={ink}
                />
              </View>

              {/* 中間：活動名（大）＋ 時間（小） */}
              <View style={styles.stopMiddle}>
                <Text style={[styles.stopName, { color: ink }]} numberOfLines={1}>
                  {item.activity}
                </Text>
                <Text style={[styles.stopTime, { color: sub }]}>
                  {item.time} · {item.dur}
                </Text>
              </View>

              {/* 右側：編號 */}
              <Text style={[styles.stopNum, { color: ink, opacity: 0.85 }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* 底部動作列：換一批 + 開始導覽 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        {/* 換一批（搖一搖） */}
        <TouchableOpacity
          style={styles.shakePill}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Shake', { vibeKey })}
        >
          <ShakeIcon color={PAL.black} />
          <Text style={styles.shakeText}>換一批</Text>
        </TouchableOpacity>

        {/* 開始導覽 */}
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
          <Ionicons name="arrow-forward" size={16} color={PAL.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 搖一搖小圖
function ShakeIcon({ color }) {
  const c = color ?? PAL.black;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M7 2h8a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 17.8a.6.6 0 100 1.2.6.6 0 000-1.2z" fill={c} />
      <Path d="M19 9c1 1.5 1 3.5 0 5" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M21.5 7c1.8 2.8 1.8 6.2 0 9" stroke={c} strokeWidth={1.4} strokeLinecap="round" opacity="0.55" />
    </Svg>
  );
}

// ── 樣式（卡通膠囊 + 思源黑體） ──────────────────────────────────────────────
const BORDER = 2.5;
const PILL_RADIUS = 999;
const HARD_SHADOW = {
  shadowColor: PAL.black,
  shadowOffset: { width: 3, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 0,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAL.yellow },

  // ── 頂部狀態條 ────────────────────────────────────────────────────────
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
  },
  topMeta: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: PAL.black,
  },

  // ── 中央通用排版（loading / error） ─────────────────────────────────────
  centerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  loadingImg: { width: 120, height: 120, marginBottom: 4 },
  loadingTitle: {
    fontFamily: Fonts.sansBlack,
    fontSize: 22,
    color: PAL.black,
    letterSpacing: 1,
  },
  loadingText: {
    fontFamily: Fonts.sansMed,
    fontSize: 14,
    color: PAL.black,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
    letterSpacing: 1.2,
    marginTop: 4,
  },

  // ── 錯誤畫面 ─────────────────────────────────────────────────────────
  errPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: PAL.white,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SHADOW,
  },
  errTitle: { fontFamily: Fonts.sansBlack, fontSize: 16, color: PAL.black },
  errSub: {
    fontFamily: Fonts.sansMed,
    fontSize: 13,
    color: PAL.black,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 14,
    backgroundColor: PAL.blue,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SHADOW,
    marginTop: 6,
  },
  retryText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    color: PAL.white,
    letterSpacing: 1,
  },

  // ── 列表 ─────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 14,
  },

  // ── 標題粉膠囊 ───────────────────────────────────────────────────────
  headerPill: {
    backgroundColor: PAL.pink,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    paddingHorizontal: 26,
    paddingVertical: 18,
    alignItems: 'center',
    ...HARD_SHADOW,
  },
  headerTitle: {
    fontFamily: Fonts.sansBlack,
    fontSize: 20,
    color: PAL.black,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: Fonts.sansMed,
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  // ── 停靠點膠囊 ───────────────────────────────────────────────────────
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    paddingLeft: 10,
    paddingRight: 18,
    paddingVertical: 12,
    minHeight: 78,
    ...HARD_SHADOW,
  },
  stopBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: {
    fontFamily: Fonts.sansBlack,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  stopMiddle: { flex: 1, minWidth: 0 },
  stopTime: {
    fontFamily: Fonts.sansMed,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  stopName: {
    fontFamily: Fonts.sansBlack,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  stopDesc: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  stopRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 80,
  },
  stopTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: PILL_RADIUS,
    borderWidth: 1.5,
  },
  stopTagText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  stopDist: {
    fontFamily: Fonts.sansMed,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── 結尾 ─────────────────────────────────────────────────────────────
  endPill: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  endText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 3,
  },

  // ── 底部動作列 ───────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRound: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PAL.white,
    borderWidth: BORDER,
    borderColor: PAL.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...HARD_SHADOW,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: PILL_RADIUS,
    backgroundColor: PAL.blue,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SHADOW,
  },
  actionPrimaryText: {
    fontFamily: Fonts.sansBlack,
    fontSize: 15,
    color: PAL.white,
    letterSpacing: 2,
  },
});
