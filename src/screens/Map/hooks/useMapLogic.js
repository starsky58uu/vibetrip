import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DUMMY_COMMUNITY_SPOTS } from '../constants/mapData';
import { apiGet, apiPost, apiDelete } from '../../../services/apiClient';

// 把 ISO 時間戳轉成相對時間字串
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// 把後端 CommunitySpotResponse 轉成 MapScreen 期望的格式
function toCommunitySpot(s) {
  return {
    id:      s.id,
    lat:     s.latitude,
    lng:     s.longitude,
    author:  {
      name:   s.author.display_name || s.author.username,
      avatar: s.author.avatar_url ?? null,
    },
    timeAgo:  timeAgo(s.created_at),
    content:  s.content,
    image:    s.image_url ?? null,
    likes:    s.likes_count,
    replies:  0,
    isLiked:  s.viewer_state?.is_liked  ?? false,
    isSaved:  s.viewer_state?.is_saved  ?? false,
    isViewed: false,
  };
}

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
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude:      location.coords.latitude,
        longitude:     location.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setUserLocation(coords);
      if (mapRef.current) mapRef.current.animateToRegion(coords, 1000);
    })();
  }, []);

  // ── 載入社群足跡 ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const spots = await apiGet('/api/v1/spots/community', { sort: 'recent', limit: 20 });
        setCommunitySpots(spots.map(toCommunitySpot));
      } catch (e) {
        console.warn('[useMapLogic] community spots API 失敗，用 mock 資料', e.message);
        setCommunitySpots(DUMMY_COMMUNITY_SPOTS);
      }
    })();
  }, []);

  // ── 載入個人足跡（需登入）──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      try {
        const spots = await apiGet('/api/v1/spots/personal');
        setMySpots(spots.map(s => ({
          id:       s.id,
          lat:      s.latitude,
          lng:      s.longitude,
          note:     s.note,
          imageUri: s.image_url ?? null,
        })));
      } catch (e) {
        console.warn('[useMapLogic] personal spots API 失敗', e.message);
      }
    })();
  }, [isLoggedIn]);

  // ── 定位 ───────────────────────────────────────────────────────────────────
  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  // ── 新增個人足跡 ────────────────────────────────────────────────────────────
  const handleMapLongPress = (e) => {
    if (mapMode !== 'personal') {
      alert('請先切換到「我的足跡」模式才能新增打卡點喔！');
      return;
    }
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newSpot = {
      id: Date.now().toString(),
      lat: latitude, lng: longitude,
      note: '', imageUri: null,
    };
    setMySpots(prev => [...prev, newSpot]);
    openMySpotDetail(newSpot);
  };

  const openMySpotDetail = (spot) => {
    setSelectedSpot(spot);
    setEditingNote(spot.note);
    setEditingImage(spot.imageUri);
  };

  const saveAndCloseSpot = async () => {
    if (!selectedSpot) return;
    const updated = { ...selectedSpot, note: editingNote, imageUri: editingImage };
    setMySpots(prev => prev.map(s => s.id === selectedSpot.id ? updated : s));

    // 如果已登入，同步至後端
    if (isLoggedIn) {
      try {
        await apiPost('/api/v1/spots/personal', {
          latitude:  selectedSpot.lat,
          longitude: selectedSpot.lng,
          note:      editingNote,
          image_url: editingImage ?? undefined,
          is_public: false,
        });
      } catch (e) {
        console.warn('[useMapLogic] 足跡儲存失敗', e.message);
      }
    }
    setSelectedSpot(null);
  };

  // ── 社群互動 ────────────────────────────────────────────────────────────────
  const openCommunitySpot = (spot) => {
    setCommunitySpots(prev => prev.map(s => s.id === spot.id ? { ...s, isViewed: true } : s));
    setSelectedCommunitySpot({ ...spot, isViewed: true });
  };

  const toggleCommunityLike = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommunitySpots(prev => prev.map(spot => {
      if (spot.id !== id) return spot;
      const updated = {
        ...spot,
        isLiked: !spot.isLiked,
        likes:   spot.isLiked ? spot.likes - 1 : spot.likes + 1,
      };
      if (selectedCommunitySpot?.id === id) setSelectedCommunitySpot(updated);
      return updated;
    }));
    if (isLoggedIn) {
      try {
        await apiPost(`/api/v1/spots/community/${id}/like`);
      } catch (e) {
        console.warn('[useMapLogic] like API 失敗', e.message);
      }
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
      try {
        await apiPost(`/api/v1/spots/community/${id}/save`);
      } catch (e) {
        console.warn('[useMapLogic] save API 失敗', e.message);
      }
    }
  };

  // ── 圖片選擇器 ──────────────────────────────────────────────────────────────
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
  };
};
