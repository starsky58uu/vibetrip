import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Image,
  Dimensions, Animated, Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Fonts } from '../../constants/theme';
import useWeather, { owmIconToKind } from '../../hooks/useWeather';
import { useAuth } from '../../context/AuthContext';
import { useDim, usePAL } from '../../context/DimContext';
import { apiGet } from '../../services/apiClient';

const { width: SW, height: SH } = Dimensions.get('window');

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};
const BORDER  = 0;
const PILL_R  = 999;
const HARD_SH = {};  // 無黑色硬陰影

// 未登入時顯示的預設動物（food vibe = vibe3）
const DEFAULT_AVATAR = require('../../../assets/vibe3.png');

const YELLOW_H   = Math.round(SH * 0.33);   // 波浪/藍色起點（黃:藍 = 1:2）
const AVATAR_CY  = Math.round(SH * 0.18);   // 頭像圓心（黃色 1/3 的中央）
const AVATAR_SZ  = 130;                     // 頭像直徑

// 波浪背景（與 HomeScreen 同款）
function WaveProfile({ h }) {
  const offset = 100;
  const totalH = h + offset;
  const white = `M 0,90 C ${SW*0.4},60 ${SW*0.7},180 ${SW},70 L ${SW},${totalH} L 0,${totalH} Z`;
  const blue  = `M 0,150 C ${SW*0.4},80 ${SW*0.7},220 ${SW},140 L ${SW},${totalH} L 0,${totalH} Z`;
  return (
    <Svg width={SW} height={totalH} style={[StyleSheet.absoluteFillObject, { top: -offset }]}>
      <Path d={white} fill={PAL.white} />
      <Path d={blue}  fill={PAL.blue}  />
    </Svg>
  );
}

const Stack = createNativeStackNavigator();

export default function ProfileScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain"  component={ProfileMain} />
      <Stack.Screen name="Weather"      component={WeatherScreen} />
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="Register"     component={RegisterScreen} />
      <Stack.Screen name="MyCapsules"   component={MyCapsulesScreen} />
      <Stack.Screen name="SavedSpots"   component={SavedSpotsScreen} />
    </Stack.Navigator>
  );
}

// ─── Profile Main ─────────────────────────────────────────────────────────────

// ── 進場 stagger 動畫（選單膠囊一條接一條浮入）─────────────────────────────
function StaggerItem({ index, children, style }) {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 380,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function ProfileMain({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();
  const { dim, toggleDim } = useDim();
  const C = usePAL();

  const [stats, setStats]   = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);

  const joinDays   = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : null;
  const displayName = user?.display_name || user?.username || '旅人';
  const handle      = user ? `@${user.username}` : '未登入';

  // 讀取本機儲存的頭像
  useEffect(() => {
    AsyncStorage.getItem('vt_avatar_uri').then(uri => { if (uri) setAvatarUri(uri); });
  }, []);

  // 載入統計
  useEffect(() => {
    if (!isLoggedIn) { setStats(null); return; }
    apiGet('/api/v1/users/me/stats').then(setStats).catch(() => {});
  }, [isLoggedIn]);

  // 換頭像（登入後才可用）
  const pickAvatar = async () => {
    if (!isLoggedIn) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem('vt_avatar_uri', uri);
    }
  };

  const menuItems = [
    { label: '我的膠囊', icon: 'camera-outline',   badge: isLoggedIn ? (stats?.spots_count ?? '…') : '—', onPress: isLoggedIn ? () => navigation.navigate('MyCapsules') : () => navigation.navigate('Login') },
    { label: '收藏地標', icon: 'bookmark-outline',  badge: isLoggedIn ? (stats?.saved_count  ?? '…') : '—', onPress: isLoggedIn ? () => navigation.navigate('SavedSpots') : () => navigation.navigate('Login') },
    { label: '天氣',     icon: 'partly-sunny-outline', badge: '→', onPress: () => navigation.navigate('Weather') },
    {
      label: '低明度模式',
      icon: dim ? 'moon' : 'moon-outline',
      badge: dim ? 'ON' : 'OFF',
      onPress: toggleDim,
    },
    { label: '帳號',     icon: 'person-outline',    badge: '→', onPress: () => navigation.navigate('Login') },
  ];

  const AVATAR_TOP  = AVATAR_CY - AVATAR_SZ / 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.blue }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* 黃色滿版底色佔位 */}
        <View style={{ height: YELLOW_H, backgroundColor: C.yellow }} />

        {/* 波浪 SVG */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: YELLOW_H - 120, height: 240, zIndex: 1 }}
        >
          <Svg width={SW} height={240}>
            <Path d={`M 0,75 C ${SW*0.35},38 ${SW*0.65},158 ${SW},58 L ${SW},240 L 0,240 Z`} fill={C.white} />
            <Path d={`M 0,122 C ${SW*0.35},85 ${SW*0.65},198 ${SW},108 L ${SW},240 L 0,240 Z`} fill={C.blue} />
          </Svg>
        </View>

        {/* 頭像 */}
        <TouchableOpacity
          style={[ps.avatarOuter, { top: AVATAR_TOP, zIndex: 20 }]}
          onPress={pickAvatar}
          activeOpacity={isLoggedIn ? 0.85 : 1}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={ps.avatarImg} />
          ) : (
            <Image source={DEFAULT_AVATAR} style={ps.avatarImg} resizeMode="contain" />
          )}
          {isLoggedIn && (
            <View style={ps.cameraIcon}>
              <Ionicons name="camera" size={14} color={PAL.white} />
            </View>
          )}
        </TouchableOpacity>

        {/* 內容區 */}
        <View style={{
          paddingTop: 40,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 90,
          zIndex: 2,
        }}>
          <View style={ps.nameBlock}>
            <Text style={ps.displayName}>{displayName}</Text>
            <Text style={ps.handle}>{handle}{joinDays != null ? `  ·  DAY ${String(joinDays).padStart(3,'0')}` : ''}</Text>
          </View>

          {isLoggedIn && (
            <View style={ps.statsRow}>
              {[
                { v: stats?.spots_count ?? '…', l: '足跡' },
                { v: stats?.saved_count  ?? '…', l: '收藏' },
                { v: joinDays ?? '…',            l: '天數' },
              ].map((x, i) => (
                <View key={i} style={[ps.statPill, { backgroundColor: i===0 ? C.pink : i===1 ? C.white : C.yellow }]}>
                  <Text style={[ps.statVal, { color: C.black }]}>{x.v}</Text>
                  <Text style={[ps.statLab, { color: C.black }]}>{x.l}</Text>
                </View>
              ))}
            </View>
          )}

          {!isLoggedIn && (
            <TouchableOpacity
              style={[ps.loginPill, { backgroundColor: C.pink }]}
              onPress={() => navigation.navigate('Login')} activeOpacity={0.85}
            >
              <Text style={[ps.loginPillTxt, { color: C.black }]}>登入帳號 →</Text>
            </TouchableOpacity>
          )}

          <View style={ps.menuList}>
            {menuItems.map((item, i) => {
              const BG  = [C.white, C.pink, C.yellow, C.blue, C.white][i % 5];
              const ink = BG === C.blue ? C.white : C.black;
              const sdw = BG === C.yellow ? C.blue : BG === C.white ? C.pink : C.black;
              return (
                <StaggerItem key={i} index={i} style={ps.menuRowWrap}>
                  <View style={[ps.menuRowShadow, { backgroundColor: sdw }]} />
                  <TouchableOpacity
                    style={[ps.menuRow, { backgroundColor: BG }]}
                    onPress={item.onPress} activeOpacity={0.85}
                  >
                    <Ionicons name={item.icon} size={22} color={ink} />
                    <Text style={[ps.menuRowLabel, { color: ink }]}>{item.label}</Text>
                    <Text style={[ps.menuRowBadge, { color: ink, opacity: 0.55 }]}>{item.badge}</Text>
                    <Ionicons name="chevron-forward" size={16} color={ink} style={{ opacity: 0.4 }} />
                  </TouchableOpacity>
                </StaggerItem>
              );
            })}
          </View>

          <Text style={ps.footer}>VibeTrip</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── 子畫面共用 Header ────────────────────────────────────────────────────────
function SubHeader({ navigation, title, colors }) {
  const insets = useSafeAreaInsets();
  const bg = colors?.yellow ?? PAL.yellow;
  return (
    <View style={[subStyles.header, { paddingTop: insets.top + 10, backgroundColor: bg }]}>
      <TouchableOpacity
        style={subStyles.backRow}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={PAL.black} />
        <Text style={subStyles.backTxt}>返回</Text>
      </TouchableOpacity>
      <Text style={subStyles.title}>{title}</Text>
      <View style={{ width: 56 }} />
    </View>
  );
}

const subStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: PAL.yellow,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 56 },
  backTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.black },
  title:   { fontFamily: Fonts.sansBlack, fontSize: 16, color: PAL.black, letterSpacing: 1 },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyText: { fontFamily: Fonts.sansBlack, fontSize: 16, color: PAL.black, marginTop: 8 },
  emptyHint: { fontFamily: Fonts.sansMed,   fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center' },

  // 卡片
  card: {
    backgroundColor: PAL.white,
    borderRadius: 22,
    overflow: 'hidden',
    marginHorizontal: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 2,
  },
  cardImage:   { width: '100%', height: 180, resizeMode: 'cover' },
  imgPlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: PAL.yellow, gap: 6 },
  imgPlaceholderTxt: { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.55)', letterSpacing: 1 },
  cardBody:    { padding: 16 },
  cardNote:    { fontFamily: Fonts.sansMed, fontSize: 14, color: PAL.black, lineHeight: 22, marginBottom: 10 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaTxt: { fontFamily: Fonts.sansMed, fontSize: 10, color: 'rgba(0,0,0,0.5)' },

  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: PAL.pink, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontFamily: Fonts.sansBlack, fontSize: 14, color: PAL.white },
  authorName:  { fontFamily: Fonts.sansBlack, fontSize: 13, color: PAL.black },
  authorTime:  { fontFamily: Fonts.sansMed, fontSize: 10, color: 'rgba(0,0,0,0.5)', marginTop: 1 },
});

// ─── My Capsules Screen ───────────────────────────────────────────────────────
function MyCapsulesScreen({ navigation }) {
  const C = usePAL();
  const [spots, setSpots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/v1/spots/personal')
      .then(setSpots)
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = useCallback(({ item }) => (
    <View style={subStyles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={subStyles.cardImage} />
      ) : (
        <View style={subStyles.imgPlaceholder}>
          <Ionicons name="camera-outline" size={28} color={PAL.black} />
          <Text style={subStyles.imgPlaceholderTxt}>無照片</Text>
        </View>
      )}
      <View style={subStyles.cardBody}>
        <Text style={subStyles.cardNote} numberOfLines={4}>
          {item.note || '（無備註）'}
        </Text>
        <View style={subStyles.cardMeta}>
          <Ionicons name={item.is_public ? 'earth-outline' : 'lock-closed-outline'} size={12} color="rgba(0,0,0,0.5)" />
          <Text style={subStyles.cardMetaTxt}>
            {item.is_public ? '已公開' : '私人'} · {new Date(item.created_at).toLocaleDateString('zh-TW')}
          </Text>
        </View>
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.yellow }}>
      <SubHeader navigation={navigation} title="我的膠囊" colors={C} />

      {loading ? (
        <View style={subStyles.center}>
          <ActivityIndicator size="large" color={PAL.blue} />
        </View>
      ) : spots.length === 0 ? (
        <View style={subStyles.center}>
          <Ionicons name="camera-outline" size={48} color="rgba(0,0,0,0.3)" />
          <Text style={subStyles.emptyText}>還沒有足跡膠囊</Text>
          <Text style={subStyles.emptyHint}>到地圖長按新增你的第一個足跡</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Saved Spots Screen ───────────────────────────────────────────────────────
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '剛剛';
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  return d === 1 ? '昨天' : `${d} 天前`;
}

function SavedSpotsScreen({ navigation }) {
  const C = usePAL();
  const [spots, setSpots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/v1/spots/saved')
      .then(setSpots)
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = useCallback(({ item }) => {
    const author = item.author;
    return (
      <View style={subStyles.card}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={subStyles.cardImage} />
        ) : null}
        <View style={subStyles.cardBody}>
          <View style={subStyles.authorRow}>
            <View style={subStyles.avatar}>
              <Text style={subStyles.avatarTxt}>
                {(author.display_name || author.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={subStyles.authorName}>{author.display_name || author.username}</Text>
              <Text style={subStyles.authorTime}>@{author.username} · {timeAgo(item.created_at)}</Text>
            </View>
            <Ionicons name="bookmark" size={16} color={PAL.pink} />
          </View>
          <Text style={subStyles.cardNote} numberOfLines={3}>{item.content}</Text>
          <View style={subStyles.cardMeta}>
            <Ionicons name="heart-outline" size={12} color="rgba(0,0,0,0.5)" />
            <Text style={subStyles.cardMetaTxt}>{item.likes_count}</Text>
            <Ionicons name="bookmark-outline" size={12} color="rgba(0,0,0,0.5)" style={{ marginLeft: 10 }} />
            <Text style={subStyles.cardMetaTxt}>{item.saves_count}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: PAL.yellow }}>
      <SubHeader navigation={navigation} title="收藏地標" colors={C} />

      {loading ? (
        <View style={subStyles.center}>
          <ActivityIndicator size="large" color={PAL.blue} />
        </View>
      ) : spots.length === 0 ? (
        <View style={subStyles.center}>
          <Ionicons name="bookmark-outline" size={48} color="rgba(0,0,0,0.3)" />
          <Text style={subStyles.emptyText}>還沒有收藏的地標</Text>
          <Text style={subStyles.emptyHint}>到探索頁點收藏來蒐集喜歡的地方</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Weather Screen ───────────────────────────────────────────────────────────

function formatHour(timeStr, isFirst) {
  if (isFirst) return '現在';
  const d = new Date(timeStr);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function formatDay(dateStr) {
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today)    return '今日';
  if (dateStr === tomorrow) return '明日';
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return days[new Date(dateStr).getDay()];
}

// 天氣動畫圖（與 HomeScreen 同款，僅 sun/rain 兩組）
const WEATHER_FRAMES = {
  sunny:  [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  partly: [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  cloudy: [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  night:  [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  rain:   [require('../../../assets/rain1.png'), require('../../../assets/rain2.png'),
           require('../../../assets/rain3.png'), require('../../../assets/rain4.png')],
};

// 小型動畫天氣圖
function AnimatedWeatherImg({ kind = 'partly', size = 40 }) {
  const [idx, setIdx] = useState(0);
  const frames = WEATHER_FRAMES[kind] || WEATHER_FRAMES.partly;
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % frames.length), 500);
    return () => clearInterval(t);
  }, [frames.length]);
  return <Image source={frames[idx]} style={{ width: size, height: size }} resizeMode="contain" fadeDuration={0} />;
}

function WeatherScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { current, forecast, loading } = useWeather();
  const C = usePAL();

  const dailyRain = useMemo(() => {
    if (!forecast) return {};
    const map = {};
    forecast.hourly.forEach(h => {
      const date = new Date(h.time).toISOString().slice(0, 10);
      if (map[date] === undefined || h.precipitation_prob > map[date]) {
        map[date] = h.precipitation_prob;
      }
    });
    return map;
  }, [forecast]);

  const now       = new Date();
  const dateLabel = now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const heroKind  = current ? owmIconToKind(current.icon) : 'partly';
  const hours     = forecast ? forecast.hourly.slice(0, 8) : [];
  const days      = forecast ? forecast.daily : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.blue }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 黃色 hero 區（佔螢幕約 1/3）*/}
        <View style={[wsx.heroWrap, { backgroundColor: C.yellow, paddingTop: insets.top + 44 }]}>
          <TouchableOpacity
            style={[wsx.backRow, { top: insets.top + 14, left: 16 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={PAL.black} />
            <Text style={wsx.backTxt}>返回</Text>
          </TouchableOpacity>

          {/* 大圖 + 大溫度 */}
          <View style={wsx.heroRow}>
            <AnimatedWeatherImg kind={heroKind} size={140} />
            <View style={{ flex: 1 }}>
              <Text style={[wsx.tempBig, { color: C.black }]}>
                {current ? Math.round(current.temperature) : '--'}
                <Text style={[wsx.tempDeg, { color: C.pink }]}>°</Text>
              </Text>
              <Text style={wsx.locText}>{current?.district ?? '—'}</Text>
            </View>
          </View>

          <Text style={wsx.condText}>
            {current ? `${current.description} · 體感 ${Math.round(current.feels_like)}°` : '—'}
          </Text>
          <Text style={wsx.dateText}>{timeLabel}  ·  {dateLabel}</Text>
        </View>

        {/* 波浪 */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: Math.round(SH * 0.33) - 120, height: 240, zIndex: 1 }}
        >
          <Svg width={SW} height={240}>
            <Path d={`M 0,75 C ${SW*0.35},38 ${SW*0.65},158 ${SW},58 L ${SW},240 L 0,240 Z`} fill={C.white} />
            <Path d={`M 0,122 C ${SW*0.35},85 ${SW*0.65},198 ${SW},108 L ${SW},240 L 0,240 Z`} fill={C.blue} />
          </Svg>
        </View>

        {/* 藍色內容 */}
        <View style={{ paddingHorizontal: 18, paddingTop: 20, gap: 14, zIndex: 2 }}>

          {loading && !current && (
            <ActivityIndicator size="large" color={PAL.white} style={{ marginTop: 60 }} />
          )}

          {current?.greeting && (
            <Text style={wsx.greeting}>「{current.greeting}」</Text>
          )}

          {/* HOURLY 膠囊 */}
          {hours.length > 0 && (
            <View style={[wsx.card, { backgroundColor: C.white }]}>
              <Text style={wsx.cardLabel}>逐時預報</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={wsx.hourlyRow}>
                  {hours.map((h, i) => (
                    <View key={i} style={wsx.hourItem}>
                      <Text style={wsx.hourTime}>{formatHour(h.time, i === 0)}</Text>
                      <AnimatedWeatherImg kind={owmIconToKind(h.icon)} size={36} />
                      <Text style={wsx.hourTemp}>{Math.round(h.temperature)}°</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* DAILY 膠囊 */}
          {days.length > 0 && (
            <View style={[wsx.card, { backgroundColor: C.pink }]}>
              <Text style={[wsx.cardLabel, { color: PAL.white }]}>{days.length} 天預報</Text>
              {days.map((d, i) => {
                const rainPct = Math.round((dailyRain[d.date] ?? 0) * 100);
                return (
                  <View key={i} style={wsx.dayRow}>
                    <Text style={[wsx.dayName, { color: PAL.white }]}>{formatDay(d.date)}</Text>
                    <AnimatedWeatherImg kind={owmIconToKind(d.icon)} size={28} />
                    <View style={wsx.dayRainBox}>
                      <Ionicons name="water" size={11} color={PAL.white} />
                      <Text style={[wsx.dayRain, { color: PAL.white }]}>{rainPct}%</Text>
                    </View>
                    <Text style={[wsx.dayLow, { color: 'rgba(255,255,255,0.7)' }]}>{Math.round(d.temp_min)}°</Text>
                    <View style={[wsx.dayBar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <View style={[wsx.dayBarFill, {
                        backgroundColor: PAL.white,
                        left: `${Math.max(0, (d.temp_min - 15) * 8)}%`,
                        width: `${Math.min(100, (d.temp_max - d.temp_min) * 8)}%`,
                      }]} />
                    </View>
                    <Text style={[wsx.dayHigh, { color: PAL.white }]}>{Math.round(d.temp_max)}°</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* 詳細 2x2 grid */}
          {current && (
            <View style={wsx.detailGrid}>
              {[
                { l: '濕度', v: current.humidity,              u: '%',   bg: C.yellow },
                { l: '風速', v: current.wind_speed.toFixed(1), u: 'm/s', bg: C.white },
                { l: '氣壓', v: current.pressure,              u: 'hPa', bg: C.white },
                { l: '體感', v: Math.round(current.feels_like),u: '°',   bg: C.yellow },
              ].map((x, i) => (
                <View key={i} style={[wsx.detailCard, { backgroundColor: x.bg }]}>
                  <Text style={wsx.detailLab}>{x.l}</Text>
                  <View style={wsx.detailValRow}>
                    <Text style={wsx.detailVal}>{x.v}</Text>
                    <Text style={wsx.detailUnit}>{x.u}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={wsx.credit}>— Powered by OpenWeatherMap —</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// WeatherScreen 樣式
const wsx = StyleSheet.create({
  heroWrap: { backgroundColor: PAL.yellow, paddingHorizontal: 24, paddingBottom: 40 },
  backRow:  { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 2, zIndex: 30 },
  backTxt:  { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.black },

  heroRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tempBig:  { fontFamily: Fonts.sansBlack, fontSize: 76, color: PAL.black, letterSpacing: -3, lineHeight: 82 },
  tempDeg:  { fontFamily: Fonts.sansBlack, fontSize: 48, color: PAL.pink },
  locText:  { fontFamily: Fonts.sansBold, fontSize: 16, color: PAL.black, marginTop: -4, letterSpacing: 1 },
  condText: { fontFamily: Fonts.sansMed,  fontSize: 14, color: 'rgba(0,0,0,0.7)' },
  dateText: { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.5)', letterSpacing: 2, marginTop: 4 },

  greeting: { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.white, textAlign: 'center', lineHeight: 22, marginBottom: 6 },

  // 卡片膠囊
  card:      { borderRadius: 24, padding: 16 },
  cardLabel: { fontFamily: Fonts.sansBlack, fontSize: 11, color: PAL.black, letterSpacing: 2, marginBottom: 10 },

  // 逐時
  hourlyRow: { flexDirection: 'row', gap: 18 },
  hourItem:  { alignItems: 'center', minWidth: 50, gap: 4 },
  hourTime:  { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.6)' },
  hourTemp:  { fontFamily: Fonts.sansBlack, fontSize: 15, color: PAL.black },

  // 多日
  dayRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dayName:  { fontFamily: Fonts.sansBold, fontSize: 13, color: PAL.black, width: 42 },
  dayRainBox:{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 46 },
  dayRain:  { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.65)' },
  dayLow:   { fontFamily: Fonts.sansBold, fontSize: 13, color: 'rgba(0,0,0,0.55)' },
  dayBar:   { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  dayBarFill:{ position: 'absolute', top: 0, bottom: 0, backgroundColor: PAL.blue, borderRadius: 4 },
  dayHigh:  { fontFamily: Fonts.sansBlack, fontSize: 13, color: PAL.black, width: 28, textAlign: 'right' },

  // 詳細 grid
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCard: { width: '47%', flexGrow: 1, borderRadius: 22, padding: 16, gap: 4 },
  detailLab:  { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.55)', letterSpacing: 1.5 },
  detailValRow:{ flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  detailVal:  { fontFamily: Fonts.sansBlack, fontSize: 26, color: PAL.black },
  detailUnit: { fontFamily: Fonts.sansBold, fontSize: 11, color: 'rgba(0,0,0,0.55)' },

  credit:   { fontFamily: Fonts.sansBold, fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12, letterSpacing: 2 },
});

// ─── Login Screen ─────────────────────────────────────────────────────────────
// 黃:藍 = 1:2 → 波浪在 1/3 處；頭像中心在黃色中央
const LOGIN_AVATAR_CY = Math.round(SH * 0.18);   // 頭像圓心（黃色 1/3 的中央）
const LOGIN_WAVE_Y    = Math.round(SH * 0.33);   // 藍色起點（黃色佔 1/3）

// 膠囊輸入框
function InputPill({ label, ...props }) {
  const C = usePAL();
  return (
    <View style={lss.inputWrap}>
      <View style={[lss.pillShadow, { backgroundColor: C.blue }]} />
      <View style={[lss.inputPill, { backgroundColor: C.white }]}>
        <Text style={[lss.inputLabel, { color: C.black }]}>{label}</Text>
        <View style={lss.inputDivider} />
        <TextInput
          style={[lss.inputField, { color: C.black }]}
          placeholderTextColor="rgba(0,0,0,0.28)"
          {...props}
        />
      </View>
    </View>
  );
}

// ── 共用背景 wrapper（ScrollView 內：黃色佔位 + 波浪 + 返回鍵 + 頭像）────────────
function AuthBg({ navigation, insets, children, avatarUri, onPickAvatar, showCamera }) {
  const C          = usePAL();
  const BLUE_TOP   = LOGIN_WAVE_Y;
  const AVATAR_TOP = LOGIN_AVATAR_CY - AVATAR_SZ / 2;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.blue }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 黃色區佔位 */}
        <View style={{ height: BLUE_TOP, backgroundColor: C.yellow }} />

        {/* 波浪：藍色 path 從 y=122 對應 BLUE_TOP */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: BLUE_TOP - 120, height: 240, zIndex: 1 }}
        >
          <Svg width={SW} height={240}>
            <Path d={`M 0,75 C ${SW*0.35},38 ${SW*0.65},158 ${SW},58 L ${SW},240 L 0,240 Z`} fill={C.white} />
            <Path d={`M 0,122 C ${SW*0.35},85 ${SW*0.65},198 ${SW},108 L ${SW},240 L 0,240 Z`} fill={C.blue} />
          </Svg>
        </View>

        {/* 返回按鈕 */}
        <TouchableOpacity
          style={[lss.backRow, { position: 'absolute', top: insets.top + 10, left: 16, zIndex: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={18} color={PAL.black} />
          <Text style={lss.backTxt}>返回</Text>
        </TouchableOpacity>

        {/* 頭像 */}
        <TouchableOpacity
          style={[lss.avatarCircle, { top: AVATAR_TOP, zIndex: 20 }]}
          onPress={showCamera ? onPickAvatar : undefined}
          activeOpacity={showCamera ? 0.85 : 1}
        >
          {avatarUri
            ? <Image source={{ uri: avatarUri }} style={lss.avatarImg} />
            : <Image source={DEFAULT_AVATAR} style={lss.avatarImg} resizeMode="contain" />
          }
          {showCamera && (
            <View style={lss.cameraIcon}>
              <Ionicons name="camera" size={12} color={PAL.white} />
            </View>
          )}
        </TouchableOpacity>

        {/* 頁面內容 */}
        <View style={{ paddingTop: 40, paddingHorizontal: 20, paddingBottom: insets.bottom + 60, zIndex: 2 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── LoginScreen（只登入）────────────────────────────────────────────────────
function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, isLoggedIn, user, logout } = useAuth();
  const C = usePAL();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('vt_avatar_uri').then(uri => { if (uri) setAvatarUri(uri); });
  }, []);

  const pickAvatar = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.85 });
    if (!r.canceled) {
      const uri = r.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem('vt_avatar_uri', uri);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!username || !password) { setError('請填寫帳號與密碼'); return; }
    setLoading(true);
    try {
      await login(username, password);
      navigation.goBack();
    } catch {
      setError('帳號或密碼錯誤');
    } finally { setLoading(false); }
  };

  // 已登入 → 顯示帳號資訊
  if (isLoggedIn) {
    return (
      <AuthBg navigation={navigation} insets={insets} avatarUri={avatarUri} onPickAvatar={pickAvatar} showCamera>
        <Text style={lss.logName}>{user?.display_name || user?.username}</Text>
        <Text style={lss.logHandle}>@{user?.username}</Text>
        <View style={[lss.btnWrap, { marginTop: 8 }]}>
          <View style={[lss.pillShadow, { backgroundColor: C.pink }]} />
          <TouchableOpacity style={[lss.actionPill, { backgroundColor: C.white }]} onPress={logout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color={C.black} />
            <Text style={[lss.actionTxt, { color: C.black }]}>登出</Text>
          </TouchableOpacity>
        </View>
      </AuthBg>
    );
  }

  return (
    <AuthBg navigation={navigation} insets={insets} avatarUri={avatarUri} showCamera={false}>
      {/* 標題 */}
      <Text style={lss.authTitle}>歡迎回來</Text>

      {/* 輸入膠囊 */}
      <InputPill label="帳號" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" />
      <InputPill label="密碼" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      {!!error && <View style={lss.errorPill}><Text style={lss.errorTxt}>{error}</Text></View>}

      {/* 登入按鈕 */}
      <View style={lss.btnWrap}>
        <View style={[lss.pillShadow, { backgroundColor: C.pink }]} />
        <TouchableOpacity
          style={[lss.actionPill, { backgroundColor: C.blue, opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin} disabled={loading} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={C.white} /> : <Text style={[lss.actionTxt, { color: C.white }]}>登入 →</Text>}
        </TouchableOpacity>
      </View>

      {/* 去註冊 */}
      <TouchableOpacity style={lss.switchRow} onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
        <Text style={lss.switchTxt}>還沒有帳號？</Text>
        <Text style={[lss.switchTxt, { color: C.yellow, fontFamily: Fonts.sansBlack }]}>立即註冊</Text>
      </TouchableOpacity>

      {/* 訪客模式 */}
      <View style={lss.btnWrap}>
        <View style={[lss.pillShadow, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        <TouchableOpacity
          style={[lss.actionPill, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)' }]}
          onPress={() => navigation.goBack()} activeOpacity={0.85}
        >
          <Text style={[lss.actionTxt, { color: 'rgba(255,255,255,0.75)' }]}>訪客模式（不登入）</Text>
        </TouchableOpacity>
      </View>
    </AuthBg>
  );
}

// ─── RegisterScreen（只註冊）────────────────────────────────────────────────
function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const C = usePAL();

  const [dispName, setDispName] = useState('');
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!username || !password) { setError('請填寫帳號與密碼'); return; }
    if (!email)                 { setError('請填寫 Email'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('帳號只能使用英文、數字、底線'); return; }
    if (username.length < 3)    { setError('帳號至少 3 個字元'); return; }
    if (password.length < 8)    { setError('密碼至少 8 個字元'); return; }
    setLoading(true);
    try {
      await register(username, email, password, dispName);
      navigation.goBack();
    } catch (e) {
      if (e.status === 409) {
        setError('此帳號或 Email 已被使用');
      } else if (e.status === 422 && e.detail?.detail) {
        const msgs = (Array.isArray(e.detail.detail) ? e.detail.detail : []).map(i => {
          const f = i.loc?.[i.loc.length - 1] ?? '';
          if (f === 'username') return '帳號格式有誤（3–32 字元）';
          if (f === 'password') return '密碼至少 8 個字元';
          if (f === 'email')    return 'Email 格式不正確';
          return i.msg ?? '輸入格式有誤';
        });
        setError(msgs.join('\n') || '輸入格式有誤');
      } else {
        setError('註冊失敗，請稍後再試');
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthBg navigation={navigation} insets={insets} avatarUri={null} showCamera={false}>
      {/* 標題 */}
      <Text style={lss.authTitle}>建立帳號</Text>

      {/* 輸入膠囊 */}
      <InputPill label="暱稱"  value={dispName} onChangeText={setDispName} placeholder="你的漫遊代號（選填）" />
      <InputPill label="Email" value={email}    onChangeText={setEmail}    placeholder="hello@vibetrip.app" autoCapitalize="none" keyboardType="email-address" />
      <InputPill label="帳號"  value={username} onChangeText={setUsername} placeholder="username（英文數字底線）" autoCapitalize="none" />
      <InputPill label="密碼"  value={password} onChangeText={setPassword} placeholder="至少 8 個字元" secureTextEntry />

      {!!error && <View style={lss.errorPill}><Text style={lss.errorTxt}>{error}</Text></View>}

      {/* 建立帳號按鈕 */}
      <View style={lss.btnWrap}>
        <View style={[lss.pillShadow, { backgroundColor: C.pink }]} />
        <TouchableOpacity
          style={[lss.actionPill, { backgroundColor: C.blue, opacity: loading ? 0.7 : 1 }]}
          onPress={handleRegister} disabled={loading} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={C.white} /> : <Text style={[lss.actionTxt, { color: C.white }]}>建立帳號 →</Text>}
        </TouchableOpacity>
      </View>

      {/* 去登入 */}
      <TouchableOpacity style={lss.switchRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Text style={lss.switchTxt}>已有帳號？</Text>
        <Text style={[lss.switchTxt, { color: C.yellow, fontFamily: Fonts.sansBlack }]}>返回登入</Text>
      </TouchableOpacity>
    </AuthBg>
  );
}

// ─── ProfileMain 固定樣式（不依賴 theme）────────────────────────────────────
const ps = StyleSheet.create({
  blueSection: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: PAL.blue,
  },

  // 頭像
  avatarOuter: {
    position: 'absolute',
    alignSelf: 'center',
    width: AVATAR_SZ,
    height: AVATAR_SZ,
    borderRadius: AVATAR_SZ / 2,
    backgroundColor: PAL.white,
    borderWidth: BORDER,
    borderColor: PAL.black,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...HARD_SH,
  },
  avatarImg: {
    width: AVATAR_SZ - 8,
    height: AVATAR_SZ - 8,
    borderRadius: (AVATAR_SZ - 8) / 2,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PAL.blue,
    borderWidth: 2, borderColor: PAL.white,
    alignItems: 'center', justifyContent: 'center',
  },

  // 名字區
  nameBlock: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  displayName: { fontFamily: Fonts.sansBlack, fontSize: 22, color: PAL.white, letterSpacing: 0.5 },
  handle:      { fontFamily: Fonts.sansMed,   fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 1 },

  // 統計 pills
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'center',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: PILL_R,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SH,
  },
  statVal: { fontFamily: Fonts.sansBlack, fontSize: 22, letterSpacing: -0.5 },
  statLab: { fontFamily: Fonts.sansMed,   fontSize: 10, marginTop: 2, letterSpacing: 1 },

  // 未登入 CTA
  loginPill: {
    alignSelf: 'center',
    paddingVertical: 13,
    paddingHorizontal: 36,
    backgroundColor: PAL.pink,
    borderRadius: PILL_R,
    borderWidth: BORDER,
    borderColor: PAL.black,
    marginBottom: 20,
    ...HARD_SH,
  },
  loginPillTxt: { fontFamily: Fonts.sansBlack, fontSize: 15, color: PAL.black, letterSpacing: 1 },

  // 選單 grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuCellWrap: { width: '46%', flex: 1, position: 'relative' },
  menuCellShadow: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: 20,
    top: 5, left: 5,
  },
  menuCell: {
    borderRadius: 20,
    borderWidth: BORDER,
    borderColor: PAL.black,
    padding: 18,
    gap: 6,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  menuCellLabel: { fontFamily: Fonts.sansBlack, fontSize: 14 },
  menuCellBadge: { fontFamily: Fonts.sansMed,   fontSize: 12 },

  // ── 選單橫膠囊列 ─────────────────────────────────────────────────────
  menuList: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  menuRowWrap: { position: 'relative' },
  menuRowShadow: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: PILL_R, top: 4, left: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: PILL_R,
    borderWidth: BORDER,
    borderColor: PAL.black,
  },
  menuRowLabel: { fontFamily: Fonts.sansBlack, fontSize: 15, flex: 1 },
  menuRowBadge: { fontFamily: Fonts.sansMed, fontSize: 12 },

  footer: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    letterSpacing: 3,
    paddingBottom: 16,
  },
});

// 已移除舊的 makeStyles / makeWsStyles / makeCsStyles（編輯雜誌風）
// 各子畫面樣式現在用獨立的 PAL 卡通配色（ps / wsx / subStyles / lss）

// ─── LoginScreen 固定樣式 ─────────────────────────────────────────────────────
const lss = StyleSheet.create({
  blueSection: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: PAL.blue },

  // 頭像圓
  avatarCircle: {
    position: 'absolute',
    alignSelf: 'center',
    width: AVATAR_SZ, height: AVATAR_SZ,
    borderRadius: AVATAR_SZ / 2,
    backgroundColor: PAL.white,
    borderWidth: BORDER, borderColor: PAL.black,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    ...HARD_SH,
  },
  avatarImg: { width: AVATAR_SZ - 8, height: AVATAR_SZ - 8, borderRadius: (AVATAR_SZ - 8) / 2 },
  cameraIcon: {
    position: 'absolute', bottom: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PAL.blue, borderWidth: 2, borderColor: PAL.white,
    alignItems: 'center', justifyContent: 'center',
  },

  // 返回列
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2, left: 16,
  },
  backTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.black },

  // 登入/註冊 segmented pill
  segWrap: { alignItems: 'center', marginBottom: 16 },
  segPill: {
    flexDirection: 'row',
    backgroundColor: PAL.white,
    borderRadius: PILL_R, borderWidth: BORDER, borderColor: PAL.black,
    padding: 4, ...HARD_SH,
  },
  segBtn:       { paddingVertical: 8, paddingHorizontal: 26, borderRadius: PILL_R },
  segBtnActive: { backgroundColor: PAL.blue },
  segTxt:       { fontFamily: Fonts.sansBold, fontSize: 13, color: PAL.black },
  segTxtActive: { color: PAL.white },

  // 輸入膠囊
  inputWrap: { position: 'relative', marginBottom: 11 },
  pillShadow: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: PILL_R, top: 4, left: 4,
  },
  inputPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PAL.white,
    borderRadius: PILL_R, borderWidth: BORDER, borderColor: PAL.black,
    paddingHorizontal: 20, paddingVertical: 14,
    gap: 12,
  },
  inputLabel:   { fontFamily: Fonts.sansBlack, fontSize: 13, color: PAL.black, width: 38 },
  inputDivider: { width: 1.5, height: 18, backgroundColor: 'rgba(0,0,0,0.15)' },
  inputField:   { flex: 1, fontFamily: Fonts.sansMed, fontSize: 14, color: PAL.black, paddingVertical: 0 },

  // 錯誤
  errorPill: {
    backgroundColor: 'rgba(255,80,80,0.15)',
    borderRadius: PILL_R, borderWidth: 1.5, borderColor: 'rgba(255,80,80,0.4)',
    paddingVertical: 8, paddingHorizontal: 16, marginBottom: 10, alignItems: 'center',
  },
  errorTxt: { fontFamily: Fonts.sansMed, fontSize: 12, color: '#FF5050', textAlign: 'center' },

  // 通用動作膠囊（Submit / Guest / Logout）
  btnWrap:   { position: 'relative', marginBottom: 10 },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
    borderRadius: PILL_R, borderWidth: BORDER, borderColor: PAL.black,
  },
  actionTxt: { fontFamily: Fonts.sansBlack, fontSize: 15, letterSpacing: 0.5 },

  // 已登入
  logName:   { fontFamily: Fonts.sansBlack, fontSize: 22, color: PAL.white, textAlign: 'center', marginBottom: 4 },
  logHandle: { fontFamily: Fonts.sansMed,   fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', letterSpacing: 1, marginBottom: 24 },

  // 頁面標題
  authTitle: {
    fontFamily: Fonts.sansBlack,
    fontSize: 24,
    color: PAL.white,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  // 底部切換連結（登入↔註冊）
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  switchTxt: {
    fontFamily: Fonts.sansMed,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
});