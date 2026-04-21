import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';

import { T, Fonts } from '../../constants/theme';
import { apiGet, apiPost } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

const TopTab = createMaterialTopTabNavigator();

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle:          styles.topTabBar,
          tabBarLabelStyle:     styles.topTabLabel,
          tabBarIndicatorStyle: styles.topTabIndicator,
          tabBarActiveTintColor:   T.ink,
          tabBarInactiveTintColor: T.ink3,
        }}
      >
        <TopTab.Screen name="Map"       component={MapTab}       options={{ tabBarLabel: '地圖' }} />
        <TopTab.Screen name="Community" component={CommunityTab} options={{ tabBarLabel: '社群' }} />
      </TopTab.Navigator>
    </View>
  );
}

// ─── Map Tab ─────────────────────────────────────────────────────────────────

const SPOTS = [
  { id: 'sp1', x: '22%', y: '28%', label: 'Fika Fika',   tag: '☕', mine: true  },
  { id: 'sp2', x: '52%', y: '42%', label: '四四南村',     tag: '📸', mine: true,  liked: 42 },
  { id: 'sp3', x: '68%', y: '62%', label: 'ICHIGO',      tag: '🍰', mine: true  },
  { id: 'sp4', x: '36%', y: '68%', label: '象山·六巨石',  tag: '🌇', mine: false, liked: 87 },
  { id: 'sp5', x: '78%', y: '22%', label: '松菸後巷',     tag: '🌿', mine: false, liked: 23 },
  { id: 'sp6', x: '15%', y: '55%', label: '光合作用書店', tag: '📖', mine: true  },
  { id: 'sp7', x: '62%', y: '18%', label: '信義豆花',     tag: '🍮', mine: false, liked: 15 },
];

function MapTab() {
  const [selected, setSelected] = useState('sp2');
  const sp = SPOTS.find(s => s.id === selected) || SPOTS[0];

  return (
    <View style={styles.mapContainer}>
      {/* SVG 示意地圖背景 */}
      <Svg
        width="100%" height="100%"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F0E4CB" />
            <Stop offset="1" stopColor="#EDE1C9" />
          </LinearGradient>
        </Defs>
        <Rect width="400" height="700" fill="url(#skyGrad)" />
        <Path d="M-20 540 Q100 510 200 560 Q300 600 420 545 L420 700 L-20 700 Z" fill="#C8D4AA" fillOpacity="0.55" />
        <Path d="M280 40 Q360 60 380 120 L420 130 L420 0 L260 0 Z"              fill="#C8D4AA" fillOpacity="0.45" />
        <Path d="M-20 165 Q100 200 200 180 Q300 165 420 215" stroke="#A9C4D6" strokeWidth="28" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
        <Path d="M0 340 L400 340"   stroke="#FBF7EC" strokeWidth="22" />
        <Path d="M180 0 L220 700"   stroke="#FBF7EC" strokeWidth="18" />
        <Path d="M0 230 L400 265"   stroke="#FBF7EC" strokeWidth="12" />
        <Path d="M0 470 L400 505"   stroke="#FBF7EC" strokeWidth="12" />
        <Path d="M70 0 L90 700"     stroke="#FBF7EC" strokeWidth="10" />
        <Path d="M300 0 L320 700"   stroke="#FBF7EC" strokeWidth="10" />
        <G transform="translate(225, 310)">
          <Rect x="-12" y="-28" width="24" height="34" fill="#B39A76" fillOpacity="0.85" />
          <Rect x="-10" y="-22" width="20" height="5"  fill="#F0E4CB" />
          <Rect x="-10" y="-10" width="20" height="5"  fill="#F0E4CB" />
          <Path d="M-12 -28 L-6 -40 L6 -40 L12 -28 Z"  fill="#8B6F4E" />
        </G>
      </Svg>

      <View style={styles.userDot} pointerEvents="none">
        <View style={styles.userDotInner} />
      </View>

      {SPOTS.map(s => (
        <TouchableOpacity
          key={s.id}
          onPress={() => setSelected(s.id)}
          style={[styles.pin, { left: s.x, top: s.y }]}
          activeOpacity={0.8}
        >
          <View style={[
            styles.pinBody,
            s.mine ? styles.pinMine : styles.pinCommunity,
            selected === s.id && styles.pinActive,
          ]}>
            <Text style={{ fontSize: selected === s.id ? 18 : 13 }}>{s.tag}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.mapSheet}>
        <View style={styles.mapSheetIcon}>
          <Text style={{ fontSize: 26 }}>{sp.tag}</Text>
          {sp.mine && <View style={styles.mineBadge}><Text style={styles.mineBadgeText}>✦</Text></View>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapSheetMeta}>
            {sp.mine ? 'MY CAPSULE · 2 天前' : 'COMMUNITY · 熱門'}
          </Text>
          <Text style={styles.mapSheetName}>{sp.label}</Text>
          <Text style={styles.mapSheetDesc}>
            {sp.mine ? '紅磚牆 + 斜射光，還順手買了杯手沖。' : '隱藏版的好地方 ✨'}
          </Text>
          <View style={styles.mapSheetFooter}>
            {!sp.mine && sp.liked != null && (
              <Text style={styles.mapSheetLike}>♥ {sp.liked}</Text>
            )}
            <Text style={styles.mapSheetDist}>距你 240m</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Community Tab ────────────────────────────────────────────────────────────

const FILTERS = ['最新', '熱門', '附近', '散步', '吃貨', '祕境'];

// 後端 tag 不存在，依 content 關鍵字猜一個 emoji
const TAG_ICONS = { '咖啡': '☕', '甜點': '🍰', '拍照': '📸', '散步': '🌿', '書店': '📖', '夜景': '🌃' };
function guessEmoji(content = '') {
  for (const [kw, emoji] of Object.entries(TAG_ICONS)) {
    if (content.includes(kw)) return emoji;
  }
  return '✨';
}

// 把 CommunitySpotResponse 轉成貼文格式
function toPost(s) {
  return {
    id:    s.id,
    user:  s.author?.display_name || s.author?.username || '旅人',
    img:   guessEmoji(s.content),
    title: (s.content || '').slice(0, 30) + ((s.content || '').length > 30 ? '…' : ''),
    desc:  s.content || '',
    likes: s.likes_count ?? 0,
    saves: s.saves_count ?? 0,
    isLiked: s.viewer_state?.is_liked ?? false,
  };
}

// 當後端沒有資料時的 fallback
const FALLBACK_POSTS = [
  { id: 1, user: '里山行者',  img: '🌿', title: '象山後山的祕徑',    desc: '下午三點的光打進竹林，整個就是日劇場景...', likes: 124, saves: 38, isLiked: false },
  { id: 2, user: '豆漿控',    img: '🍜', title: '信義巷口新開的麵店', desc: '招牌牛肉麵湯頭超濃郁，份量驚人，建議空腹前往', likes: 87,  saves: 22, isLiked: false },
  { id: 3, user: '底片人',    img: '📷', title: '光合作用書店角落',   desc: '週二下午幾乎沒有人，整個書架的光都是你的', likes: 203, saves: 91, isLiked: false },
  { id: 4, user: '漫步者',    img: '🌸', title: '四四南村週末限定市集', desc: '手作品質超好，文創小物和咖啡一起逛', likes: 56, saves: 17, isLiked: false },
];

function CommunityTab() {
  const { isLoggedIn } = useAuth();
  const [activeFilter, setActiveFilter] = useState('最新');
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  // filter → sort 對照
  const SORT_MAP = { '最新': 'recent', '熱門': 'popular', '附近': 'nearby' };

  useEffect(() => {
    setLoading(true);
    const sort = SORT_MAP[activeFilter] || 'recent';
    (async () => {
      try {
        const spots = await apiGet('/api/v1/spots/community', { sort, limit: 20 });
        setPosts(spots.length > 0 ? spots.map(toPost) : FALLBACK_POSTS);
      } catch (e) {
        console.warn('[ExploreScreen] community API 失敗，用 fallback', e.message);
        setPosts(FALLBACK_POSTS);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFilter]);

  const toggleLike = async (postId) => {
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
    ));
    if (isLoggedIn) {
      try { await apiPost(`/api/v1/spots/community/${postId}/like`); }
      catch (e) { /* silent */ }
    }
  };

  return (
    <ScrollView style={styles.commScroll} showsVerticalScrollIndicator={false}>
      {/* filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={T.ink3} />
        </View>
      ) : (
        posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postImg}>
              <Text style={{ fontSize: 48 }}>{post.img}</Text>
            </View>
            <View style={styles.postBody}>
              <View style={styles.postMeta}>
                <Text style={styles.postUser}>@{post.user}</Text>
              </View>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postDesc} numberOfLines={2}>{post.desc}</Text>
              <View style={styles.postActions}>
                <TouchableOpacity onPress={() => toggleLike(post.id)} style={styles.postAction}>
                  <Text style={[styles.postActionText, post.isLiked && { color: T.stamp }]}>
                    {post.isLiked ? '♥' : '♡'} {post.likes}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.postAction}>
                  <Text style={styles.postActionText}>🔖 {post.saves}</Text>
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper:          { flex: 1, backgroundColor: T.paper },
  topTabBar:        { backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.line, elevation: 0, shadowOpacity: 0 },
  topTabLabel:      { fontFamily: Fonts.serif, fontSize: 13, letterSpacing: 0.5 },
  topTabIndicator:  { backgroundColor: T.ink, height: 1.5 },

  // Map tab
  mapContainer:     { flex: 1, backgroundColor: T.paper2, position: 'relative' },
  userDot:          { position: 'absolute', left: '44%', top: '48%', width: 18, height: 18, zIndex: 4 },
  userDotInner:     { width: 18, height: 18, borderRadius: 9, backgroundColor: '#3E5873', borderWidth: 3, borderColor: T.paper },
  pin:              { position: 'absolute', zIndex: 5, transform: [{ translateX: -20 }, { translateY: -44 }] },
  pinBody:          { width: 40, height: 40, borderRadius: 20, borderBottomRightRadius: 4, transform: [{ rotate: '-45deg' }], alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  pinMine:          { backgroundColor: T.paper, borderColor: T.accentDeep || '#8B3A22' },
  pinCommunity:     { backgroundColor: T.paper, borderColor: '#4D5A30' },
  pinActive:        { backgroundColor: T.accent, borderColor: T.accent, width: 50, height: 50, borderRadius: 25, borderBottomRightRadius: 5 },
  mapSheet:         { position: 'absolute', bottom: 80, left: 14, right: 14, backgroundColor: 'rgba(245,239,227,0.95)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: T.line, flexDirection: 'row', gap: 12, zIndex: 10 },
  mapSheetIcon:     { width: 64, height: 64, borderRadius: 14, backgroundColor: '#F3DCB2', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mineBadge:        { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: T.stamp, alignItems: 'center', justifyContent: 'center' },
  mineBadgeText:    { fontSize: 9, color: T.paper, fontWeight: '700' },
  mapSheetMeta:     { fontFamily: Fonts.mono,      fontSize: 9,  letterSpacing: 3,   color: T.ink3 },
  mapSheetName:     { fontFamily: Fonts.serifBold, fontSize: 17, color: T.ink,       marginTop: 2 },
  mapSheetDesc:     { fontFamily: Fonts.serif,     fontSize: 12, color: T.ink2,      marginTop: 4, lineHeight: 18 },
  mapSheetFooter:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  mapSheetLike:     { fontFamily: Fonts.mono, fontSize: 11, color: T.stamp },
  mapSheetDist:     { fontFamily: Fonts.mono, fontSize: 11, color: T.ink3 },
  addBtn:           { position: 'absolute', right: 18, top: 56, width: 48, height: 48, borderRadius: 24, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  addBtnText:       { color: T.paper, fontSize: 22, lineHeight: 26 },

  // Community tab
  commScroll:       { flex: 1, backgroundColor: T.paper },
  filters:          { padding: 14, gap: 8 },
  filterChip:       { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1, borderColor: T.line },
  filterChipActive: { backgroundColor: T.ink, borderColor: T.ink },
  filterText:       { fontFamily: Fonts.serif, fontSize: 12, color: T.ink3 },
  filterTextActive: { color: T.paper },
  loadingWrap:      { paddingVertical: 40, alignItems: 'center' },

  postCard:         { marginHorizontal: 14, marginBottom: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, borderRadius: 20, overflow: 'hidden' },
  postImg:          { height: 120, backgroundColor: T.paper2, alignItems: 'center', justifyContent: 'center' },
  postBody:         { padding: 14 },
  postMeta:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  postUser:         { fontFamily: Fonts.mono,      fontSize: 11, color: T.ink3 },
  postTitle:        { fontFamily: Fonts.serifBold, fontSize: 15, color: T.ink,  marginBottom: 4 },
  postDesc:         { fontFamily: Fonts.serif,     fontSize: 12, color: T.ink2, lineHeight: 17 },
  postActions:      { flexDirection: 'row', gap: 16, marginTop: 10 },
  postAction:       {},
  postActionText:   { fontFamily: Fonts.mono, fontSize: 12, color: T.ink3 },
});
