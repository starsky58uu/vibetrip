import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUMMY_COMMUNITY_SPOTS } from '../constants/mapData';
import { Alert } from 'react-native';
import { apiGet, apiPost, apiUpload } from '../../../services/apiClient';

const LOCAL_SPOTS_KEY = 'vt_local_spots';   // 未登入時的本地足跡

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function toCommunitySpot(s) {
  return {
    id:      s.id,
    lat:     s.latitude,
    lng:     s.longitude,
    author:  { name: s.author.display_name || s.author.username, avatar: s.author.avatar_url ?? null },
    timeAgo: timeAgo(s.created_at),
    content: s.content,
    image:   s.image_url ?? null,
    likes:   s.likes_count,
    replies: 0,
    isLiked: s.viewer_state?.is_liked  ?? false,
    isSaved: s.viewer_state?.is_saved  ?? false,
    isViewed: false,
  };
}

// ── 本地儲存工具 ───────────────────────────────────────────────────────────────

async function loadLocalSpots() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SPOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalSpots(spots) {
  try {
    await AsyncStorage.setItem(LOCAL_SPOTS_KEY, JSON.stringify(spots));
  } catch (e) {
    console.warn('[useMapLogic] AsyncStorage 寫入失敗', e.message);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useMapLogic = ({ isLoggedIn = false } = {}) => {
  const mapRef = useRef(null);

  const [mapMode, setMapMode]   = useState('explore');
  const [mySpots, setMySpots]   = useState([]);
  const [communitySpots, setCommunitySpots] = useState([]);
  const [userLocation, setUserLocation]     = useState(null);

  const [selectedSpot, setSelectedSpot]                   = useState(null);
  const [selectedCommunitySpot, setSelectedCommunitySpot] = useState(null);
  const [editingNote, setEditingNote]   = useState('');
  const [editingImage, setEditingImage] = useState(null);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // 先用快取位置立即置中（幾乎零延遲）
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        const lastCoords = {
          latitude:      last.coords.latitude,
          longitude:     last.coords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        };
        setUserLocation(lastCoords);
        if (mapRef.current) mapRef.current.animateToRegion(lastCoords, 300);
      }

      // 再取精確位置，更新（可能比快取位置偏移一點點）
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude:      location.coords.latitude,
        longitude:     location.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setUserLocation(coords);
      if (mapRef.current) mapRef.current.animateToRegion(coords, 600);
    })();
  }, []);

  // ── 社群足跡 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const spots = await apiGet('/api/v1/spots/community', { sort: 'recent', limit: 20 });
        setCommunitySpots(spots.map(toCommunitySpot));
      } catch {
        setCommunitySpots(DUMMY_COMMUNITY_SPOTS);
      }
    })();
  }, []);

  // ── 個人足跡：登入 → 後端；未登入 → AsyncStorage ───────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      // 從後端拉
      (async () => {
        try {
          const spots = await apiGet('/api/v1/spots/personal');
          const remote = spots.map(s => ({
            id:       s.id,
            lat:      s.latitude,
            lng:      s.longitude,
            note:     s.content ?? s.note ?? '',
            imageUri: s.image_url ?? null,
            synced:   true,
          }));
          setMySpots(remote);
        } catch (e) {
          console.warn('[useMapLogic] 後端足跡載入失敗', e.message);
        }
      })();
    } else {
      // 從本地 AsyncStorage 拉
      (async () => {
        const local = await loadLocalSpots();
        setMySpots(local);
      })();
    }
  }, [isLoggedIn]);

  // ── 定位按鈕 ───────────────────────────────────────────────────────────────
  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  // ── 長按地圖：新增足跡 pin ──────────────────────────────────────────────────
  const handleMapLongPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newSpot = {
      id:       `local_${Date.now()}`,
      lat:      latitude,
      lng:      longitude,
      note:     '',
      imageUri: null,
      synced:   false,
    };
    setMySpots(prev => [...prev, newSpot]);
    openMySpotDetail(newSpot);
  };

  const openMySpotDetail = (spot) => {
    setSelectedSpot(spot);
    setEditingNote(spot.note ?? '');
    setEditingImage(spot.imageUri ?? null);
  };

  // ── 儲存足跡（關閉 modal 時呼叫）──────────────────────────────────────────
  // 把 expo-image-picker 給的 file:// URI 上傳到後端，拿到真正的 https URL
  const uploadImageIfNeeded = async (uri) => {
    if (!uri) return null;
    // 已經是 http(s) URL → 不用再上傳
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

    const fd = new FormData();
    // RN 的 FormData 需要 { uri, name, type } 三件套
    const ext  = uri.split('.').pop().toLowerCase().split('?')[0];
    const mime = (ext === 'png') ? 'image/png' : 'image/jpeg';
    // ⚠️ 不能用簡寫，部分 RN 版本對 type 字串嚴格
    fd.append('file', {
      uri,
      name: `spot.${ext || 'jpg'}`,
      type: mime,
    });

    try {
      const res = await apiUpload('/api/v1/uploads/image', fd, { timeoutMs: 60000 });
      // 後端通常回 { url } 或 { image_url } 之一
      const url = res?.url ?? res?.image_url ?? res?.path ?? null;
      if (!url) throw new Error('伺服器未回傳圖片網址');
      return url;
    } catch (e) {
      throw new Error(`圖片上傳失敗：${e.message}`);
    }
  };

  const saveAndCloseSpot = async () => {
    if (!selectedSpot) return;

    try {
      // Step 1: 圖片若是本機 file:// → 先上傳換成 https URL
      let imageUrl = editingImage;
      if (isLoggedIn && editingImage?.startsWith('file://')) {
        imageUrl = await uploadImageIfNeeded(editingImage);
      }

      const updated = {
        ...selectedSpot,
        note:     editingNote,
        imageUri: imageUrl ?? editingImage,
      };

      // Step 2: 同步到後端 / AsyncStorage
      if (isLoggedIn) {
        const isLocal = typeof selectedSpot.id === 'string' && selectedSpot.id.startsWith('local_');
        if (isLocal || !selectedSpot.synced) {
          const res = await apiPost('/api/v1/spots/personal', {
            latitude:  selectedSpot.lat,
            longitude: selectedSpot.lng,
            note:      editingNote,
            image_url: imageUrl ?? undefined,
            is_public: false,
          });
          updated.id     = res.id ?? updated.id;
          updated.synced = true;
        }
      } else {
        const newList = mySpots.map(s => s.id === selectedSpot.id ? updated : s);
        await saveLocalSpots(newList);
      }

      // Step 3: 成功 → 更新地圖 + 關閉 modal
      setMySpots(prev => prev.map(s => s.id === selectedSpot.id ? updated : s));
      setSelectedSpot(null);
      setEditingNote('');
      setEditingImage(null);

    } catch (e) {
      // 失敗時不關 modal，明確告訴使用者
      console.warn('[useMapLogic] 足跡上傳失敗', e.message);
      Alert.alert(
        '儲存失敗',
        `${e.message || '請稍後再試'}\n（網路或後端問題，您的內容還在）`,
        [{ text: '知道了' }],
      );
    }
  };

  // ── 從 TripScreen 儲存整趟行程為足跡 pins ──────────────────────────────────
  /**
   * tripItems: TripPlanResponse.items，每個 item 含 activity + lat/lon (若 AI 有回)
   * tripTitle: 行程標題
   *
   * 目前 AI 回傳的 items 不帶座標，所以只在 userLocation 附近建一個代表性 pin
   */
  const saveTripAsSpots = async (tripTitle, tripItems) => {
    if (!userLocation) return;

    // 建一個彙總 pin（放在目前位置附近，稍微隨機偏移）
    const pin = {
      id:       `local_trip_${Date.now()}`,
      lat:      userLocation.latitude  + (Math.random() - 0.5) * 0.002,
      lng:      userLocation.longitude + (Math.random() - 0.5) * 0.002,
      note:     `📍 ${tripTitle}\n${tripItems.map((it, i) => `${i + 1}. ${it.activity}`).join('\n')}`,
      imageUri: null,
      synced:   false,
    };

    const newSpots = [...mySpots, pin];
    setMySpots(newSpots);

    if (isLoggedIn) {
      try {
        const res = await apiPost('/api/v1/spots/personal', {
          latitude:  pin.lat,
          longitude: pin.lng,
          content:   pin.note,
          is_public: false,
        });
        pin.id     = res.id ?? pin.id;
        pin.synced = true;
        setMySpots(prev => prev.map(s => s.id === pin.id ? pin : s));
      } catch (e) {
        console.warn('[useMapLogic] 行程足跡上傳失敗', e.message);
      }
    } else {
      await saveLocalSpots(newSpots);
    }
  };

  // ── 社群互動 ─────────────────────────────────────────────────────────────────
  const openCommunitySpot = (spot) => {
    setCommunitySpots(prev => prev.map(s => s.id === spot.id ? { ...s, isViewed: true } : s));
    setSelectedCommunitySpot({ ...spot, isViewed: true });
  };

  const toggleCommunityLike = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommunitySpots(prev => prev.map(spot => {
      if (spot.id !== id) return spot;
      const updated = { ...spot, isLiked: !spot.isLiked, likes: spot.isLiked ? spot.likes - 1 : spot.likes + 1 };
      if (selectedCommunitySpot?.id === id) setSelectedCommunitySpot(updated);
      return updated;
    }));
    if (isLoggedIn) {
      try { await apiPost(`/api/v1/spots/community/${id}/like`); } catch {}
    }
  };

  const toggleCommunitySave = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCommunitySpots(prev => prev.map(spot => {
      if (spot.id !== id) return spot;
      const updated = { ...spot, isSaved: !spot.isSaved };
      if (selectedCommunitySpot?.id === id) setSelectedCommunitySpot(updated);
      return updated;
    }));
    if (isLoggedIn) {
      try { await apiPost(`/api/v1/spots/community/${id}/save`); } catch {}
    }
  };

  // ── 圖片選擇器 ───────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setEditingImage(result.assets[0].uri);
  };

  return {
    mapRef, mapMode, setMapMode,
    mySpots, communitySpots,
    selectedSpot, setSelectedSpot,
    selectedCommunitySpot, setSelectedCommunitySpot,
    editingNote, setEditingNote,
    editingImage, pickImage, saveAndCloseSpot,
    goToUserLocation, handleMapLongPress, openMySpotDetail,
    openCommunitySpot, toggleCommunityLike, toggleCommunitySave,
    saveTripAsSpots,   // ← TripScreen 用這個
    userLocation,
  };
};
