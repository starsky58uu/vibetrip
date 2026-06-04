import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, TextInput, Image, Modal, KeyboardAvoidingView,
  Platform, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { Fonts } from '../../constants/theme';
import { apiGet, apiPost } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import MapScreen from '../Map/MapScreen';
import { usePAL } from '../../context/DimContext';

// ── 卡通膠囊色票 ───────────────────────────────────────────────────────────────
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};
const BORDER = 0;
const PILL_RADIUS = 999;
const HARD_SHADOW = {};  // 無黑色硬陰影

// ── 工具函式 ───────────────────────────────────────────────────────────────────
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
function avatarChar(s) {
  return (s?.display_name || s?.username || '?')[0].toUpperCase();
}

const FALLBACK_POSTS = [
  { id: 'f1', author: { username: '里山行者', display_name: '里山行者', avatar_url: null }, content: '象山後山的祕徑，下午三點的光打進竹林，整個就是日劇場景 🌿', image_url: null, likes_count: 124, saves_count: 38, created_at: new Date(Date.now() - 7200000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f2', author: { username: '豆漿控', display_name: '豆漿控', avatar_url: null }, content: '信義巷口新開的麵店，招牌牛肉麵湯頭超濃郁，份量驚人，建議空腹前往 🍜', image_url: null, likes_count: 87, saves_count: 22, created_at: new Date(Date.now() - 18000000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f3', author: { username: '底片人', display_name: '底片人', avatar_url: null }, content: '光合作用書店的角落，週二下午幾乎沒有人，整個書架的光都是你的 📷', image_url: null, likes_count: 203, saves_count: 91, created_at: new Date(Date.now() - 86400000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f4', author: { username: '漫步者', display_name: '漫步者', avatar_url: null }, content: '四四南村週末限定市集，手作品質超好，文創小物和咖啡一起逛 🌸', image_url: null, likes_count: 56, saves_count: 17, created_at: new Date(Date.now() - 172800000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
];

// ── 主畫面 ────────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const C = usePAL();
  const [activeTab, setActiveTab] = useState('map');

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: C.yellow }]}>
      {/* 自定義 Segmented Control */}
      <View style={styles.segWrap}>
        <View style={[styles.segPill, { backgroundColor: C.white }]}>
          {['map', 'community'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.segBtn, activeTab === tab && { backgroundColor: C.blue }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, activeTab === tab && { color: C.white }]}>
                {tab === 'map' ? '地圖' : '社群'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 地圖 tab */}
      {activeTab === 'map' && (
        <View style={styles.mapShadowWrap}>
          <View style={[styles.mapFrame, { backgroundColor: C.blue }]}>
            <View style={styles.mapClip}>
              <MapScreen />
            </View>
          </View>
        </View>
      )}

      {/* 社群 tab */}
      {activeTab === 'community' && (
        <CommunityTab />
      )}
    </View>
  );
}

// ── 社群 Tab ──────────────────────────────────────────────────────────────────
const SORT_BTNS = [
  { label: '最新', sort: 'recent'  },
  { label: '熱門', sort: 'popular' },
  { label: '附近', sort: 'nearby'  },
];
const SORT_COLORS = [PAL.pink, PAL.yellow, PAL.blue];

function CommunityTab() {
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const C = usePAL();

  const [sort, setSort]         = useState('recent');
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc]   = useState(null);
  const [locDenied, setLocDenied] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocDenied(true); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc(loc.coords);
    })();
  }, []);

  const fetchPosts = useCallback(async (s = sort, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = { sort: s, limit: 20 };
      if (s === 'nearby' && userLoc) { params.lat = userLoc.latitude; params.lon = userLoc.longitude; }
      const data = await apiGet('/api/v1/spots/community', params);
      setPosts(data.length > 0 ? data : FALLBACK_POSTS);
    } catch { setPosts(FALLBACK_POSTS); }
    finally { setLoading(false); setRefreshing(false); }
  }, [sort, userLoc]);

  useEffect(() => { fetchPosts(sort); }, [sort, fetchPosts]);

  const handleLike = async (id) => {
    if (!isLoggedIn) { Alert.alert('請先登入', '登入後才能按讚'); return; }
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const liked = !p.viewer_state.is_liked;
      return { ...p, likes_count: liked ? p.likes_count + 1 : p.likes_count - 1, viewer_state: { ...p.viewer_state, is_liked: liked } };
    }));
    try { await apiPost(`/api/v1/spots/community/${id}/like`); } catch {}
  };

  const handleSave = async (id) => {
    if (!isLoggedIn) { Alert.alert('請先登入', '登入後才能收藏'); return; }
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const saved = !p.viewer_state.is_saved;
      return { ...p, saves_count: saved ? p.saves_count + 1 : p.saves_count - 1, viewer_state: { ...p.viewer_state, is_saved: saved } };
    }));
    try { await apiPost(`/api/v1/spots/community/${id}/save`); } catch {}
  };

  // 動態 filter pill 配色（跟著 dim 模式切換）
  const SORT_COLORS_C = [C.pink, C.yellow, C.blue];

  return (
    <View style={[styles.communityWrap, { backgroundColor: C.yellow }]}>
      {/* Sort filter pills */}
      <View style={styles.filterRow}>
        {SORT_BTNS.map((btn, i) => {
          const active = sort === btn.sort;
          return (
            <TouchableOpacity
              key={btn.sort}
              style={[
                styles.filterPill,
                { backgroundColor: active ? SORT_COLORS_C[i] : C.white },
              ]}
              onPress={() => setSort(btn.sort)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, { color: active && SORT_COLORS_C[i] === C.blue ? C.white : C.black }]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feed */}
      {sort === 'nearby' && locDenied ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={44} color="rgba(0,0,0,0.35)" style={{ marginBottom: 10 }} />
          <Text style={styles.hintText}>請開啟定位權限{'\n'}才能查看附近足跡</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(sort, true); }} tintColor={PAL.blue} />}
          renderItem={({ item, index }) => (
            <PostCard
              post={item}
              index={index}
              onPress={() => setSelectedPost(item)}
              onLike={() => handleLike(item.id)}
              onSave={() => handleSave(item.id)}
            />
          )}
        />
      )}

      {/* 發文 FAB */}
      {isLoggedIn && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.blue }]}
          onPress={() => setShowCreate(true)} activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={C.white} />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={() => selectedPost && handleLike(selectedPost.id)}
        onSave={() => selectedPost && handleSave(selectedPost.id)}
      />
      <CreatePostModal
        visible={showCreate}
        userLoc={userLoc}
        onClose={() => setShowCreate(false)}
        onCreated={p => setPosts(prev => [p, ...prev])}
      />
    </View>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────────
function PostCard({ post, onPress, onLike, onSave, index = 0 }) {
  const C = usePAL();
  const CARD_ACCENTS = [C.pink, C.blue, C.yellow, C.pink, C.blue];
  const liked  = post.viewer_state?.is_liked;
  const saved  = post.viewer_state?.is_saved;
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const tilt   = (index % 2 === 0 ? 0.4 : -0.4) + 'deg';

  return (
    <View style={[styles.cardWrap, { transform: [{ rotate: tilt }] }]}>
      {/* 硬陰影層 */}
      <View style={[styles.cardShadow, { backgroundColor: accent }]} />
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.white }]}
        onPress={onPress} activeOpacity={0.9}
      >
        {/* 頂部色帶 */}
        <View style={[styles.cardAccentBar, { backgroundColor: accent }]} />

        {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.cardImg} /> : null}

        <View style={styles.cardBody}>
          {/* 作者 */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: accent === C.yellow ? C.black : accent }]}>
              <Text style={[styles.avatarTxt, { color: accent === C.blue ? C.white : C.black }]}>
                {avatarChar(post.author)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{post.author.display_name || post.author.username}</Text>
              <Text style={styles.authorTime}>{timeAgo(post.created_at)}</Text>
            </View>
          </View>
          {/* 內文 */}
          <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
          {/* 互動 */}
          <View style={styles.actRow}>
            <TouchableOpacity style={styles.actBtn} onPress={onLike}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#E05555' : 'rgba(0,0,0,0.3)'} />
              <Text style={[styles.actNum, liked && { color: '#E05555' }]}>{post.likes_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actBtn} onPress={onSave}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? PAL.blue : 'rgba(0,0,0,0.3)'} />
              <Text style={[styles.actNum, saved && { color: PAL.blue }]}>{post.saves_count}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── PostDetailModal ────────────────────────────────────────────────────────────
function PostDetailModal({ post, onClose, onLike, onSave }) {
  const C = usePAL();
  const liked = post?.viewer_state?.is_liked;
  const saved = post?.viewer_state?.is_saved;
  return (
    <Modal visible={!!post} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: C.white }]}>
        <View style={styles.sheetHandle} />
        {post && (
          <FlatList
            data={[post]}
            keyExtractor={() => 'detail'}
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <View>
                {post.image_url && <Image source={{ uri: post.image_url }} style={styles.detailImg} />}
                <View style={{ padding: 20 }}>
                  <View style={styles.authorRow}>
                    <View style={styles.avatar}><Text style={styles.avatarTxt}>{avatarChar(post.author)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.authorName}>{post.author.display_name || post.author.username}</Text>
                      <Text style={styles.authorTime}>{timeAgo(post.created_at)}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={22} color="rgba(0,0,0,0.45)" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.postContent, { fontSize: 15, lineHeight: 24, marginTop: 12 }]}>{post.content}</Text>
                  <View style={[styles.actRow, { marginTop: 20, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: 'rgba(0,0,0,0.1)' }]}>
                    <TouchableOpacity style={styles.actBtn} onPress={onLike}>
                      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#E05555' : 'rgba(0,0,0,0.45)'} />
                      <Text style={[styles.actNum, liked && { color: '#E05555' }]}>{post.likes_count} 個喜歡</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actBtn} onPress={onSave}>
                      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? PAL.blue : 'rgba(0,0,0,0.45)'} />
                      <Text style={[styles.actNum, saved && { color: PAL.blue }]}>{post.saves_count} 人收藏</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ── CreatePostModal ────────────────────────────────────────────────────────────
function CreatePostModal({ visible, userLoc, onClose, onCreated }) {
  const C = usePAL();
  const [content, setContent]   = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setContent(''); setImageUri(null); setIsPublic(true); };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4,3], quality: 0.8 });
    if (!r.canceled) setImageUri(r.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert('請填寫內容'); return; }
    if (!userLoc) { Alert.alert('無法取得位置'); return; }
    setSubmitting(true);
    try {
      await apiPost('/api/v1/spots/personal', {
        latitude: userLoc.latitude, longitude: userLoc.longitude,
        note: content.trim(), image_url: imageUri ?? undefined, is_public: isPublic,
      });
      const mock = {
        id: `temp_${Date.now()}`, author: { username: 'me', display_name: '我', avatar_url: null },
        content: content.trim(), image_url: imageUri ?? null,
        likes_count: 0, saves_count: 0, created_at: new Date().toISOString(),
        viewer_state: { is_liked: false, is_saved: false },
      };
      if (isPublic) onCreated(mock);
      reset(); onClose();
      Alert.alert('發布成功', isPublic ? '已分享到社群 🎉' : '已儲存為個人足跡');
    } catch { Alert.alert('發布失敗', '請確認網路連線後再試'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {/* Header */}
          <View style={styles.createHeader}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={styles.createCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.createTitle}>分享足跡</Text>
            <TouchableOpacity
              style={[styles.createSubmitBtn, { backgroundColor: C.blue }, submitting && { opacity: 0.5 }]}
              onPress={handleSubmit} disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color={C.white} /> : <Text style={[styles.createSubmitTxt, { color: C.white }]}>發布</Text>}
            </TouchableOpacity>
          </View>
          {/* Body */}
          <FlatList
            data={[1]}
            keyExtractor={() => 'form'}
            keyboardShouldPersistTaps="handled"
            renderItem={() => (
              <View style={{ padding: 20 }}>
                <TextInput
                  style={styles.createInput}
                  placeholder="寫下這裡發生了什麼…"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  multiline value={content} onChangeText={setContent} maxLength={300} autoFocus
                />
                <Text style={styles.charCount}>{content.length}/300</Text>
                {imageUri && (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: imageUri }} style={styles.preview} />
                    <TouchableOpacity style={styles.previewDel} onPress={() => setImageUri(null)}>
                      <Ionicons name="close-circle" size={26} color={PAL.white} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.toolRow}>
                  <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
                    <Ionicons name="image-outline" size={20} color={C.blue} />
                    <Text style={styles.toolTxt}>加入照片</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toolBtn, styles.publicBtn,
                      isPublic && { backgroundColor: C.blue, borderColor: C.black },
                    ]}
                    onPress={() => setIsPublic(!isPublic)}
                  >
                    <Ionicons name={isPublic ? 'earth' : 'lock-closed'} size={16} color={isPublic ? C.white : C.black} />
                    <Text style={[styles.toolTxt, isPublic && { color: C.white }]}>{isPublic ? '公開' : '僅自己'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── 主容器 ─────────────────────────────────────────────────────────────
  screen: { flex: 1, backgroundColor: PAL.yellow },

  // ── Segmented control ──────────────────────────────────────────────────
  segWrap: { alignItems: 'center', paddingVertical: 10 },
  segPill: {
    flexDirection: 'row',
    backgroundColor: PAL.white,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    padding: 4,
    ...HARD_SHADOW,
  },
  segBtn: {
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: PILL_RADIUS,
  },
  segBtnActive: { backgroundColor: PAL.blue },
  segText: { fontFamily: Fonts.sansBold, fontSize: 13, color: PAL.black },
  segTextActive: { color: PAL.white },

  // ── 地圖 container ─────────────────────────────────────────────────────
  mapShadowWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 100,   // 為 TabBar 留空間
    // hard shadow
    shadowColor: PAL.black,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  mapFrame: {
    flex: 1,
    borderRadius: 24,
    borderWidth: BORDER,
    borderColor: PAL.black,
    backgroundColor: PAL.blue,
    padding: 8,           // 藍色可見區域寬度
  },
  mapClip: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // ── 社群 Tab ───────────────────────────────────────────────────────────
  communityWrap: { flex: 1 },

  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: PILL_RADIUS,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SHADOW,
  },
  filterText: { fontFamily: Fonts.sansBold, fontSize: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  hintText: { fontFamily: Fonts.sansMed, fontSize: 14, color: PAL.black, textAlign: 'center', lineHeight: 22 },

  // ── Post Card ──────────────────────────────────────────────────────────
  cardWrap: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: 20,
    top: 5, left: 5,
  },
  card: {
    backgroundColor: PAL.white,
    borderRadius: 20,
    borderWidth: BORDER,
    borderColor: PAL.black,
    overflow: 'hidden',
  },
  cardAccentBar: { height: 8, width: '100%' },
  cardImg:  { width: '100%', height: 180, resizeMode: 'cover' },
  cardBody: { padding: 16 },
  authorRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontFamily: Fonts.sansBlack, fontSize: 14 },
  authorName: { fontFamily: Fonts.sansBlack, fontSize: 13, color: PAL.black },
  authorTime: { fontFamily: Fonts.sansMed, fontSize: 10, color: 'rgba(0,0,0,0.45)', marginTop: 1 },
  postContent:{ fontFamily: Fonts.sansMed, fontSize: 13, color: PAL.black, lineHeight: 20 },
  actRow:     { flexDirection: 'row', gap: 18, marginTop: 12 },
  actBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actNum:     { fontFamily: Fonts.sansMed, fontSize: 12, color: 'rgba(0,0,0,0.35)' },

  // ── FAB ────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 18, bottom: 18,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PAL.blue,
    borderWidth: BORDER, borderColor: PAL.black,
    alignItems: 'center', justifyContent: 'center',
    ...HARD_SHADOW,
  },

  // ── Modal ──────────────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: PAL.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: BORDER, borderLeftWidth: BORDER, borderRightWidth: BORDER,
    borderColor: PAL.black,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  detailImg: { width: '100%', height: 240, resizeMode: 'cover' },

  // Create post
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  createCancel: { fontFamily: Fonts.sansMed, fontSize: 14, color: 'rgba(0,0,0,0.5)' },
  createTitle:  { fontFamily: Fonts.sansBlack, fontSize: 15, color: PAL.black },
  createSubmitBtn: {
    paddingVertical: 7, paddingHorizontal: 16,
    backgroundColor: PAL.blue, borderRadius: PILL_RADIUS,
    borderWidth: BORDER, borderColor: PAL.black,
  },
  createSubmitTxt: { fontFamily: Fonts.sansBold, fontSize: 13, color: PAL.white },
  createInput: {
    fontFamily: Fonts.sansMed, fontSize: 14, lineHeight: 22, color: PAL.black,
    minHeight: 120, textAlignVertical: 'top',
    borderWidth: BORDER, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 14,
  },
  charCount: { fontFamily: Fonts.sansMed, fontSize: 10, textAlign: 'right', marginTop: 6, color: 'rgba(0,0,0,0.4)', marginBottom: 14 },
  previewWrap: { position: 'relative', marginBottom: 14 },
  preview: { width: '100%', height: 180, borderRadius: 14, resizeMode: 'cover' },
  previewDel: { position: 'absolute', top: 8, right: 8 },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1.5, borderTopColor: 'rgba(0,0,0,0.1)', gap: 10,
  },
  toolBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolTxt:        { fontFamily: Fonts.sansMed, fontSize: 13, color: PAL.black },
  publicBtn:      { paddingVertical: 6, paddingHorizontal: 12, borderRadius: PILL_RADIUS, borderWidth: 1.5, borderColor: PAL.black },
  publicBtnActive:{ backgroundColor: PAL.blue, borderColor: PAL.black },
});
