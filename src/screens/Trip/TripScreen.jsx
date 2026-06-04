import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Image, Dimensions, Animated, Easing,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { Fonts } from '../../constants/theme';
import { VIBES } from '../../data/vibeData';
import ShakeScreen from './ShakeScreen';
import { apiPost } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { usePAL } from '../../context/DimContext';

const SAVED_TRIPS_KEY = 'vt_saved_trips';
const { width: SW } = Dimensions.get('window');

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

// ── 載入畫面海浪（橫向流動 + 兩層視差）──────────────────────────────────────
// 真實海浪的關鍵是「波峰會往一個方向移動」，所以做法是：
//   - 路徑寬度 = 2 倍螢幕寬，畫 2 套完整波浪
//   - translateX 從 0 線性移到 -SW，再 loop（無縫接續）
//   - 兩層用不同速度，產生視差「深度感」
const WAVE_H = 220;

// 寬度 2*SW 的波浪 path，包含完整 8 段交替波峰；dir 控制是「上方版」還是「下方版」
// dir='top' → 從螢幕頂端往下填到波浪線（向下凹的波浪）
// dir='bottom' → 從波浪線往下填到 WAVE_H（向上凸的波浪）
function makeWavePath(amp, baseY, dir) {
  const w = SW * 2;
  const segs = 8;
  const step = w / segs;
  let d = `M 0 ${baseY}`;
  for (let i = 0; i < segs; i++) {
    const x2  = step * (i + 1);
    const cpx = step * i + step * 0.5;
    const peak = i % 2 === 0 ? baseY - amp : baseY + amp;
    d += ` Q ${cpx} ${peak}, ${x2} ${baseY}`;
  }
  // 收尾：往對應的邊緣收（不用 scaleY 翻轉，避免動畫衝突）
  if (dir === 'top') {
    d += ` L ${w} 0 L 0 0 Z`;
  } else {
    d += ` L ${w} ${WAVE_H} L 0 ${WAVE_H} Z`;
  }
  return d;
}

// ✅ 元件提到外面 + 路徑做成常數 → 父層重新 render 時不會被重新建立 / 重啟動畫
const TOP_WHITE_PATH = makeWavePath(14, 130, 'top');
const TOP_BLUE_PATH  = makeWavePath(22, 100, 'top');
const BTM_WHITE_PATH = makeWavePath(14, WAVE_H - 130, 'bottom');
const BTM_BLUE_PATH  = makeWavePath(22, WAVE_H - 100, 'bottom');

const Wave = React.memo(function Wave({ anim, path, fill, dir }) {
  return (
    <Animated.View
      style={{
        position: 'absolute', left: 0,
        top:    dir === 'top'    ? 0 : undefined,
        bottom: dir === 'bottom' ? 0 : undefined,
        width: SW * 2, height: WAVE_H,
        transform: [{ translateX: anim }],
      }}
    >
      <Svg width={SW * 2} height={WAVE_H}>
        <Path d={path} fill={fill} />
      </Svg>
    </Animated.View>
  );
});

const LoadingWaves = React.memo(function LoadingWaves({ colors }) {
  const C = colors || PAL;
  const xBlueTop  = useRef(new Animated.Value(0)).current;
  const xWhiteTop = useRef(new Animated.Value(0)).current;
  const xBlueBtm  = useRef(new Animated.Value(0)).current;
  const xWhiteBtm = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const flow = (anim, dur) => Animated.loop(
      Animated.timing(anim, {
        toValue: -SW,
        duration: dur,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const a = flow(xWhiteTop, 6200);
    const b = flow(xBlueTop,  4400);
    const c = flow(xWhiteBtm, 6600);
    const d = flow(xBlueBtm,  4700);
    a.start(); b.start(); c.start(); d.start();
    return () => { a.stop(); b.stop(); c.stop(); d.stop(); };
  }, []);

  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: SW, height: WAVE_H, overflow: 'hidden' }}>
        <Wave anim={xWhiteTop} path={TOP_WHITE_PATH} fill={C.white} dir="top" />
        <Wave anim={xBlueTop}  path={TOP_BLUE_PATH}  fill={C.blue}  dir="top" />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, width: SW, height: WAVE_H, overflow: 'hidden' }}>
        <Wave anim={xWhiteBtm} path={BTM_WHITE_PATH} fill={C.white} dir="bottom" />
        <Wave anim={xBlueBtm}  path={BTM_BLUE_PATH}  fill={C.blue}  dir="bottom" />
      </View>
    </>
  );
});

// ─── 雲狀對話框（與 HomeScreen 同款，給 EmptyTripState 用）──────────────────
function CloudBubble({ size, color }) {
  const cloudPath = `
    M 18,55 Q 8,40 18,28 Q 22,12 38,18 Q 48,2 62,12 Q 78,5 84,22
    Q 98,28 90,42 Q 100,55 88,64 Q 96,80 78,80 Q 70,95 56,84
    Q 40,94 32,80 Q 16,82 18,68 Q 6,62 18,55 Z
  `.replace(/\s+/g, ' ').trim();
  return (
    <Svg width={size} height={size * 1.1} viewBox="-4 -4 108 120">
      <Path d={cloudPath} fill={color} />
      <SvgCircle cx="28" cy="100" r="6" fill={color} />
      <SvgCircle cx="18" cy="110" r="3" fill={color} />
    </Svg>
  );
}

// ─── 還沒選行程的提示畫面：動物 + 對話框「先去選行程吧」+ 回主頁按鈕 ────────
function EmptyTripState({ navigation, insets, frameIdx, colors }) {
  const C = colors;
  // 隨機選一隻動物來歡迎（這裡固定用第 1 隻：cafe 浣熊）
  const frames = VIBE_FRAMES[0];

  // 上下浮動動畫
  const float = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const BUBBLE = 240;
  return (
    <View style={{ flex: 1, backgroundColor: C.yellow, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* 對話框 + 文字 */}
        <View style={{ width: BUBBLE, height: BUBBLE * 1.1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ ...StyleSheet.absoluteFillObject }} pointerEvents="none">
            <CloudBubble size={BUBBLE} color={C.pink} />
          </View>
          {/* 文字加上 18% 比例 padding，確保不被雲弧邊緣切到（雲的「安全區」約 64%）*/}
          <View style={{
            paddingHorizontal: BUBBLE * 0.18,
            alignItems: 'center',
            marginTop: -BUBBLE * 0.05,
          }}>
            <Text style={{
              fontFamily: 'NotoSansTC_900Black', fontSize: 20, color: C.black,
              textAlign: 'center', lineHeight: 30, letterSpacing: 1,
            }}>
              先去主頁{'\n'}選個行程吧！
            </Text>
            <Text style={{
              fontFamily: 'NotoSansTC_500Medium', fontSize: 12, color: C.black,
              opacity: 0.6, textAlign: 'center', marginTop: 10, letterSpacing: 0.5,
            }}>
              我在這裡等你 →
            </Text>
          </View>
        </View>

        {/* 動物（上下浮動）*/}
        <Animated.View style={{ marginTop: 8, transform: [{ translateY: floatY }] }}>
          <Image
            source={frames[frameIdx]}
            style={{ width: 160, height: 160 }}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Animated.View>
      </View>

      {/* 回主頁按鈕 */}
      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom + 100, 110) }}>
        <View style={{ position: 'relative' }}>
          <View style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: 999, top: 6, left: 6, backgroundColor: C.blue,
          }} />
          <TouchableOpacity
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 16, borderRadius: 999, backgroundColor: C.white,
            }}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="home" size={18} color={C.black} />
            <Text style={{
              fontFamily: 'NotoSansTC_900Black', fontSize: 15,
              color: C.black, letterSpacing: 1,
            }}>
              回主頁選 Vibe
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── 行程膠囊進場動畫包裹器（依 index 延遲，串聯飛入感）─────────────────────
function StaggerPill({ index, children, style }) {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay: index * 90,             // 每多一個延 90ms
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ── 可按壓元件：按下時微縮（觸覺回饋）─────────────────────────────────────
function PressBtn({ onPress, children, style, scale = 0.96, disabled }) {
  const s = React.useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(s, { toValue: to, useNativeDriver: true, friction: 5, tension: 200 }).start();
  return (
    <TouchableOpacity
      onPressIn={() => !disabled && press(scale)}
      onPressOut={() => press(1)}
      onPress={disabled ? undefined : onPress}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

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

// ── 膠囊間虛線連接器 ──────────────────────────────────────────────────────────
// fromLeft: 上一個膠囊是否靠左；toLeft: 下一個膠囊是否靠左
function DottedConnector({ fromLeft, toLeft }) {
  const W  = SW - 40;     // 對應 scrollContent 的 paddingHorizontal: 20
  const H  = 28;
  // 起點：fromLeft ? 膠囊右側 (W * 0.7) : 膠囊左側 (W * 0.3)
  const x1 = fromLeft ? W * 0.72 : W * 0.28;
  const x2 = toLeft   ? W * 0.28 : W * 0.72;
  // 用二次貝茲曲線畫弧
  const cx = (x1 + x2) / 2;
  const d  = `M ${x1} 0 Q ${cx} ${H * 1.2}, ${x2} ${H}`;
  return (
    <Svg width={W} height={H} style={{ alignSelf: 'center' }}>
      <Path
        d={d}
        stroke={PAL.white}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray="2,7"
        fill="none"
      />
    </Svg>
  );
}

function TripMain({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const C = usePAL();
  
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
  const [needPickVibe, setNeedPickVibe] = useState(false);   // 尚未選行程：顯示動物提示

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
        // Tab 按鈕進來，有上次的行程 → 直接還原
        setTrip(_tripCache);
        setLoading(false);
        setNeedPickVibe(false);
        return;
      }
      // Tab 按鈕進來但完全沒有快取（首次開啟）→ 不自動 fetch，提示去主頁選 vibe
      setLoading(false);
      setNeedPickVibe(true);
      return;
    }
    // 從 HomeScreen 點 vibe 或搖一搖 → 正常 fetch
    setNeedPickVibe(false);
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.yellow }]}>
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

  // ── 尚未選行程：顯示動物 + 對話框提示 ──────────────────────────────────────
  if (needPickVibe) {
    return (
      <EmptyTripState
        navigation={navigation}
        insets={insets}
        frameIdx={titleFrameIdx}
        colors={C}
      />
    );
  }

  if (loading || !trip) {
    return (
      <View style={{ flex: 1, backgroundColor: C.yellow }}>
        <LoadingWaves colors={C} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image
            source={LOADING_FRAMES[loadingFrame]}
            style={{ width: 240, height: 240 }}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  const totalMin = calcTotalMin(trip.items);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.yellow }]}>

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
        {/* ── 停靠點膠囊（左右交錯，輪流粉/白/藍/白 + 對比色陰影 + 虛線連接）── */}
        {trip.items.map((item, i) => {
          // 顏色輪播：粉(左) → 白(右) → 藍(左) → 白(右) …（用動態色票 C）
          const COLORS = [C.pink, C.white, C.blue, C.white];
          const bg = COLORS[i % COLORS.length];
          const shadow =
            bg === C.pink  ? C.blue :
            bg === C.blue  ? C.pink :
                             C.pink;   // 白色膠囊用粉色陰影
          const isLeft = i % 2 === 0;
          const theme = { bg, shadow, align: isLeft ? 'flex-start' : 'flex-end' };

          const ink = bg === C.blue ? C.white : C.black;
          const sub = ink === C.white ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)';
          // 下一個的方向（決定虛線往哪邊延伸）
          const nextIsLeft = (i + 1) % 2 === 0;

          return (
            <React.Fragment key={i}>
              <StaggerPill index={i} style={[styles.pillWrapper, { alignSelf: theme.align }]}>
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

                <Text style={[styles.stopNum, { color: ink, opacity: ink === C.white ? 0.3 : 0.15 }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </View>
            </StaggerPill>

              {/* 虛線連接器（最後一個不畫）*/}
              {i < trip.items.length - 1 && (
                <DottedConnector fromLeft={isLeft} toLeft={nextIsLeft} />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* ── 底部動作列 ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        <View style={styles.btnWrapper}>
          <View style={[styles.offsetShadow, { backgroundColor: C.blue }]} />
          <TouchableOpacity
            style={[styles.shakePill, { backgroundColor: C.white }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Shake', { vibeKey })}
          >
            <Ionicons name="refresh" size={20} color={C.black} style={{ marginRight: 6 }} />
            <Text style={[styles.shakeText, { color: C.black }]}>換一批</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.btnWrapper, { flex: 1 }]}>
          <View style={[styles.offsetShadow, { backgroundColor: C.pink }]} />
          {/* CTA：開始導覽 — 用 Pressable 加按下縮放回饋 */}
          <PressBtn
            style={[styles.actionPrimary, { backgroundColor: C.blue }]}
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
            <Text style={[styles.actionPrimaryText, { color: C.white }]}>開始導覽</Text>
            <Ionicons name="arrow-forward" size={18} color={C.white} />
          </PressBtn>
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
    gap: 4, // 虛線連接器自帶高度，膠囊間距改小
  },

  /* ── 停靠點膠囊 (實體色塊硬陰影) ── */
  pillWrapper: {
    width: '85%',           // 左右交錯，留出對側空間給陰影/連接線
    position: 'relative',
  },
  pillShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: PILL_RADIUS,
    top: 10,
    left: 10,
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