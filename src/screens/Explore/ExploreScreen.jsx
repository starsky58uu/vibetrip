import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList,
  ActivityIndicator, TextInput, Image, Modal, KeyboardAvoidingView,
  Platform, RefreshControl, Alert,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { Fonts } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { apiGet, apiPost } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import MapScreen from '../Map/MapScreen';

const TopTab = createMaterialTopTabNavigator();

// ── 時間格式 ──────────────────────────────────────────────────────────────────
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

// ── 主畫面 ────────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.paper }}>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle:           { backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line, elevation: 0, shadowOpacity: 0 },
          tabBarLabelStyle:      { fontFamily: Fonts.serif, fontSize: 13, letterSpacing: 0.5 },
          tabBarIndicatorStyle:  { backgroundColor: colors.ink, height: 1.5 },
          tabBarActiveTintColor:  colors.ink,
          tabBarInactiveTintColor: colors.ink3,
        }}
      >
        <TopTab.Screen name="Map"       component={MapScreen}    options={{ tabBarLabel: '地圖' }} />
        <TopTab.Screen name="Community" component={CommunityTab} options={{ tabBarLabel: '社群' }} />
      </TopTab.Navigator>
    </View>
  );
}

// ── 社群 Tab ──────────────────────────────────────────────────────────────────
const FILTERS = [
  { label: '最新', sort: 'recent'  },
  { label: '熱門', sort: 'popular' },
  { label: '附近', sort: 'nearby'  },
];

const FALLBACK = [
  { id: 'f1', author: { username: '里山行者', display_name: '里山行者', avatar_url: null }, content: '象山後山的祕徑，下午三點的光打進竹林，整個就是日劇場景 🌿', image_url: null, likes_count: 124, saves_count: 38, created_at: new Date(Date.now() - 7200000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f2', author: { username: '豆漿控', display_name: '豆漿控', avatar_url: null }, content: '信義巷口新開的麵店，招牌牛肉麵湯頭超濃郁，份量驚人，建議空腹前往 🍜', image_url: null, likes_count: 87, saves_count: 22, created_at: new Date(Date.now() - 18000000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f3', author: { username: '底片人', display_name: '底片人', avatar_url: null }, content: '光合作用書店的角落，週二下午幾乎沒有人，整個書架的光都是你的 📷', image_url: null, likes_count: 203, saves_count: 91, created_at: new Date(Date.now() - 86400000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
  { id: 'f4', author: { username: '漫步者', display_name: '漫步者', avatar_url: null }, content: '四四南村週末限定市集，手作品質超好，文創小物和咖啡一起逛 🌸', image_url: null, likes_count: 56, saves_count: 17, created_at: new Date(Date.now() - 172800000).toISOString(), viewer_state: { is_liked: false, is_saved: false } },
];

function CommunityTab() {
  const { isLoggedIn, user } = useAuth();
  const { colors } = useTheme();

  const [activeFilter, setActiveFilter] = useState('recent');
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc]   = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);  // 詳情 modal
  const [showCreate, setShowCreate]     = useState(false); // 發文 modal

  // 取得 GPS（給「附近」用）
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc(loc.coords);
    })();
  }, []);

  const fetchPosts = useCallback(async (sort = activeFilter, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = { sort, limit: 20 };
      if (sort === 'nearby' && userLoc) {
        params.lat = userLoc.latitude;
        params.lon = userLoc.longitude;
      }
      const spots = await apiGet('/api/v1/spots/community', params);
      setPosts(spots.length > 0 ? spots : FALLBACK);
    } catch {
      setPosts(FALLBACK);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, userLoc]);

  useEffect(() => { fetchPosts(activeFilter); }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(activeFilter, true);
  };

  // 按讚
  const handleLike = async (postId) => {
    if (!isLoggedIn) { Alert.alert('請先登入', '登入後才能按讚'); return; }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const liked = !p.viewer_state.is_liked;
      return { ...p, likes_count: liked ? p.likes_count + 1 : p.likes_count - 1, viewer_state: { ...p.viewer_state, is_liked: liked } };
    }));
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => {
        const liked = !prev.viewer_state.is_liked;
        return { ...prev, likes_count: liked ? prev.likes_count + 1 : prev.likes_count - 1, viewer_state: { ...prev.viewer_state, is_liked: liked } };
      });
    }
    try { await apiPost(`/api/v1/spots/community/${postId}/like`); } catch {}
  };

  // 收藏
  const handleSave = async (postId) => {
    if (!isLoggedIn) { Alert.alert('請先登入', '登入後才能收藏'); return; }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const saved = !p.viewer_state.is_saved;
      return { ...p, saves_count: saved ? p.saves_count + 1 : p.saves_count - 1, viewer_state: { ...p.viewer_state, is_saved: saved } };
    }));
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => {
        const saved = !prev.viewer_state.is_saved;
        return { ...prev, saves_count: saved ? prev.saves_count + 1 : prev.saves_count - 1, viewer_state: { ...prev.viewer_state, is_saved: saved } };
      });
    }
    try { await apiPost(`/api/v1/spots/community/${postId}/save`); } catch {}
  };

  // 發文成功後加進列表頂端
  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* Filter */}
      <View style={[s.filterWrapper, { borderBottomColor: colors.line }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.sort}
              onPress={() => setActiveFilter(f.sort)}
              style={[
                s.chip,
                { borderColor: colors.line },
                activeFilter === f.sort && { backgroundColor: colors.ink, borderColor: colors.ink },
              ]}
            >
              <Text style={[
                s.chipText,
                { color: colors.ink3 },
                activeFilter === f.sort && { color: colors.paper },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.ink3} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink3} />}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              colors={colors}
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
          style={[s.fab, { backgroundColor: colors.ink }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.paper} />
        </TouchableOpacity>
      )}

      {/* 詳情 Modal */}
      <PostDetailModal
        post={selectedPost}
        colors={colors}
        onClose={() => setSelectedPost(null)}
        onLike={() => selectedPost && handleLike(selectedPost.id)}
        onSave={() => selectedPost && handleSave(selectedPost.id)}
      />

      {/* 發文 Modal */}
      <CreatePostModal
        visible={showCreate}
        colors={colors}
        userLoc={userLoc}
        onClose={() => setShowCreate(false)}
        onCreated={handlePostCreated}
      />
    </View>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({ post, colors, onPress, onLike, onSave }) {
  const author = post.author;
  const liked  = post.viewer_state?.is_liked;
  const saved  = post.viewer_state?.is_saved;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.line }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* 圖片 */}
      {post.image_url ? (
        <Image source={{ uri: post.image_url }} style={s.cardImage} />
      ) : null}

      <View style={s.cardBody}>
        {/* 作者列 */}
        <View style={s.authorRow}>
          <View style={[s.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[s.avatarText, { color: colors.paper }]}>{avatarChar(author)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.authorName, { color: colors.ink }]}>{author.display_name || author.username}</Text>
            <Text style={[s.authorTime, { color: colors.ink3 }]}>@{author.username} · {timeAgo(post.created_at)}</Text>
          </View>
        </View>

        {/* 內文 */}
        <Text style={[s.content, { color: colors.ink2 }]} numberOfLines={3}>{post.content}</Text>

        {/* 互動 */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={onLike}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#E05555' : colors.ink3} />
            <Text style={[s.actionNum, { color: liked ? '#E05555' : colors.ink3 }]}>{post.likes_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onSave}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? colors.accent : colors.ink3} />
            <Text style={[s.actionNum, { color: saved ? colors.accent : colors.ink3 }]}>{post.saves_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── PostDetailModal ───────────────────────────────────────────────────────────
function PostDetailModal({ post, colors, onClose, onLike, onSave }) {
  if (!post) return null;
  const liked = post.viewer_state?.is_liked;
  const saved = post.viewer_state?.is_saved;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.modalSheet, { backgroundColor: colors.card, borderColor: colors.line }]}>
        <View style={[s.modalHandle, { backgroundColor: colors.line }]} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {post.image_url && (
            <Image source={{ uri: post.image_url }} style={s.modalImage} />
          )}

          <View style={{ padding: 20 }}>
            {/* 作者 */}
            <View style={s.authorRow}>
              <View style={[s.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[s.avatarText, { color: colors.paper }]}>{avatarChar(post.author)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.authorName, { color: colors.ink }]}>{post.author.display_name || post.author.username}</Text>
                <Text style={[s.authorTime, { color: colors.ink3 }]}>@{post.author.username} · {timeAgo(post.created_at)}</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.ink3} />
              </TouchableOpacity>
            </View>

            {/* 全文 */}
            <Text style={[s.modalContent, { color: colors.ink2 }]}>{post.content}</Text>

            {/* 互動 */}
            <View style={[s.modalActions, { borderTopColor: colors.line }]}>
              <TouchableOpacity style={s.modalActionBtn} onPress={onLike}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#E05555' : colors.ink3} />
                <Text style={[s.modalActionText, { color: liked ? '#E05555' : colors.ink3 }]}>{post.likes_count} 個喜歡</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalActionBtn} onPress={onSave}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.accent : colors.ink3} />
                <Text style={[s.modalActionText, { color: saved ? colors.accent : colors.ink3 }]}>{post.saves_count} 人收藏</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── CreatePostModal ───────────────────────────────────────────────────────────
function CreatePostModal({ visible, colors, userLoc, onClose, onCreated }) {
  const [content, setContent]     = useState('');
  const [imageUri, setImageUri]   = useState(null);
  const [isPublic, setIsPublic]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setContent(''); setImageUri(null); setIsPublic(true); };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert('請填寫內容'); return; }
    if (!userLoc) { Alert.alert('無法取得位置', '請開啟定位權限後再試'); return; }
    setSubmitting(true);
    try {
      await apiPost('/api/v1/spots/personal', {
        latitude:  userLoc.latitude,
        longitude: userLoc.longitude,
        note:      content.trim(),
        image_url: imageUri ?? undefined,
        is_public: isPublic,
      });
      // 建立一個假的即時回應貼文（後端會有真的，下次 refresh 時更新）
      const mockPost = {
        id: `temp_${Date.now()}`,
        author: { username: 'me', display_name: '我', avatar_url: null },
        content: content.trim(),
        image_url: imageUri ?? null,
        likes_count: 0,
        saves_count: 0,
        created_at: new Date().toISOString(),
        viewer_state: { is_liked: false, is_saved: false },
      };
      if (isPublic) onCreated(mockPost);
      reset();
      onClose();
      Alert.alert('發布成功', isPublic ? '已分享到社群 🎉' : '已儲存為個人足跡');
    } catch (e) {
      Alert.alert('發布失敗', '請確認網路連線後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[s.modalSheet, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={[s.modalHandle, { backgroundColor: colors.line }]} />

          {/* Header */}
          <View style={[s.createHeader, { borderBottomColor: colors.line }]}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={[s.createCancel, { color: colors.ink3 }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[s.createTitle, { color: colors.ink }]}>分享足跡</Text>
            <TouchableOpacity
              style={[s.createSubmit, { backgroundColor: colors.ink }, submitting && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.paper} />
                : <Text style={[s.createSubmitText, { color: colors.paper }]}>發布</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 20 }}>
            {/* 內文輸入 */}
            <TextInput
              style={[s.createInput, { color: colors.ink, borderColor: colors.line }]}
              placeholder="寫下這裡發生了什麼…"
              placeholderTextColor={colors.ink3}
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={300}
              autoFocus
            />
            <Text style={[s.charCount, { color: colors.ink4 }]}>{content.length}/300</Text>

            {/* 圖片預覽 */}
            {imageUri && (
              <View style={s.previewWrap}>
                <Image source={{ uri: imageUri }} style={s.preview} />
                <TouchableOpacity style={s.previewRemove} onPress={() => setImageUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* 工具列 */}
            <View style={[s.createToolbar, { borderTopColor: colors.line }]}>
              <TouchableOpacity style={s.toolBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={22} color={colors.ink3} />
                <Text style={[s.toolText, { color: colors.ink3 }]}>加入照片</Text>
              </TouchableOpacity>

              {/* 公開切換 */}
              <TouchableOpacity
                style={[s.toolBtn, s.publicToggle, { borderColor: colors.line }, isPublic && { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
                onPress={() => setIsPublic(!isPublic)}
              >
                <Ionicons name={isPublic ? 'earth' : 'lock-closed'} size={18} color={isPublic ? colors.accent : colors.ink3} />
                <Text style={[s.toolText, { color: isPublic ? colors.accent : colors.ink3 }]}>
                  {isPublic ? '公開分享' : '僅自己'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // filter
  filterWrapper: { borderBottomWidth: 1 },
  filterRow:     { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  chip:          { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 100, borderWidth: 1, marginRight: 8 },
  chipText:      { fontFamily: Fonts.serif, fontSize: 12 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // card
  card:        { marginHorizontal: 14, marginTop: 14, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardImage:   { width: '100%', height: 200, resizeMode: 'cover' },
  cardBody:    { padding: 14 },
  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: Fonts.serifBold, fontSize: 15 },
  authorName:  { fontFamily: Fonts.serifBold, fontSize: 13 },
  authorTime:  { fontFamily: Fonts.mono, fontSize: 10, marginTop: 1 },
  content:     { fontFamily: Fonts.serif, fontSize: 14, lineHeight: 21 },
  actions:     { flexDirection: 'row', gap: 20, marginTop: 12 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionNum:   { fontFamily: Fonts.mono, fontSize: 12 },

  // FAB
  fab:         { position: 'absolute', right: 18, bottom: 18, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },

  // modal shared
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet:  { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: '88%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalImage:  { width: '100%', height: 240, resizeMode: 'cover' },
  modalContent:{ fontFamily: Fonts.serif, fontSize: 15, lineHeight: 24, marginTop: 14 },
  modalActions:{ flexDirection: 'row', gap: 24, marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalActionText:{ fontFamily: Fonts.serif, fontSize: 14 },

  // create post
  createHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  createCancel:     { fontFamily: Fonts.serif, fontSize: 14 },
  createTitle:      { fontFamily: Fonts.serifBold, fontSize: 15 },
  createSubmit:     { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 100 },
  createSubmitText: { fontFamily: Fonts.serifBold, fontSize: 13 },
  createInput:      { fontFamily: Fonts.serif, fontSize: 15, lineHeight: 24, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderRadius: 14, padding: 14 },
  charCount:        { fontFamily: Fonts.mono, fontSize: 10, textAlign: 'right', marginTop: 6, marginBottom: 14 },
  previewWrap:      { position: 'relative', marginBottom: 14 },
  preview:          { width: '100%', height: 180, borderRadius: 14, resizeMode: 'cover' },
  previewRemove:    { position: 'absolute', top: 8, right: 8 },
  createToolbar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, gap: 10 },
  toolBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolText:         { fontFamily: Fonts.serif, fontSize: 13 },
  publicToggle:     { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1 },
});
