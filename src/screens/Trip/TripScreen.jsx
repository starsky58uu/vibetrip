import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { T, Fonts } from '../../constants/theme';
import { VIBES, getFallbackTrip } from '../../data/vibeData';
import VibeIcon from '../../components/VibeIcon';

// ── tag / mood → Ionicons 圖示對映 ───────────────────────────────────────────
const MOOD_ICON_MAP = {
  '☕': 'cafe-outline',   '🍵': 'cafe-outline',   '🧋': 'cafe-outline',
  '🍜': 'restaurant-outline', '🍣': 'restaurant-outline', '🍔': 'restaurant-outline',
  '🥘': 'restaurant-outline', '🍱': 'restaurant-outline', '🍝': 'restaurant-outline',
  '🍰': 'ice-cream-outline',  '🧁': 'ice-cream-outline',  '🍦': 'ice-cream-outline',
  '🍺': 'beer-outline',  '🍷': 'wine-outline',  '🥂': 'wine-outline', '🍸': 'wine-outline',
  '🌿': 'leaf-outline',  '🌳': 'leaf-outline',  '🌸': 'flower-outline',
  '📷': 'camera-outline', '📸': 'camera-outline',
  '🎨': 'color-palette-outline', '📚': 'book-outline', '📖': 'book-outline',
  '🛍': 'bag-handle-outline', '🛍️': 'bag-handle-outline',
  '🌙': 'moon-outline', '⭐': 'star-outline',
};
function getMoodIcon(tag = '', mood = '') {
  const t = (tag || '').toLowerCase();
  if (t.includes('咖啡') || t.includes('cafe'))              return 'cafe-outline';
  if (t.includes('散步') || t.includes('漫步') || t.includes('消化') || t.includes('公園')) return 'walk-outline';
  if (t.includes('拍照') || t.includes('攝影'))              return 'camera-outline';
  if (t.includes('甜點') || t.includes('蛋糕') || t.includes('冰'))   return 'ice-cream-outline';
  if (t.includes('飲料') || t.includes('手搖'))              return 'cafe-outline';
  if (t.includes('書'))                                      return 'book-outline';
  if (t.includes('選物') || t.includes('文創') || t.includes('禮') || t.includes('購物')) return 'bag-handle-outline';
  if (t.includes('宵夜') || t.includes('深夜') || t.includes('夜間')) return 'moon-outline';
  if (t.includes('酒') || t.includes('bar') || t.includes('居酒'))    return 'wine-outline';
  if (t.includes('博物') || t.includes('展覽') || t.includes('美術')) return 'business-outline';
  if (t.includes('美食') || t.includes('必吃') || t.includes('小吃') || t.includes('餐') || t.includes('吃')) return 'restaurant-outline';
  return MOOD_ICON_MAP[mood] || 'location-outline';
}
import Masthead from '../../components/Masthead';
import ShakeScreen from './ShakeScreen';
import { apiPost } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const SAVED_TRIPS_KEY = 'vt_saved_trips';

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
  const transit = 10 * (items.length - 1);  // 每站之間 10 分鐘緩衝
  return stay + transit;
}
function fmtDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const Stack = createNativeStackNavigator();

// ── 模組層級快取（跨 tab 切換存活，App 重啟才清除）─────────────────────────────
let _tripCache = null;   // 最後生成的行程（含已算好的真實時間）

// ── 依現在時間重算行程時間欄位 ────────────────────────────────────────────────
function applyCurrentTimes(trip) {
  if (!trip?.items?.length) return trip;
  const now = new Date();
  // 從「現在 + 5 分鐘」捨入至最近 5 分鐘整
  const startMin = Math.ceil((now.getHours() * 60 + now.getMinutes() + 5) / 5) * 5;
  let cursor = startMin;
  return {
    ...trip,
    items: trip.items.map(item => {
      const hh = String(Math.floor(cursor / 60) % 24).padStart(2, '0');
      const mm = String(cursor % 60).padStart(2, '0');
      // "45min" → 45 ; "60min" → 60 ; 其他 fallback 45
      const durMins = parseInt(item.dur) || 45;
      cursor += durMins + 10;   // 景點間 10 分鐘緩衝
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
  const { colors } = useTheme();
  const { isLoggedIn } = useAuth();
  const vibeKey = route?.params?.vibeKey || 'cafe';
  const refreshKey = route?.params?.refreshKey;   // ShakeScreen 回來時帶的時間戳
  const vibeMeta = VIBES.find(v => v.key === vibeKey) || VIBES[0];

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // 生成失敗，顯示重試
  const [excludeIds, setExcludeIds] = useState([]);
  const [saved, setSaved] = useState(false);        // 這趟行程是否已收藏
  const [saving, setSaving] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const loadingIntervalRef = useRef(null);

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
      // AI 行程生成需要較長時間（Google Places + Groq + Directions）→ 給 25 秒
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
      // 不再靜默回退到 mock，改為顯示重試畫面
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── 行程生成邏輯 ───────────────────────────────────────────────────────────
  // deps 用「原始 params」：
  //   - 有 vibeKey/refreshKey → 使用者明確觸發（HomeScreen 選 vibe 或搖一搖）→ 重新 fetch
  //   - 都是 undefined → Tab 按鈕按下（React Navigation 會清空 params）→ 從快取還原
  useEffect(() => {
    const hasExplicit = !!(route?.params?.vibeKey || route?.params?.refreshKey);

    if (!hasExplicit) {
      // Tab 按鈕切回 Trip：params 已被清空
      if (_tripCache) {
        // 快取有上次生成的行程 → 直接還原，不重新 fetch
        setTrip(_tripCache);
        setLoading(false);
        return;
      }
      // 完全沒有快取（App 首次開啟）→ 繼續 fetch 預設行程
    }

    setSaved(false);

    // 搖一搖（有 refreshKey）→ 把上次的 trip id 累加進 exclude，
    // 確保拿到「同 vibe 但不同行程」的新一份（後端非空 exclude 會繞過快取＋避開該 id）
    const isShake = !!route?.params?.refreshKey;
    if (isShake && _tripCache?.id) {
      setExcludeIds(prev => {
        const next = [...prev, _tripCache.id];
        fetchTrip(next);
        return next;
      });
    } else {
      // 從 Home 點 vibe / 首次開啟 → 從零開始
      setExcludeIds([]);
      fetchTrip([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.vibeKey, route?.params?.refreshKey]);

  // ── 收藏 / 取消收藏行程 ────────────────────────────────────────────────────
  const handleSaveTrip = useCallback(async () => {
    if (!trip) return;
    setSaving(true);
    try {
      if (isLoggedIn) {
        // 已登入：存到後端（在目前位置建一個代表 pin）
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
        // 未登入：存到 AsyncStorage
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

  // ── 載入提示輪播 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) {
      setLoadingMsgIdx(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MSGS.length);
      }, 3000);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [loading]);

  // ── 生成失敗：顯示重試畫面 ────────────────────────────────────────────────
  if (loadError) {
    return (
      <View style={[styles.container, styles.loadingCenter, { paddingTop: insets.top, backgroundColor: colors.paper }]}>
        <Masthead tabName="Trip" colors={colors} />
        <View style={styles.loadingBody}>
          <Ionicons name="alert-circle-outline" size={52} color={colors.ink3} style={{ marginBottom: 4 }} />
          <Text style={[styles.loadingTitle, { color: colors.ink }]}>找不到合適行程</Text>
          <Text style={[styles.loadingText, { color: colors.ink2 }]}>
            網路逾時或服務暫時忙碌{'\n'}請稍後再試一次
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.ink }]}
            onPress={() => fetchTrip(excludeIds)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color={colors.paper} />
            <Text style={[styles.retryText, { color: colors.paper }]}>重新探索</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 載入中 ────────────────────────────────────────────────────────────────
  if (loading || !trip) {
    return (
      <View style={[styles.container, styles.loadingCenter, { paddingTop: insets.top, backgroundColor: colors.paper }]}>
        <Masthead tabName="Trip" colors={colors} />
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={[styles.loadingTitle, { color: colors.ink }]}>探索中</Text>
          <Text style={[styles.loadingText, { color: colors.ink2 }]}>
            {LOADING_MSGS[loadingMsgIdx]}
          </Text>
          <Text style={[styles.loadingHint, { color: colors.ink3 }]}>通常約需 5–15 秒</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.paper }]}>
      <Masthead tabName="Trip" colors={colors} />
      {/* Header kicker */}
      <View style={styles.kickerBar}>
        <Text style={[styles.kickerText, { color: colors.ink3 }]}>
          BLIND BOX · {fmtDuration(calcTotalMin(trip.items)).toUpperCase()}
        </Text>
      </View>

      {/* Title block — editorial: NO.247 紅 tag + EN kicker + 標題 + 副標 */}
      <View style={styles.titleBlock}>
        <View style={styles.titleTagRow}>
          <View style={[styles.titleTag, { backgroundColor: colors.cRed }]}>
            <Text style={styles.titleTagText}>{vibeMeta.en.toUpperCase()}</Text>
          </View>
          <Text style={[styles.titleMeta, { color: colors.ink3 }]}>
            {trip.items.length} STOPS · {fmtDuration(calcTotalMin(trip.items)).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.titleH2, { color: colors.ink }]}>{trip.title}</Text>
        {trip.subtitle ? (
          <Text style={[styles.titleSub, { color: colors.ink3 }]}>{trip.subtitle}</Text>
        ) : null}
      </View>

      {/* Timeline — 跳色編號編輯式 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(() => {
          const POP_COLORS = [colors.cRed, colors.cYellow, colors.cBlue, colors.cGreen, colors.cCyan, colors.cPink];
          return trip.items.map((item, i) => (
            <TimelineCard
              key={i}
              item={item}
              index={i}
              popColor={POP_COLORS[i % POP_COLORS.length]}
              colors={colors}
              last={i === trip.items.length - 1}
            />
          ));
        })()}
        <View style={styles.endNote}>
          <Text style={[styles.endNoteText, { color: colors.ink3 }]}>— END · 回家的路自己決定 —</Text>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom - 30, backgroundColor: colors.paper, borderTopColor: colors.line }]}>
        {/* 搖一搖 */}
        <TouchableOpacity
          style={[styles.btnIcon, { backgroundColor: colors.paper2, borderColor: colors.line }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Shake', { vibeKey })}
        >
          <ShakeIcon color={colors.ink2} />
        </TouchableOpacity>

        {/* 收藏行程 */}
        <TouchableOpacity
          style={[styles.btnIcon, {
            backgroundColor: saved ? colors.ink : colors.paper2,
            borderColor: saved ? colors.ink : colors.line,
          }]}
          activeOpacity={0.7}
          onPress={saved || saving ? undefined : handleSaveTrip}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.ink2} />
            : <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={saved ? colors.paper : colors.ink2}
              />
          }
        </TouchableOpacity>

        {/* AR 導航 — vibe 色 pill + iOS 黑色硬陰影 + 微歪 */}
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            {
              backgroundColor: (() => {
                const POP = [colors.cRed, colors.cYellow, colors.cBlue, colors.cGreen, colors.cCyan, colors.cPink, colors.ink];
                const i = VIBES.findIndex(v => v.key === vibeKey);
                return POP[(i >= 0 ? i : 0) % POP.length];
              })(),
              shadowColor: colors.ink,
              shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
              transform: [{ rotate: '-0.4deg' }],
            },
          ]}
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
          <Text style={[styles.btnPrimaryText, { color: colors.paper }]}>開始導覽</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.paper} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimelineCard({ item, index, popColor, colors, last }) {
  const C = colors ?? T;
  return (
    <View style={[
      styles.tlRow,
      { borderTopColor: C.line, borderTopWidth: index === 0 ? 0 : 1 },
    ]}>
      {/* 左：大跳色編號 + time + dur */}
      <View style={styles.tlLeft}>
        <Text style={[styles.tlNum, { color: popColor }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <Text style={[styles.tlTime, { color: C.ink3 }]}>{item.time}</Text>
        <Text style={[styles.tlDur,  { color: C.ink4 }]}>{item.dur}</Text>
      </View>

      {/* 右：活動 + 描述 + 跳色 tag + 距離 */}
      <View style={styles.tlRight}>
        <Text style={[styles.tlActivity, { color: C.ink }]}>{item.activity}</Text>
        <Text style={[styles.tlDesc, { color: C.ink2 }]}>{item.desc}</Text>
        <View style={styles.tlFooter}>
          <View style={[styles.tlTag, { backgroundColor: popColor }]}>
            <Text style={styles.tlTagText}>{item.tag}</Text>
          </View>
          <Text style={[styles.tlDist, { color: C.ink3 }]}>→ {item.dist}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  loadingCenter: { flex: 1 },
  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: T.ink },
  loadingText: { fontSize: 13, color: T.ink2, textAlign: 'center', lineHeight: 20 },
  loadingHint: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, textAlign: 'center', letterSpacing: 1, marginTop: 2 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 28,
    borderRadius: 100, backgroundColor: T.ink,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: T.paper },

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

  // ── Header kicker — BLIND BOX · 3H ───────────────────────────────────
  kickerBar: {
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2,
    alignItems: 'center',
  },
  kickerText: {
    fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 4,
  },

  // ── 新版 Title block — 編輯感（EN 紅 tag + STOPS meta + 大標 + 副標）─────
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  titleTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  titleTag:    { paddingHorizontal: 7, paddingVertical: 2 },
  titleTagText:{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  titleMeta:   { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, letterSpacing: 1 },
  titleH2:     { fontSize: 22, fontWeight: '700', color: T.ink, lineHeight: 30, letterSpacing: -0.2 },
  titleSub:    { fontSize: 12, color: T.ink3, marginTop: 4, lineHeight: 20 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 4 },

  // ── 新版 Timeline 編輯式列 ─────────────────────────────────────────────
  tlRow: { flexDirection: 'row', gap: 14, paddingVertical: 16 },
  tlLeft: { width: 50, flexShrink: 0 },
  tlNum:  { fontFamily: Fonts.latinMed, fontSize: 30, fontWeight: '700', letterSpacing: -1, lineHeight: 30 },
  tlTime: { fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, marginTop: 8 },
  tlDur:  { fontFamily: Fonts.mono, fontSize: 9,  letterSpacing: 1, marginTop: 2 },
  tlRight:    { flex: 1, minWidth: 0, paddingTop: 2 },
  tlActivity: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  tlDesc:     { fontSize: 12, lineHeight: 19, marginTop: 4 },
  tlFooter:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tlTag:      { paddingHorizontal: 7, paddingVertical: 2 },
  tlTagText:  { color: '#fff', fontSize: 10, fontWeight: '600' },
  tlDist:     { fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.5 },

  endNote: {
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: T.line, borderStyle: 'dashed',
  },
  endNoteText: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, letterSpacing: 2.5 },

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
  btnIcon: {
    width: 48, height: 48,
    borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.paper2,
    borderWidth: 1,
    borderColor: T.line,
  },
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
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: T.paper, letterSpacing: 1, includeFontPadding: false },
});
