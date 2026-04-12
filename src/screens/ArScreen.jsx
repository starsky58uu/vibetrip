import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Dimensions, TextInput, ActivityIndicator,
  ScrollView, Keyboard, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MRT_MAP from '../mrt_map.json';

const { width } = Dimensions.get('window');

const GOOGLE_API_KEY     = process.env.EXPO_PUBLIC_GOOGLE_API_KEY?.trim();
const TDX_CLIENT_ID      = process.env.EXPO_PUBLIC_TDX_CLIENT_ID?.trim();
const TDX_CLIENT_SECRET  = process.env.EXPO_PUBLIC_TDX_CLIENT_SECRET?.trim();

const T = {
  bg: '#362360', textMain: '#E9F3FB', accent: '#C95E9E', accentSub: '#C3AED9',
  textSub: '#84A6D3', border: '#1E1238', panel: 'rgba(54,35,96,0.88)',
};

const CATEGORY_MAP = {
  '超商':  { type: 'convenience_store', icon: 'storefront-outline' },
  '咖啡廳': { type: 'cafe',               icon: 'cafe-outline' },
  '速食':  { type: 'meal_takeaway',      icon: 'fast-food-outline' },
};

let cachedToken = null;
let tokenExpiry = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const getShortestAngle = (start, end) => {
  let diff = (end - start) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
};

const getTdxToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  try {
    const body = Object.entries({ grant_type: 'client_credentials', client_id: TDX_CLIENT_ID, client_secret: TDX_CLIENT_SECRET })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const res  = await fetchWithTimeout('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) { return null; }
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const getBearing = (lat1, lon1, lat2, lon2) => {
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const fmtSec = (sec) => {
  if (sec == null || sec < 0) return '—';
  if (sec <= 60)   return '即將抵達';
  if (sec <= 120)  return '將抵達';
  return `${Math.floor(sec / 60)} 分`;
};

// ── API Helpers ──────────────────────────────────────────────────────────────

const getBusETASec = async (token, routeName, stopName, walkSec = 0) => {
  try {
    const altStop = stopName.includes('台') ? stopName.replace(/台/g, '臺') : stopName.replace(/臺/g, '台');
    const filter = encodeURIComponent(`StopName/Zh_tw eq '${stopName}' or StopName/Zh_tw eq '${altStop}'`);
    const res = await fetchWithTimeout(`https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=${filter}&$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const coming = data.filter(b => b.EstimateTime != null && b.StopStatus === 0).sort((a, b) => a.EstimateTime - b.EstimateTime);
    const catchable = coming.find(b => b.EstimateTime > (walkSec + 45)); 
    return catchable ? catchable.EstimateTime : (coming[0]?.EstimateTime || null);
  } catch (err) { return null; }
};

const getMrtETASec = async (token, stationName, walkSec = 0, systemCode = 'TRTC') => {
  try {
    const cleanName = stationName.replace(/捷運/g, '').replace(/站$/g, '').split('(')[0].trim();
    const altCleanName = cleanName.replace(/台/g, '臺');
    const stationID = MRT_MAP[cleanName] || MRT_MAP[altCleanName];
    if (!stationID) return null;

    const apiUrl = systemCode === 'TRTC' 
      ? `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/RealTimeStationArrival/TRTC?$filter=StationID eq '${stationID}'&$format=JSON`
      : `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/${systemCode}?$filter=StationID eq '${stationID}'&$format=JSON`;

    const response = await fetchWithTimeout(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const validTrains = data.filter(train => train.EstimateTime != null).map(train => ({ estimateSec: train.EstimateTime * 60 })).sort((a, b) => a.estimateSec - b.estimateSec);
    const catchable = validTrains.find(t => t.estimateSec > (walkSec + 45));
    return catchable ? catchable.estimateSec : (validTrains[0]?.estimateSec || null);
  } catch (err) { return null; }
};

// 🎯 使用 NearBy 取代 City/Taipei，解決跨縣市抓不到車位的 Bug
const getNearestYouBike = async (lat, lon, token, isStart) => {
  try {
    // 1. 取得台北市「所有」站點
    const stUrl = `https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?$format=JSON`;
    const stRes = await fetchWithTimeout(stUrl, { headers: { Authorization: `Bearer ${token}` } });
    const stData = await stRes.json();
    if (!Array.isArray(stData) || !stData.length) return null;

    // 2. 取得台北市「所有」站點即時車況
    const avUrl = `https://tdx.transportdata.tw/api/basic/v2/Bike/Availability/City/Taipei?$format=JSON`;
    const avRes = await fetchWithTimeout(avUrl, { headers: { Authorization: `Bearer ${token}` } });
    const avData = await avRes.json();

    // 3. 檢查 avData 是否為陣列，若不是則印出 TDX 真正的錯誤訊息
    if (!Array.isArray(avData)) {
      console.log('❌ 取得車況失敗，TDX 回傳內容為:', avData);
      return null;
    }

    // 4. 組合資料，並在「本地端」計算距離
    const stations = stData.map(st => {
      const av = avData.find(a => a.StationUID === st.StationUID);
      return {
        ...st,
        AvailableRentBikes: av ? av.AvailableRentBikes : 0,
        AvailableReturnBikes: av ? av.AvailableReturnBikes : 0,
        dist: getDistance(lat, lon, st.StationPosition.PositionLat, st.StationPosition.PositionLon)
      };
    });

    // 5. 在本地端過濾...
    const validStations = stations.filter(s => 
      s.dist <= 1000 && (isStart ? s.AvailableRentBikes > 0 : s.AvailableReturnBikes > 0)
    );

    if (!validStations.length) return null;

    return validStations.sort((a, b) => a.dist - b.dist)[0];
  } catch (err) { 
    console.log('YouBike API 錯誤:', err);
    return null; 
  }
};

// ── Component ────────────────────────────────────────────────────────────────

const ArScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading]           = useState(0);

  const [viewMode, setViewMode]         = useState('SEARCH');
  const [loading, setLoading]           = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [candidates, setCandidates]     = useState([]);
  const [selectedIdx, setSelectedIdx]   = useState(null);
  const [targetCoords, setTargetCoords] = useState(null);

  const [transportOptions, setTransportOptions] = useState([]);
  const [selectedModeIdx, setSelectedModeIdx]   = useState(null);
  
  const [routeSteps, setRouteSteps]     = useState([]); 
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [navInstruction, setNavInstruction]  = useState('計算路線中...');
  const [realTimeInfo, setRealTimeInfo]       = useState(null);
  const [refreshingBike, setRefreshingBike]   = useState(false);

  const stableLocationRef = useRef(null);
  const lastFetchRef      = useRef(0);
  const isFetchingEtaRef  = useRef(false);

  useEffect(() => {
    (async () => {
      const { status: cam } = await requestPermission();
      const { status: loc } = await Location.requestForegroundPermissionsAsync();
      if (cam !== 'granted' || loc !== 'granted') return;

      Location.watchHeadingAsync(d => {
        const newHeading = d.trueHeading >= 0 ? d.trueHeading : d.magHeading;
        setHeading(prev => {
          const diff = getShortestAngle(prev, newHeading);
          if (Math.abs(diff) < 1.5) return prev; 
          return ((prev + diff * 0.15) + 360) % 360;         
        });
      });

      Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 }, l => {
        stableLocationRef.current = l.coords; 
        setUserLocation(l.coords);
      });
    })();
  }, []);

  const performSearch = async (category) => {
    const loc = stableLocationRef.current;
    if (!loc) { Alert.alert('', '正在取得定位，請稍候'); return; }
    Keyboard.dismiss();
    setLoading(true); setCandidates([]); setTransportOptions([]);
    try {
      let url  = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${loc.latitude},${loc.longitude}&language=zh-TW&key=${GOOGLE_API_KEY}`;
      url += CATEGORY_MAP[category] ? `&radius=2000&type=${CATEGORY_MAP[category].type}` : `&radius=50000&keyword=${encodeURIComponent(category)}`;
      let res  = await fetchWithTimeout(url);
      let data = await res.json();
      if (!data.results?.length) {
        const tUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(category)}&location=${loc.latitude},${loc.longitude}&language=zh-TW&key=${GOOGLE_API_KEY}`;
        res = await fetchWithTimeout(tUrl); data = await res.json();
      }
      const parsed = (data.results || []).map(p => ({
        name: p.name, latitude: p.geometry.location.lat, longitude: p.geometry.location.lng,
        rating: p.rating ?? null, dist: getDistance(loc.latitude, loc.longitude, p.geometry.location.lat, p.geometry.location.lng),
      })).sort((a, b) => a.dist - b.dist).slice(0, 5);
      setCandidates(parsed);
    } catch (err) { Alert.alert('連線失敗', '請檢查網路狀態'); } finally { setLoading(false); }
  };

  const onSelectCandidate = async (idx) => {
    const loc  = stableLocationRef.current;
    const item = candidates[idx];
    setSelectedIdx(idx); setTargetCoords(item); setTransportOptions([]); setViewMode('DETAIL');
    setLoading(true);

    try {
      const token = await getTdxToken();

      const walkPromise = async () => {
        const res = await fetchWithTimeout(`https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${item.latitude},${item.longitude}&mode=walking&language=zh-TW&key=${GOOGLE_API_KEY}`);
        const data = await res.json();
        const route = data.routes[0];
        return { mode: 'walking', title: '純步行', icon: 'walk-outline', totalSec: route?.legs[0]?.duration?.value || 0, route, isAvailable: true };
      };

      const transitPromise = async () => {
        const res = await fetchWithTimeout(`https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${item.latitude},${item.longitude}&mode=transit&language=zh-TW&key=${GOOGLE_API_KEY}`);
        const data = await res.json();
        const route = data.routes[0];
        if (!route) return { mode: 'transit', title: '大眾運輸', icon: 'bus-outline', isAvailable: false, reason: '無合適的大眾運輸路線' };

        const steps = route.legs[0].steps;
        const firstTransitIdx = steps.findIndex(s => s.travel_mode === 'TRANSIT');
        let totalSec = route.legs[0].duration.value; 
        let transitInfo = '大眾運輸';

        if (firstTransitIdx !== -1 && token) {
          const tStep = steps[firstTransitIdx];
          const type = tStep.transit_details.line.vehicle.type;
          const lineName = tStep.transit_details.line.short_name || tStep.transit_details.line.name;
          const stopName = tStep.transit_details.departure_stop.name;
          
          let walkToStationSec = 0;
          for (let i = 0; i < firstTransitIdx; i++) walkToStationSec += steps[i].duration.value;

          let realEtaSec = null;
          if (type === 'SUBWAY' || type === 'HEAVY_RAIL') {
            realEtaSec = await getMrtETASec(token, stopName, walkToStationSec);
            transitInfo = `捷運 ${stopName}`;
          } else if (type === 'BUS') {
            realEtaSec = await getBusETASec(token, lineName, stopName, walkToStationSec);
            transitInfo = `公車 ${lineName}`;
          }

          if (realEtaSec) {
            let remainingSec = 0;
            for (let i = firstTransitIdx; i < steps.length; i++) remainingSec += steps[i].duration.value;
            totalSec = realEtaSec + remainingSec;
          }
        }
        return { mode: 'transit', title: transitInfo, icon: 'bus-outline', totalSec, route, isAvailable: true };
      };

      const youbikePromise = async () => {
        if (!token) return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '系統連線異常' };
        
        const startStation = await getNearestYouBike(loc.latitude, loc.longitude, token, true);
        if (!startStation) return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '附近 1km 內無車可借' };

        const endStation = await getNearestYouBike(item.latitude, item.longitude, token, false);
        if (!endStation) return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '目的地 1km 內無位可還' };

        const walkToStartSec = startStation.dist / 1.2; 
        const rideDist = getDistance(startStation.StationPosition.PositionLat, startStation.StationPosition.PositionLon, endStation.StationPosition.PositionLat, endStation.StationPosition.PositionLon);
        const rideSec = rideDist / 3.33; 
        const walkToDestSec = endStation.dist / 1.2;
        const totalSec = Math.round(walkToStartSec + rideSec + walkToDestSec);
        
        const pseudoRoute = {
          legs: [{
            duration: { text: fmtSec(totalSec) },
            steps: [
              { travel_mode: 'WALKING', end_location: { lat: startStation.StationPosition.PositionLat, lng: startStation.StationPosition.PositionLon }, html_instructions: `走路去借 ${startStation.StationName.Zh_tw.replace('YouBike2.0_', '')}` },
              { travel_mode: 'BICYCLING', end_location: { lat: endStation.StationPosition.PositionLat, lng: endStation.StationPosition.PositionLon }, html_instructions: `騎車往 ${endStation.StationName.Zh_tw.replace('YouBike2.0_', '')}` },
              { travel_mode: 'WALKING', end_location: { lat: item.latitude, lng: item.longitude }, html_instructions: `步行至目的地` }
            ]
          }]
        };

        return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', totalSec, route: pseudoRoute, isAvailable: true };
      };

      const results = await Promise.all([
        walkPromise().catch(() => ({ mode: 'walking', title: '純步行', icon: 'walk-outline', isAvailable: false, reason: '規劃失敗' })),
        transitPromise().catch(() => ({ mode: 'transit', title: '大眾運輸', icon: 'bus-outline', isAvailable: false, reason: '規劃失敗' })),
        youbikePromise().catch(() => ({ mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '規劃失敗' }))
      ]);

      // 確保順序固定：公共運輸、YouBike、步行
      const orderKeys = ['transit', 'youbike', 'walking'];
      const finalOrder = [];
      orderKeys.forEach(key => {
        const match = results.find(r => r.mode === key);
        if (match) finalOrder.push(match);
      });

      setTransportOptions(finalOrder);
    } catch (err) { Alert.alert('路線規劃失敗', '請稍後再試'); } finally { setLoading(false); }
  };

  const selectModeAndPreview = (idx) => {
    const selected = transportOptions[idx];
    if (!selected.isAvailable) return;
    setRouteSteps(selected.route.legs[0].steps); 
    setSelectedModeIdx(idx);
    setViewMode('PREVIEW');
  };

  const fetchNavETA = async () => {
    lastFetchRef.current = Date.now();
    if (isFetchingEtaRef.current) return;
    const upcoming = routeSteps.slice(currentStepIdx).find(s => s.travel_mode === 'TRANSIT');
    if (!upcoming) return;

    isFetchingEtaRef.current = true;
    try {
      const token = await getTdxToken(); 
      if (!token) return;
      const det = upcoming.transit_details;
      const vt = det.line.vehicle.type;
      const line = det.line.short_name || det.line.name;
      const stop = det.departure_stop.name;
      
      let etaSec = (vt === 'BUS') ? await getBusETASec(token, line, stop, 0) : await getMrtETASec(token, stop, 0);
      setRealTimeInfo({ type: (vt === 'BUS' ? 'bus' : 'mrt'), line, stop, etaSec });
    } finally { isFetchingEtaRef.current = false; }
  };

  const checkDestinationParking = async () => {
    if (!targetCoords || refreshingBike) return;
    setRefreshingBike(true);
    try {
      const token = await getTdxToken();
      if (!token) return;
      const endStation = await getNearestYouBike(targetCoords.latitude, targetCoords.longitude, token, false);
      if (endStation) {
        Alert.alert('車位即時資訊', `目的地附近最優站點：\n${endStation.StationName.Zh_tw.replace('YouBike2.0_', '')}\n目前剩餘可還空位：${endStation.AvailableReturnBikes} 格`);
      } else {
        Alert.alert('注意', '目的地 1km 內目前無車位可還，請提早規劃！');
      }
    } finally { setRefreshingBike(false); }
  };

  useEffect(() => {
    if (viewMode !== 'NAV' || !userLocation || !routeSteps.length) return;
    const step = routeSteps[currentStepIdx];
    if (!step) { setNavInstruction('已抵達目的地 🏁'); return; }
    
    const d = getDistance(userLocation.latitude, userLocation.longitude, step.end_location.lat, step.end_location.lng);
    
    if (d < 12 && currentStepIdx < routeSteps.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStepIdx(c => c + 1); 
      setRealTimeInfo(null); 
      return;
    }
    
    setNavInstruction(`${step.html_instructions.replace(/<[^>]*>?/gm, '')} · 剩餘 ${d < 1000 ? `${d}m` : `${(d/1000).toFixed(1)}km`}`);
    
    const activeOpt = transportOptions[selectedModeIdx];
    if (activeOpt?.mode === 'transit' && (Date.now() - lastFetchRef.current > 20000)) fetchNavETA();
  }, [userLocation, currentStepIdx, viewMode]);

  useEffect(() => { 
    const activeOpt = transportOptions[selectedModeIdx];
    if (viewMode === 'NAV' && activeOpt?.mode === 'transit') fetchNavETA(); 
  }, [viewMode, currentStepIdx]);

  const arrowAngle = (() => {
    if (!userLocation || !targetCoords) return 0;
    const target = (viewMode === 'NAV' && routeSteps[currentStepIdx]) ? 
        { latitude: routeSteps[currentStepIdx].end_location.lat, longitude: routeSteps[currentStepIdx].end_location.lng } : targetCoords;
    const bearing = getBearing(userLocation.latitude, userLocation.longitude, target.latitude, target.longitude);
    return (bearing - heading + 360) % 360;
  })();

  const resetAll = () => {
    setViewMode('SEARCH'); setCandidates([]); setSelectedIdx(null); setTargetCoords(null);
    setRouteSteps([]); setSelectedModeIdx(null); setTransportOptions([]);
    setRealTimeInfo(null); setCurrentStepIdx(0); setNavInstruction('計算路線中...');
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permContainer}>
        <Ionicons name="compass-outline" size={52} color={T.accent} />
        <Text style={styles.permText}>等待相機與定位授權</Text>
        <ActivityIndicator size="large" color={T.accentSub} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 16);
  const activeOpt = selectedModeIdx != null ? transportOptions[selectedModeIdx] : null;

  return (
    <View style={styles.root}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (viewMode === 'NAV') resetAll();
          else if (viewMode === 'PREVIEW') setViewMode('DETAIL');
          else if (viewMode === 'DETAIL') { setViewMode('SEARCH'); setSelectedIdx(null); setTargetCoords(null); }
          else navigation.goBack();
        }}>
          <Ionicons name="chevron-back" size={20} color={T.bg} />
        </TouchableOpacity>
        {viewMode === 'SEARCH' ? (
          <View style={styles.searchWrap}>
            <TextInput style={styles.input} placeholder="要去哪裡？" placeholderTextColor={T.textSub} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => performSearch(searchQuery)} returnKeyType="search" />
            <TouchableOpacity style={styles.searchBtn} onPress={() => performSearch(searchQuery)}><Ionicons name="search" size={18} color={T.bg} /></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topTitleWrap}><View style={styles.dot} /><Text style={styles.topTitle} numberOfLines={1}>{viewMode === 'NAV' ? '導航中' : viewMode === 'PREVIEW' ? '確認路線' : candidates[selectedIdx]?.name}</Text></View>
        )}
      </View>

      <View style={styles.arArea} pointerEvents="none">
        {targetCoords && (
          <View style={[styles.arrowWrap, { transform: [{ rotate: `${arrowAngle}deg` }] }]}><View style={styles.arrowShadow} /><View style={styles.arrowRing} /><Ionicons name="navigate" size={64} color={T.accent} /></View>
        )}
      </View>

      <View style={[styles.panel, { paddingBottom: bottomPad + 4 }]}>
        
        {viewMode === 'SEARCH' && (
          candidates.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {candidates.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.resultRow} onPress={() => onSelectCandidate(idx)}>
                  <View style={styles.resultLeft}><View style={styles.dot} /><View><Text style={styles.resultName}>{item.name}</Text>{item.rating != null && (<Text style={styles.resultMeta}>{'★'.repeat(Math.round(item.rating))}  {item.rating}</Text>)}</View></View>
                  <View style={styles.resultRight}><Text style={styles.resultDist}>{item.dist < 1000 ? `${item.dist}m` : `${(item.dist/1000).toFixed(1)}km`}</Text><Ionicons name="chevron-forward" size={15} color={T.textSub} /></View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : !loading ? (
            <View style={{ gap: 12 }}>
                <View style={styles.catBarStatic}>
                    {Object.keys(CATEGORY_MAP).map(cat => (
                        <TouchableOpacity key={cat} style={styles.catChip} onPress={() => performSearch(cat)}>
                            <Ionicons name={CATEGORY_MAP[cat].icon} size={13} color={T.bg} />
                            <Text style={styles.catText}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>搜尋地名或選擇上方類別 ✨</Text>
            </View>
          ) : null
        )}

        {/* 🎯 乾淨的橫向三按鈕 */}
        {viewMode === 'DETAIL' && selectedIdx != null && (
          <View>
            <Text style={styles.panelLabel}>選擇交通方案</Text>
            {transportOptions.length > 0 ? (
              <View style={styles.modeRow}>
                {transportOptions.map((opt, idx) => {
                  const isAvail = opt.isAvailable;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.modeBtn, !isAvail && styles.modeBtnDisabled]} 
                      onPress={() => isAvail ? selectModeAndPreview(idx) : Alert.alert('此方案無法使用', opt.reason)}
                      activeOpacity={isAvail ? 0.7 : 1}
                    >
                      <Ionicons name={opt.icon} size={28} color={isAvail ? T.bg : T.textSub} />
                      <Text style={[styles.modeBtnTxt, !isAvail && { color: T.textSub }]} numberOfLines={1}>{opt.title}</Text>
                      <Text style={[styles.modeBtnTime, !isAvail && { color: T.textSub }]}>{isAvail ? fmtSec(opt.totalSec) : '不可用'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : <ActivityIndicator color={T.accent} style={{ marginVertical: 20 }} />}
          </View>
        )}

        {viewMode === 'PREVIEW' && activeOpt && (
          <View style={{ maxHeight: 250 }}>
            <View style={styles.previewHeader}>
                <Ionicons name={activeOpt.icon} size={24} color={T.textMain} />
                <Text style={styles.previewTime}>總計 {fmtSec(activeOpt.totalSec)}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {routeSteps.map((s, i) => (
                <View key={i} style={styles.transitRow}>
                  <View style={styles.transitDot} />
                  <Text style={styles.transitLine}>{s.html_instructions.replace(/<[^>]*>?/gm, '')}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.startBtn} onPress={() => { setCurrentStepIdx(0); setRealTimeInfo(null); setViewMode('NAV'); }}>
              <Ionicons name="navigate" size={18} color={T.bg} /><Text style={styles.startBtnTxt}>開始導覽</Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'NAV' && (
          <View>
            <View style={styles.navBox}><Text style={styles.navInstr}>{navInstruction}</Text></View>
            
            {realTimeInfo && activeOpt?.mode === 'transit' && (
              <View style={styles.rtCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.rtIconWrap}><Ionicons name={realTimeInfo.type==='bus'?'bus-outline':'subway-outline'} size={20} color={T.bg} /></View>
                  <View><Text style={styles.rtLine}>{realTimeInfo.type==='bus'?`公車 ${realTimeInfo.line}`:'捷運'}</Text><Text style={styles.rtStop}>{realTimeInfo.stop}</Text></View>
                </View>
                <View style={styles.rtEtaBadge}><Text style={styles.rtEtaTxt}>{fmtSec(realTimeInfo.etaSec)}</Text></View>
              </View>
            )}

            {activeOpt?.mode === 'youbike' && (
              <TouchableOpacity style={styles.refreshBikeBtn} onPress={checkDestinationParking} disabled={refreshingBike}>
                {refreshingBike ? <ActivityIndicator size="small" color={T.textMain} /> : <Ionicons name="refresh-circle-outline" size={20} color={T.textMain} />}
                <Text style={styles.refreshBikeTxt}>{refreshingBike ? '查詢中...' : '更新目的地車位狀況'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.endBtn} onPress={resetAll}><Text style={styles.endBtnTxt}>結束導覽</Text></TouchableOpacity>
          </View>
        )}
      </View>
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator color={T.accent} size="large" /><Text style={styles.loadingText}>運算中...</Text></View>}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permContainer: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  permText: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel', marginTop: 18 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'rgba(54,35,96,0.82)', borderBottomWidth: 2, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 40, borderRadius: 12, backgroundColor: T.textMain, borderWidth: 2.5, borderColor: T.border, paddingHorizontal: 14, color: T.bg, fontSize: 13, fontFamily: 'VibePixel' },
  searchBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.accent, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  catBarStatic: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border },
  catText: { color: T.bg, fontSize: 13, fontFamily: 'VibePixel' },
  arArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  arrowWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  arrowShadow: { position: 'absolute', width: 96, height: 96, backgroundColor: T.border, top: 8, left: 8 },
  arrowRing: { position: 'absolute', width: 96, height: 96, backgroundColor: 'rgba(54,35,96,0.7)', borderWidth: 3, borderColor: T.border },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54,35,96,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  loadingText: { color: T.textMain, fontFamily: 'VibePixel', fontSize: 15, marginTop: 12 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(54,35,96,0.88)', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 2, borderColor: 'rgba(233,243,251,0.18)', paddingHorizontal: 20, paddingTop: 20, maxHeight: '65%' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(233,243,251,0.08)' },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  resultMeta: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', marginTop: 2 },
  resultDist: { color: T.accentSub, fontSize: 13, fontFamily: 'VibePixel' },
  hint: { color: T.textSub, fontSize: 13, fontFamily: 'VibePixel', textAlign: 'center', paddingVertical: 6 },
  panelLabel: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', letterSpacing: 1.2, marginBottom: 10 },
  
  // 橫向排版樣式
  modeRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 16 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, gap: 6, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  modeBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', shadowOpacity: 0 },
  modeBtnTxt: { color: T.bg, fontSize: 13, fontFamily: 'VibePixel', fontWeight: 'bold' },
  modeBtnTime: { color: T.bg, fontSize: 15, fontFamily: 'VibePixel' },
  
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  previewTime: { color: T.textMain, fontSize: 18, fontFamily: 'VibePixel' },
  transitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  transitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent, marginTop: 6 },
  transitLine: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', flex: 1, lineHeight: 22 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 16, paddingVertical: 14, marginTop: 14, borderWidth: 3, borderColor: T.border },
  startBtnTxt: { color: T.bg, fontSize: 17, fontFamily: 'VibePixel' },
  navBox: { backgroundColor: T.border, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: T.accentSub },
  navInstr: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', lineHeight: 22 },
  rtCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(195,174,217,0.1)', borderRadius: 14, borderWidth: 1.5, borderColor: T.accentSub, padding: 12, marginBottom: 12 },
  rtIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  rtLine: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  rtStop: { color: T.textSub, fontSize: 12, fontFamily: 'VibePixel', marginTop: 2 },
  rtEtaBadge: { backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: T.border },
  rtEtaTxt: { color: T.bg, fontSize: 15, fontFamily: 'VibePixel' },
  refreshBikeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: T.textSub },
  refreshBikeTxt: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  endBtn: { paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: T.accentSub },
  endBtnTxt: { color: T.textSub, fontSize: 14, fontFamily: 'VibePixel' },
});

export default ArScreen;