import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Dimensions, TextInput, Alert, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; 

const CATEGORY_MAP = {
  '超商':  { type: 'convenience_store' },
  '咖啡廳': { type: 'cafe' },
  '速食店': { type: 'meal_takeaway' },
};

const searchGooglePlaces = async (category, lat, lon, radius, signal) => {
  const base = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const preset = CATEGORY_MAP[category];

  let url;
  if (preset) {
    // 快捷鍵：用 type 搜尋，結果最精確
    url = `${base}?location=${lat},${lon}&radius=${radius ?? 1000}&type=${preset.type}&language=zh-TW&key=${GOOGLE_API_KEY}`;
  } else {
    // 自由輸入：用 keyword 搜尋，範圍 5000m
    const keyword = encodeURIComponent(category);
    url = `${base}?location=${lat},${lon}&radius=${radius ?? 5000}&keyword=${keyword}&language=zh-TW&key=${GOOGLE_API_KEY}`;
  }

  const res = await fetch(url, { signal });
  const data = await res.json();

  if (data.status === 'REQUEST_DENIED') {
    throw new Error(`API Key 錯誤：${data.error_message}`);
  }
  if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
    throw new Error('empty');
  }

  return data.results;
};

const ArScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetCoords, setTargetCoords] = useState(null);
  const [targetName, setTargetName] = useState('雷達待命中...');
  const [loading, setLoading] = useState(false);
  const [smoothDist, setSmoothDist] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const abortRef = useRef(null);
  const locationSamplesRef = useRef([]);
  const stableLocationRef = useRef(null);

  // GPS 穩定化
  const updateStableLocation = (coords) => {
    if (coords.accuracy > 25) return;
    const samples = locationSamplesRef.current;
    samples.push({ lat: coords.latitude, lon: coords.longitude });
    if (samples.length > 5) samples.shift();
    const avgLat = samples.reduce((s, p) => s + p.lat, 0) / samples.length;
    const avgLon = samples.reduce((s, p) => s + p.lon, 0) / samples.length;
    const stable = { latitude: avgLat, longitude: avgLon };
    stableLocationRef.current = stable;
    setUserLocation(stable);
  };

  useEffect(() => {
    let headingSub, positionSub;
    (async () => {
      const { status: cam } = await requestPermission();
      const { status: loc } = await Location.requestForegroundPermissionsAsync();
      if (cam === 'granted' && loc === 'granted') {
        headingSub = await Location.watchHeadingAsync(d => setHeading(d.trueHeading ?? d.magHeading));
        positionSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 3 },
          l => updateStableLocation(l.coords)
        );
      }
    })();
    return () => { headingSub?.remove(); positionSub?.remove(); };
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getBearing = (lat1, lon1, lat2, lon2) => {
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  const normalizeShort = (angle) => {
    const a = (angle + 360) % 360;
    return a > 180 ? a - 360 : a;
  };

  const selectCandidate = (idx) => {
    const item = candidates[idx];
    setSelectedIdx(idx);
    setTargetCoords({ latitude: item.latitude, longitude: item.longitude });
    setSmoothDist(null);
    setTargetName(`📡 ${item.name}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const performSearch = async (category, radius = null) => {
    const loc = stableLocationRef.current || userLocation;
    if (!loc) { Alert.alert('提示', 'GPS 訊號尚未就緒，請稍候...'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setCandidates([]);
    setSelectedIdx(null);
    setTargetCoords(null);
    setTargetName('掃描中...');
    setSmoothDist(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { latitude, longitude } = loc;

    try {
      const results = await searchGooglePlaces(category, latitude, longitude, radius, controller.signal);

      // 【修改 I cont.】Google Places 回傳的座標在 geometry.location
      //   business_status 過濾掉已關閉的店（CLOSED_PERMANENTLY / CLOSED_TEMPORARILY）
      const parsed = results
        .filter(p => p.business_status !== 'CLOSED_PERMANENTLY' && p.business_status !== 'CLOSED_TEMPORARILY')
        .map(p => ({
          name: p.name,
          latitude: p.geometry.location.lat,
          longitude: p.geometry.location.lng,
          rating: p.rating,                    // Google 評分，顯示用
          dist: getDistance(latitude, longitude, p.geometry.location.lat, p.geometry.location.lng),
        }))
        .filter(p => !isNaN(p.dist) && p.dist > 0)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);

      if (parsed.length > 0) {
        setCandidates(parsed);
        setSelectedIdx(0);
        setTargetCoords({ latitude: parsed[0].latitude, longitude: parsed[0].longitude });
        setTargetName(`📡 ${parsed[0].name}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('找不到', `在附近找不到「${category}」，請試試其他關鍵字。`);
        setTargetName('雷達待命中...');
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e.message.startsWith('API Key')) {
        Alert.alert('設定錯誤', e.message);
      } else if (e.message === 'empty') {
        Alert.alert('找不到', `在附近找不到「${category}」，請試試其他關鍵字。`);
      } else {
        Alert.alert('網路異常', '請確認網路連線後重試。');
      }
      setTargetName('雷達待命中...');
    } finally {
      setLoading(false);
    }
  };

  // AR 角度與距離
  const { rotation, currentDist } = (() => {
    if (!userLocation || !targetCoords) return { rotation: 0, currentDist: null };
    const b = getBearing(userLocation.latitude, userLocation.longitude, targetCoords.latitude, targetCoords.longitude);
    const d = getDistance(userLocation.latitude, userLocation.longitude, targetCoords.latitude, targetCoords.longitude);
    return { rotation: normalizeShort(b - heading), currentDist: d };
  })();

  useEffect(() => {
    if (currentDist !== null) {
      setSmoothDist(prev => {
        if (prev === null) return currentDist;
        if (Math.abs(prev - currentDist) < 3) return prev;
        return Math.round(prev * 0.6 + currentDist * 0.4);
      });
    }
  }, [currentDist]);

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#C95E9E" />
        <Text style={styles.errorText}>啟動雷達感測器中...</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={requestPermission}>
          <Text style={{ color: '#E9F3FB', fontSize: 16 }}>點此手動授權相機</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back">

        {/* 頂部搜尋列 */}
        <View style={styles.uiOverlay}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="搜尋地點（不限距離）..."
              placeholderTextColor="#84A6D3"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.iconBtn} onPress={() => performSearch(searchQuery, null)}>
              {loading ? <ActivityIndicator color="#362360" /> : <Ionicons name="search" size={24} color="#362360" />}
            </TouchableOpacity>
          </View>
          <View style={styles.btnRow}>
            {['超商', '速食店', '咖啡廳'].map(cat => (
              <TouchableOpacity key={cat} style={styles.qBtn} onPress={() => performSearch(cat, 1000)}>
                <Text style={styles.qBtnText}>{cat === '超商' ? '🏪' : cat === '速食店' ? '🍔' : '☕'} {cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AR 雷達 */}
        <View style={styles.arFrame} pointerEvents="none">
          <View style={[styles.radar, { borderColor: loading ? '#C95E9E' : 'rgba(201, 94, 158, 0.4)' }]}>
            <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
              <Ionicons name="navigate" size={110} color="#C95E9E" />
            </View>
          </View>
        </View>

        {/* 底部面板 */}
        <View style={styles.bottomPanel}>

          {/* 鎖定卡片 */}
          <View style={styles.card}>
            <Text style={styles.distLabel}>
              {smoothDist !== null ? `距離：${Math.round(smoothDist)} m` : '掃描中...'}
            </Text>
            <Text style={styles.targetTitle} numberOfLines={1}>{targetName}</Text>
            <Text style={styles.hintText}>請轉動手機，讓粉紅箭頭指向正上方</Text>
          </View>

          {/* 候選清單：有多筆結果才顯示 */}
          {candidates.length > 1 && (
            <View style={styles.listWrapper}>
              <Text style={styles.listHeader}>📋 附近結果，點選切換目標</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.listScroll}>
                {candidates.map((item, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.listItem, isSelected && styles.listItemSelected]}
                      onPress={() => selectCandidate(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemLeft}>
                        <Text style={[styles.listItemName, isSelected && styles.listItemNameSelected]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {/* 【修改 I cont.】顯示 Google 評分 */}
                        {item.rating != null && (
                          <Text style={[styles.listItemRating, isSelected && styles.listItemRatingSelected]}>
                            ⭐ {item.rating}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.listItemDist, isSelected && styles.listItemDistSelected]}>
                        {item.dist} m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.exit} onPress={() => navigation.goBack()}>
          <Ionicons name="close-circle" size={44} color="#E9F3FB" />
        </TouchableOpacity>

      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#362360' },
  errorText: { fontFamily: 'VibePixel', color: '#E9F3FB', marginTop: 15, fontSize: 16 },

  uiOverlay: { position: 'absolute', top: 110, left: 20, right: 20, zIndex: 100 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#E9F3FB', height: 50, borderRadius: 15, borderWidth: 3, borderColor: '#1E1238', paddingHorizontal: 15, fontFamily: 'VibePixel' },
  iconBtn: { backgroundColor: '#C95E9E', width: 50, height: 50, borderRadius: 15, borderWidth: 3, borderColor: '#1E1238', alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  qBtn: { flex: 1, backgroundColor: '#C3AED9', paddingVertical: 12, borderRadius: 12, borderWidth: 3, borderColor: '#1E1238', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1 },
  qBtnText: { fontFamily: 'VibePixel', fontSize: 12, color: '#362360', fontWeight: 'bold' },

  arFrame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  radar: { width: 260, height: 260, borderRadius: 130, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(54, 35, 96, 0.1)' },

  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 30 },

  card: { backgroundColor: '#E9F3FB', padding: 16, borderRadius: 20, borderWidth: 3, borderColor: '#1E1238', shadowColor: '#C95E9E', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, marginBottom: 10 },
  distLabel: { fontFamily: 'VibePixel', fontSize: 20, color: '#C95E9E', marginBottom: 4, fontWeight: 'bold' },
  targetTitle: { fontFamily: 'VibePixel', fontSize: 17, color: '#362360', marginBottom: 4 },
  hintText: { fontFamily: 'VibePixel', fontSize: 11, color: '#84A6D3' },

  listWrapper: { backgroundColor: 'rgba(230, 240, 255, 0.97)', borderRadius: 20, borderWidth: 3, borderColor: '#1E1238', paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.3 },
  listHeader: { fontFamily: 'VibePixel', fontSize: 12, color: '#84A6D3', marginBottom: 8 },
  listScroll: { maxHeight: 180 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, backgroundColor: '#F0E8FF', borderWidth: 2, borderColor: 'transparent' },
  listItemSelected: { backgroundColor: '#C95E9E', borderColor: '#1E1238' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  listItemName: { fontFamily: 'VibePixel', fontSize: 14, color: '#362360', flex: 1 },
  listItemNameSelected: { color: '#E9F3FB' },
  listItemRating: { fontFamily: 'VibePixel', fontSize: 11, color: '#84A6D3' },
  listItemRatingSelected: { color: '#F0C0E0' },
  listItemDist: { fontFamily: 'VibePixel', fontSize: 13, color: '#C95E9E', marginLeft: 8 },
  listItemDistSelected: { color: '#F0C0E0' },

  exit: { position: 'absolute', top: 60, right: 25 },
});

export default ArScreen;
