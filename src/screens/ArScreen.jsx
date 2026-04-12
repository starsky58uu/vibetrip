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

const getShortestAngle = (start, end) => {
  let diff = (end - start) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
};

const getWalkToTransitSec = (route, transitTypeMatches) => {
  if (!route?.legs?.[0]?.steps) return 0;
  const steps = route.legs[0].steps;
  const transitIdx = steps.findIndex(s => s.travel_mode === 'TRANSIT' && transitTypeMatches(s));
  if (transitIdx <= 0) return 0; 
  
  let walkSec = 0;
  for (let i = 0; i < transitIdx; i++) {
    if (steps[i].travel_mode === 'WALKING') {
      walkSec += steps[i].duration.value;
    }
  }
  return walkSec;
};

const getTdxToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  try {
    console.log('[🔑 Token] 準備請求新 Token...');
    const body = Object.entries({ grant_type: 'client_credentials', client_id: TDX_CLIENT_ID, client_secret: TDX_CLIENT_SECRET })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const res  = await fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) { return null; }
};

const getBusETASec = async (token, routeName, stopName, walkSec = 0) => {
  try {
    console.log(`\n[🚌 公車 API] 查詢路線: "${routeName}", 站牌: "${stopName}", 走到站牌需: ${walkSec}秒`);
    const altStop = stopName.includes('台') ? stopName.replace(/台/g, '臺') : stopName.replace(/臺/g, '台');
    const filter = encodeURIComponent(`StopName/Zh_tw eq '${stopName}' or StopName/Zh_tw eq '${altStop}'`);
    const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=${filter}&$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    const coming = data.filter(b => b.EstimateTime != null && b.StopStatus === 0).sort((a, b) => a.EstimateTime - b.EstimateTime);
    const validBus = coming.find(b => b.EstimateTime > (walkSec + 45));
    
    if (validBus) {
      console.log(`[🚌 公車 API] ✅ 找到車次！預計 ${validBus.EstimateTime} 秒後進站`);
      return validBus.EstimateTime;
    } else {
      console.log(`[🚌 公車 API] ⚠️ 走路來不及，回傳最快車次: ${coming[0]?.EstimateTime} 秒`);
      return coming.length > 0 ? coming[0].EstimateTime : null;
    }
  } catch (err) { return null; }
};

/**
 * 取得捷運 ETA (全 TDX 方案)
 * 整合北捷專屬補丁與通用 LiveBoard 邏輯
 */
const getMrtETASec = async (token, stationName, walkSec = 0, systemCode = 'TRTC') => {
  try {
    console.log(`\n[🚇 捷運 API] 開始查詢... 站名: "${stationName}", 預估走路: ${walkSec}s, 系統: ${systemCode}`);
    
    // 1. 清理站名
    const cleanName = stationName.replace(/捷運/g, '').replace(/站$/g, '').split('(')[0].trim();
    const altCleanName = cleanName.replace(/台/g, '臺');
    const stationID = MRT_MAP[cleanName] || MRT_MAP[altCleanName];
    
    if (!stationID) {
      console.log(`[🚇 捷運 API] ❌ 映射失敗：找不到「${cleanName}」的代碼`);
      return null;
    }

    // 2. 根據系統選擇 TDX 接口 (北捷走 RealTimeStationArrival，其餘走 LiveBoard)
    let apiUrl;
    if (systemCode === 'TRTC') {
      // 🎯 北捷專用：解決 LiveBoard 抓不到高架站（如六張犁）的問題
      apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/RealTimeStationArrival/TRTC?$filter=StationID eq '${stationID}'&$format=JSON`;
    } else {
      // 通用型：桃園、台中、高雄捷運
      apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/${systemCode}?$filter=StationID eq '${stationID}'&$format=JSON`;
    }

    console.log(`[🚇 捷運 API] 呼叫 TDX 端點: ${systemCode}...`);
    const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[🚇 捷運 API] ⚠️ TDX 無回傳資料（可能是末班車已過或 ${systemCode} 接口異常）`);
      return null;
    }

    // 3. 統一格式化資料 (TDX 捷運 EstimateTime 單位皆為「分鐘」)
    const validTrains = data
      .filter(train => train.EstimateTime !== undefined && train.EstimateTime !== null)
      .map(train => ({
        destination: train.DestinationStationName?.Zh_tw || '終點',
        estimateSec: train.EstimateTime * 60 // 分鐘換算秒
      }))
      .sort((a, b) => a.estimateSec - b.estimateSec);

    if (validTrains.length === 0) {
      console.log(`[🚇 捷運 API] ⚠️ 找不到有效的預估到站時間`);
      return null;
    }

    // 4. 判斷是否趕得上 (走步時間 + 45秒緩衝)
    const catchableTrain = validTrains.find(t => t.estimateSec > (walkSec + 45));

    if (catchableTrain) {
      console.log(`[🚇 捷運 API] ✅ 推薦搭乘：往 ${catchableTrain.destination}，預計 ${catchableTrain.estimateSec}s 後進站`);
      return catchableTrain.estimateSec;
    } else {
      // 趕不上就回傳最近的一班車，至少讓 UI 有數字顯示
      const fastestSec = validTrains[0].estimateSec;
      console.log(`[🚇 捷運 API] ⚠️ 走路來不及！最快一班在 ${fastestSec}s 後`);
      return fastestSec;
    }

  } catch (error) {
    console.error("[🚇 捷運 API] ❌ 發生致命錯誤:", error);
    return null;
  }
};

const fmtSec = (sec) => {
  if (sec == null || sec < 0) return '—';
  if (sec <= 60)   return '即將進站';
  if (sec <= 120)  return '將進站';
  return `${Math.floor(sec / 60)} 分`;
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

// ── Component ────────────────────────────────────────────────────────────────

const ArScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading]           = useState(0);
  const lastHeadingRef = useRef(0);

  const [viewMode, setViewMode]         = useState('SEARCH');
  const [loading, setLoading]           = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [candidates, setCandidates]     = useState([]);
  const [selectedIdx, setSelectedIdx]   = useState(null);
  const [targetCoords, setTargetCoords] = useState(null);

  const [routesData, setRoutesData]     = useState({ walking: null, bus: null, mrt: null });
  const [timingInfo, setTimingInfo]     = useState(null); 
  
  const [selectedMode, setSelectedMode] = useState(null);
  const [routeSteps, setRouteSteps]     = useState([]); 
  
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [navInstruction, setNavInstruction]  = useState('計算路線中...');
  const [realTimeInfo, setRealTimeInfo]       = useState(null);

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
          let smoothed = prev + diff * 0.15;     
          return (smoothed + 360) % 360;         
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
    setLoading(true); setCandidates([]); setTimingInfo(null);
    try {
      let url  = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${loc.latitude},${loc.longitude}&language=zh-TW&key=${GOOGLE_API_KEY}`;
      url += CATEGORY_MAP[category] ? `&radius=2000&type=${CATEGORY_MAP[category].type}` : `&radius=50000&keyword=${encodeURIComponent(category)}`;
      let res  = await fetch(url);
      let data = await res.json();
      if (!data.results?.length) {
        const tUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(category)}&location=${loc.latitude},${loc.longitude}&language=zh-TW&key=${GOOGLE_API_KEY}`;
        res = await fetch(tUrl); data = await res.json();
      }
      const parsed = (data.results || []).map(p => ({
        name: p.name,
        latitude:  p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        rating:     p.rating ?? null,
        dist:       getDistance(loc.latitude, loc.longitude, p.geometry.location.lat, p.geometry.location.lng),
      })).sort((a, b) => a.dist - b.dist).slice(0, 5);
      setCandidates(parsed);
    } catch (err) { Alert.alert('連線失敗', '請檢查網路狀態'); } finally { setLoading(false); }
  };

  const onSelectCandidate = async (idx) => {
    const loc  = stableLocationRef.current;
    const item = candidates[idx];
    setSelectedIdx(idx); setTargetCoords(item); setTimingInfo(null); setViewMode('DETAIL');
    setLoading(true);

    (async () => {
      try {
        const token = await getTdxToken();
        
        // 1. 抓取步行路線 (總步行時間)
        const wRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${item.latitude},${item.longitude}&mode=walking&language=zh-TW&key=${GOOGLE_API_KEY}`);
        const wData = await wRes.json();
        const walkRoute = wData.routes[0];
        const walkSecTotal = walkRoute?.legs[0]?.duration?.value || 0;

        // 2. 抓取公車路線
        const bRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${item.latitude},${item.longitude}&mode=transit&transit_mode=bus&transit_routing_preference=less_walking&language=zh-TW&key=${GOOGLE_API_KEY}`);
        const bData = await bRes.json();
        const busRoute = bData.routes[0];

        // 3. 抓取捷運路線
        const mRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${loc.latitude},${loc.longitude}&destination=${item.latitude},${item.longitude}&mode=transit&transit_mode=subway|train&transit_routing_preference=less_walking&language=zh-TW&key=${GOOGLE_API_KEY}`);
        const mData = await mRes.json();
        const mrtRoute = mData.routes[0];

        setRoutesData({ walking: walkRoute, bus: busRoute, mrt: mrtRoute });

        let busSec = null, mrtSec = null, busLine = null, busStop = null, mrtStop = null;

        // 🚌 計算公車 ETA
        const busStepIdx = busRoute?.legs[0]?.steps?.findIndex(s => s.travel_mode === 'TRANSIT' && s.transit_details?.line?.vehicle?.type === 'BUS');
        if (busStepIdx !== undefined && busStepIdx !== -1 && token) {
          const busStep = busRoute.legs[0].steps[busStepIdx];
          busLine = busStep.transit_details.line.short_name || busStep.transit_details.line.name;
          busStop = busStep.transit_details.departure_stop.name;
          
          // 🎯 關鍵：抽出走到公車站的時間
          const walkToBusSec = getWalkToTransitSec(busRoute, s => s.transit_details?.line?.vehicle?.type === 'BUS');
          busSec = await getBusETASec(token, busLine, busStop, walkToBusSec);
        }

        // 🚇 計算捷運 ETA
        const mrtStepIdx = mrtRoute?.legs[0]?.steps?.findIndex(s => s.travel_mode === 'TRANSIT' && (s.transit_details?.line?.vehicle?.type === 'SUBWAY' || s.transit_details?.line?.vehicle?.type === 'HEAVY_RAIL'));
        if (mrtStepIdx !== undefined && mrtStepIdx !== -1 && token) {
          const mrtStep = mrtRoute.legs[0].steps[mrtStepIdx];
          mrtStop = mrtStep.transit_details.departure_stop.name;
          
          // 🎯 關鍵：抽出走到捷運站的時間
          const walkToMrtSec = getWalkToTransitSec(mrtRoute, s => ['SUBWAY', 'HEAVY_RAIL'].includes(s.transit_details?.line?.vehicle?.type));
          mrtSec = await getMrtETASec(token, mrtStop, walkToMrtSec);
        }

        console.log(`\n[📊 結算面板] 步行總時: ${walkSecTotal} | 公車ETA: ${busSec} | 捷運ETA: ${mrtSec}`);
        setTimingInfo({ walkSec: walkSecTotal, busSec, mrtSec, busLine, mrtStop });
      } catch (err) { 
        console.error('[📍 選擇地點] ❌ 獲取路線失敗:', err); 
      } finally { setLoading(false); }
    })();
  };

  const selectModeAndPreview = (mode) => {
    const route = routesData[mode];
    if (!route) { Alert.alert('', '無法規劃此交通方式的路線'); return; }

    const leg = route.legs[0];
    setRouteSteps(leg.steps); 
    setSelectedMode(mode);
    setViewMode('PREVIEW');
  };

  const fetchNavETA = async () => {
    lastFetchRef.current = Date.now();
    if (isFetchingEtaRef.current) return;
    const upcoming = routeSteps.slice(currentStepIdx).find(s => s.travel_mode === 'TRANSIT');
    if (!upcoming) return;
    isFetchingEtaRef.current = true;
    lastFetchRef.current = Date.now();
    try {
      const token = await getTdxToken(); 
      if (!token) return;
      const det = upcoming.transit_details;
      const vt = det.line.vehicle.type;
      const line = det.line.short_name || det.line.name;
      const stop = det.departure_stop.name;
      
      console.log(`\n[🧭 導航更新] 即時更新 ETA: ${vt === 'BUS' ? '公車' : '捷運'} - ${line || ''} @ ${stop}`);
      let etaSec = (vt === 'BUS') ? await getBusETASec(token, line, stop, 0) : await getMrtETASec(token, stop, 0);
      setRealTimeInfo({ type: (vt === 'BUS' ? 'bus' : 'mrt'), line, stop, etaSec });
    } finally {
      isFetchingEtaRef.current = false;
    }
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
    
    if (Date.now() - lastFetchRef.current > 20000) fetchNavETA();
  }, [userLocation, currentStepIdx, viewMode]);

  useEffect(() => { if (viewMode === 'NAV') fetchNavETA(); }, [viewMode, currentStepIdx]);

  const arrowAngle = (() => {
    if (!userLocation || !targetCoords) return 0;
    const target = (viewMode === 'NAV' && routeSteps[currentStepIdx]) ? 
        { latitude: routeSteps[currentStepIdx].end_location.lat, longitude: routeSteps[currentStepIdx].end_location.lng } : 
        targetCoords;
    const bearing = getBearing(userLocation.latitude, userLocation.longitude, target.latitude, target.longitude);
    return (bearing - heading + 360) % 360;
  })();

  const resetAll = () => {
    setViewMode('SEARCH'); setCandidates([]); setSelectedIdx(null); setTargetCoords(null);
    setRouteSteps([]); setSelectedMode(null); setRoutesData({ walking: null, bus: null, mrt: null });
    setRealTimeInfo(null); setTimingInfo(null); setCurrentStepIdx(0);
    setNavInstruction('計算路線中...');
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
        {viewMode === 'SEARCH' && (
          <View style={styles.searchWrap}>
            <TextInput style={styles.input} placeholder="要去哪裡？" placeholderTextColor={T.textSub} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => performSearch(searchQuery)} returnKeyType="search" />
            <TouchableOpacity style={styles.searchBtn} onPress={() => performSearch(searchQuery)}><Ionicons name="search" size={18} color={T.bg} /></TouchableOpacity>
          </View>
        )}
        {viewMode !== 'SEARCH' && (
          <View style={styles.topTitleWrap}><View style={styles.dot} /><Text style={styles.topTitle} numberOfLines={1}>{viewMode === 'NAV' ? '導航中' : viewMode === 'PREVIEW' ? '確認路線' : candidates[selectedIdx]?.name}</Text></View>
        )}
      </View>

      <View style={styles.arArea} pointerEvents="none">
        {targetCoords && (
          <>
            <View style={[styles.arrowWrap, { transform: [{ rotate: `${arrowAngle}deg` }] }]}><View style={styles.arrowShadow} /><View style={styles.arrowRing} /><Ionicons name="navigate" size={64} color={T.accent} /></View>
          </>
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

        {viewMode === 'DETAIL' && selectedIdx != null && (
          <View>
            <Text style={styles.panelLabel}>推薦交通方案</Text>
            {timingInfo ? (
              <View style={styles.timingCard}>
                <View style={styles.timingRow}>
                  <TimingCell label="步行總時" value={fmtSec(timingInfo.walkSec)} />
                  <TimingCell label={`公車 ${timingInfo.busLine || ''}`} value={fmtSec(timingInfo.busSec)} />
                  <TimingCell label={`捷運 ${timingInfo.mrtStop || ''}`} value={fmtSec(timingInfo.mrtSec)} />
                </View>
              </View>
            ) : <ActivityIndicator color={T.accent} style={{ marginVertical: 20 }} />}
            <Text style={styles.panelLabel}>選擇要查看的路線</Text>
            <View style={styles.modeRow}>{['walking', 'bus', 'mrt'].map(m => (<TouchableOpacity key={m} style={styles.modeBtn} onPress={() => selectModeAndPreview(m)}><Ionicons name={m==='walking'?'walk-outline':m==='bus'?'bus-outline':'subway-outline'} size={22} color={T.bg} /><Text style={styles.modeBtnTxt}>{m==='walking'?'步行':m==='bus'?'搭公車':'搭捷運'}</Text></TouchableOpacity>))}</View>
          </View>
        )}

        {viewMode === 'PREVIEW' && selectedMode && routesData[selectedMode] && (
          <View style={{ maxHeight: 250 }}>
            <View style={styles.previewHeader}>
                <Ionicons name={selectedMode==='walking'?'walk-outline':selectedMode==='bus'?'bus-outline':'subway-outline'} size={24} color={T.textMain} />
                <Text style={styles.previewTime}>總計 {routesData[selectedMode].legs[0].duration.text}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {routesData[selectedMode].legs[0].steps.map((s, i) => (
                <View key={i} style={styles.transitRow}>
                  <View style={styles.transitDot} />
                  <Text style={styles.transitLine}>{s.html_instructions.replace(/<[^>]*>?/gm, '')}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.startBtn} onPress={() => { setCurrentStepIdx(0); setRealTimeInfo(null); setViewMode('NAV'); }}><Ionicons name="navigate" size={18} color={T.bg} /><Text style={styles.startBtnTxt}>開始導覽</Text></TouchableOpacity>
          </View>
        )}

        {viewMode === 'NAV' && (
          <View>
            <View style={styles.navBox}><Text style={styles.navInstr}>{navInstruction}</Text></View>
            {realTimeInfo && (
              <View style={styles.rtCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.rtIconWrap}><Ionicons name={realTimeInfo.type==='bus'?'bus-outline':'subway-outline'} size={20} color={T.bg} /></View>
                  <View><Text style={styles.rtLine}>{realTimeInfo.type==='bus'?`公車 ${realTimeInfo.line}`:'捷運'}</Text><Text style={styles.rtStop}>{realTimeInfo.stop}</Text></View>
                </View>
                <View style={styles.rtEtaBadge}><Text style={styles.rtEtaTxt}>{fmtSec(realTimeInfo.etaSec)}</Text></View>
              </View>
            )}
            <TouchableOpacity style={styles.endBtn} onPress={resetAll}><Text style={styles.endBtnTxt}>結束導覽</Text></TouchableOpacity>
          </View>
        )}
      </View>
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator color={T.accent} size="large" /><Text style={styles.loadingText}>計算中...</Text></View>}
    </View>
  );
};

const TimingCell = ({ label, value }) => (
  <View style={{ alignItems: 'center', flex: 1 }}><Text style={{ color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', marginBottom: 4 }}>{label}</Text><Text style={{ color: T.textMain, fontSize: 17, fontFamily: 'VibePixel' }}>{value}</Text></View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permContainer: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  permText: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel', marginTop: 18 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'rgba(54,35,96,0.82)', borderBottomWidth: 2, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  searchWrap: { flex: 1, flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 40, borderRadius: 12, backgroundColor: T.textMain, borderWidth: 2.5, borderColor: T.border, paddingHorizontal: 14, color: T.bg, fontSize: 13, fontFamily: 'VibePixel', shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  searchBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.accent, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  topTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  catBar: { position: 'absolute', left: 16, right: 16, zIndex: 90, flexDirection: 'row', gap: 8 },
  catBarStatic: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  catText: { color: T.bg, fontSize: 13, fontFamily: 'VibePixel' },
  arArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  arrowWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  arrowShadow: { position: 'absolute', width: 96, height: 96, backgroundColor: T.border, top: 8, left: 8 },
  arrowRing: { position: 'absolute', width: 96, height: 96, backgroundColor: 'rgba(54,35,96,0.7)', borderWidth: 3, borderColor: T.border },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: T.textMain, borderWidth: 2.5, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  distText: { color: T.bg, fontSize: 18, fontFamily: 'VibePixel' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54,35,96,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  loadingText: { color: T.textMain, fontFamily: 'VibePixel', fontSize: 15, marginTop: 12 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(54,35,96,0.88)', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 2, borderColor: 'rgba(233,243,251,0.18)', paddingHorizontal: 20, paddingTop: 20, maxHeight: '60%' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(233,243,251,0.08)' },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  resultMeta: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', marginTop: 2 },
  resultDist: { color: T.accentSub, fontSize: 13, fontFamily: 'VibePixel' },
  hint: { color: T.textSub, fontSize: 13, fontFamily: 'VibePixel', textAlign: 'center', paddingVertical: 6 },
  panelLabel: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', letterSpacing: 1.2, marginBottom: 10 },
  timingCard: { backgroundColor: 'rgba(195,174,217,0.12)', borderRadius: 16, borderWidth: 1.5, borderColor: T.accentSub, padding: 14, marginBottom: 14 },
  timingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(233,243,251,0.08)' },
  timingDot: { width: 7, height: 7, borderRadius: 0 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, gap: 6, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  modeBtnTxt: { color: T.bg, fontSize: 13, fontFamily: 'VibePixel' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  previewTime: { color: T.textMain, fontSize: 18, fontFamily: 'VibePixel' },
  transitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  transitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent, marginTop: 6 },
  transitLine: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', flex: 1, lineHeight: 22 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 16, paddingVertical: 14, marginTop: 14, borderWidth: 3, borderColor: T.border, shadowColor: T.textMain, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0 },
  startBtnTxt: { color: T.bg, fontSize: 17, fontFamily: 'VibePixel' },
  navBox: { backgroundColor: T.border, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: T.accentSub },
  navInstr: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', lineHeight: 22 },
  rtCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(195,174,217,0.1)', borderRadius: 14, borderWidth: 1.5, borderColor: T.accentSub, padding: 12, marginBottom: 12 },
  rtIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  rtLine: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  rtStop: { color: T.textSub, fontSize: 12, fontFamily: 'VibePixel', marginTop: 2 },
  rtEtaBadge: { backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  rtEtaTxt: { color: T.bg, fontSize: 15, fontFamily: 'VibePixel' },
  endBtn: { paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: T.accentSub },
  endBtnTxt: { color: T.textSub, fontSize: 14, fontFamily: 'VibePixel' },
});

export default ArScreen;