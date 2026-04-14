import { useState, useEffect, useRef } from 'react';
import { Keyboard, Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

// 引入剛剛抽離的工具與服務
import { CATEGORY_MAP } from '../constants/arData';
import { fetchWithTimeout, getShortestAngle, getDistance, fmtSec, getBearing } from '../utils/helpers';
import { getTdxToken, getBusETASec, getMrtETASec, getNearestYouBike, getBusRealTimeStatus } from '../services/transportApi';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY?.trim();

export const useArLogic = () => {
  const [permission, requestPermission] = useCameraPermissions();

  // 基本狀態
  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading]           = useState(0);
  const [viewMode, setViewMode]         = useState('SEARCH'); // SEARCH, DETAIL, PREVIEW, NAV
  const [loading, setLoading]           = useState(false);
  
  // 搜尋與目標
  const [searchQuery, setSearchQuery]   = useState('');
  const [candidates, setCandidates]     = useState([]);
  const [selectedIdx, setSelectedIdx]   = useState(null);
  const [targetCoords, setTargetCoords] = useState(null);

  // 路線規劃
  const [transportOptions, setTransportOptions] = useState([]);
  const [selectedModeIdx, setSelectedModeIdx]   = useState(null);
  const [routeSteps, setRouteSteps]             = useState([]); 
  
  // 導航狀態
  const [currentStepIdx, setCurrentStepIdx]   = useState(0);
  const [navInstruction, setNavInstruction]   = useState('計算路線中...');
  const [realTimeInfo, setRealTimeInfo]       = useState(null);
  const [refreshingBike, setRefreshingBike]   = useState(false);

  // 【新增】乘車追蹤與提醒狀態
  const [hasBoarded, setHasBoarded] = useState(false);
  const [alightWarning, setAlightWarning] = useState(false);
  const [hasShownAlightWarning, setHasShownAlightWarning] = useState(false); // 防止卡片重複彈出
  const [boardedPlateNumb, setBoardedPlateNumb] = useState(null);
  const [busCurrentStatus, setBusCurrentStatus] = useState(null);

  // Refs
  const stableLocationRef = useRef(null);
  const lastFetchRef      = useRef(0);
  const isFetchingEtaRef  = useRef(false);

  // 初始化權限與硬體感測器
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

  // 1. 執行地點搜尋
  const performSearch = async (category) => {
    const loc = stableLocationRef.current;
    if (!loc) { Alert.alert('', '正在取得定位，請稍候'); return; }
    Keyboard.dismiss();
    setLoading(true); setCandidates([]); setTransportOptions([]);
    try {
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${loc.latitude},${loc.longitude}&language=zh-TW&opennow=true&key=${GOOGLE_API_KEY}`;

        if (CATEGORY_MAP[category]) {
            url += `&radius=2000&type=${CATEGORY_MAP[category].type}`;
            if (CATEGORY_MAP[category].keyword) {
                url += `&keyword=${encodeURIComponent(CATEGORY_MAP[category].keyword)}`;
            }
        } else {
            url += `&radius=50000&keyword=${encodeURIComponent(category)}`;
        }

        let res = await fetchWithTimeout(url);
        let data = await res.json();

        if (!data.results?.length) {
            const tUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(category)}&location=${loc.latitude},${loc.longitude}&language=zh-TW&opennow=true&key=${GOOGLE_API_KEY}`;
            res = await fetchWithTimeout(tUrl);
            data = await res.json();
        }
        const parsed = (data.results || [])
            .map((p) => ({
                name: p.name,
                latitude: p.geometry.location.lat,
                longitude: p.geometry.location.lng,
                rating: p.rating ?? null,
                dist: getDistance(loc.latitude, loc.longitude, p.geometry.location.lat, p.geometry.location.lng),
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5);
        setCandidates(parsed);
    } catch (err) { Alert.alert('連線失敗', '請檢查網路狀態'); } finally { setLoading(false); }
  };

  // 2. 選擇地點並計算三種路線
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
        return { mode: 'walking', title: '純步行', icon: 'walk-outline', totalSec: route?.legs[0]?.duration?.value || 0, route, isAvailable: !!route };
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
            const busData = await getBusETASec(token, lineName, stopName, walkToStationSec);
            realEtaSec = busData ? busData.estimateSec : null;
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
      
      if (vt === 'BUS') {
        const busData = await getBusETASec(token, line, stop, 0);
        if (busData) {
          setRealTimeInfo({ 
            type: 'bus', 
            line, 
            stop, 
            etaSec: busData.estimateSec,
            plateNumb: busData.plateNumb // 存下車牌
          });
        }
      } else {
        const etaSec = await getMrtETASec(token, stop, 0);
        setRealTimeInfo({ type: 'mrt', line, stop, etaSec });
      }
    } finally { isFetchingEtaRef.current = false; }
  };

  const trackBoardedBus = async () => {
    if (!boardedPlateNumb || !hasBoarded) return;

    lastFetchRef.current = Date.now(); // 防呆：確保更新時間戳記，避免狂打 API
    if (isFetchingEtaRef.current) return;
    isFetchingEtaRef.current = true;

    try {
      const token = await getTdxToken();
      const activeOpt = transportOptions[selectedModeIdx];
      const upcoming = routeSteps[currentStepIdx];
      if (activeOpt?.mode !== 'transit' || upcoming?.travel_mode !== 'TRANSIT') return;

      const line = upcoming.transit_details.line.short_name || upcoming.transit_details.line.name;

      const status = await getBusRealTimeStatus(token, line, boardedPlateNumb);
      if (status) {
        setBusCurrentStatus(`目前${status.status}：${status.currentStop}`);
        
        // 如果公車目前的站點等於你的目的地站點，且尚未發出過提醒
        if (status.currentStop === upcoming.transit_details.arrival_stop.name && status.status === '進站中') {
           if (!hasShownAlightWarning) {
              setAlightWarning(true);
              setHasShownAlightWarning(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
           }
        }
      }
    } catch (err) {
      console.log("追蹤公車失敗", err);
    } finally {
      isFetchingEtaRef.current = false; // 確保一定會釋放鎖定
    }
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

  // 監聽導航進度
  useEffect(() => {
    if (viewMode !== 'NAV' || !userLocation || !routeSteps.length) return;
    const step = routeSteps[currentStepIdx];
    if (!step) { setNavInstruction('已抵達目的地 🏁'); return; }
    
    const d = getDistance(userLocation.latitude, userLocation.longitude, step.end_location.lat, step.end_location.lng);
    
    // 【抵達判斷】如果小於 30m 且是最後一步，顯示抵達
    if (currentStepIdx === routeSteps.length - 1 && d <= 30) {
      if (!navInstruction.includes('已抵達')) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNavInstruction('已抵達目的地 🏁');
      }
      return;
    }

    // 【切換步驟】放寬至 40m，避免 GPS 誤差卡在搭車階段
    if (d < 40 && currentStepIdx < routeSteps.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStepIdx(c => c + 1); 
      setRealTimeInfo(null); 
      setHasBoarded(false);   
      setAlightWarning(false); 
      setHasShownAlightWarning(false); // 進入下一步重置提醒
      return;
    }
    
    // 【下車提醒防呆】如果距離下車點小於 500m 且還沒跳過提醒，就跳一次
    if (step.travel_mode === 'TRANSIT' && hasBoarded && !hasShownAlightWarning) {
      if (d < 500) {
        setAlightWarning(true);
        setHasShownAlightWarning(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }

    // 更新導航文字
    if (d > 30 || currentStepIdx < routeSteps.length - 1) {
      setNavInstruction(`${step.html_instructions.replace(/<[^>]*>?/gm, '')} · 剩餘 ${d < 1000 ? `${d}m` : `${(d/1000).toFixed(1)}km`}`);
    }
    
    // API 定期更新邏輯：若尚未上車打 ETA，若已上車追蹤車牌
    const activeOpt = transportOptions[selectedModeIdx];
    if (activeOpt?.mode === 'transit' && (Date.now() - lastFetchRef.current > 15000)) {
      if (!hasBoarded) {
        fetchNavETA();
      } else {
        trackBoardedBus();
      }
    }
  }, [userLocation, currentStepIdx, viewMode, hasBoarded, alightWarning, hasShownAlightWarning, boardedPlateNumb]);

  useEffect(() => { 
    const activeOpt = transportOptions[selectedModeIdx];
    // 剛進 NAV 模式且還沒上車時，先打一次 ETA
    if (viewMode === 'NAV' && activeOpt?.mode === 'transit' && !hasBoarded) fetchNavETA(); 
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
    setHasBoarded(false);
    setAlightWarning(false);
    setHasShownAlightWarning(false);
    setBoardedPlateNumb(null);
    setBusCurrentStatus(null);
  };

  return {
    permission, userLocation, heading,
    viewMode, setViewMode, loading,
    searchQuery, setSearchQuery, 
    candidates, setCandidates,
    selectedIdx, setSelectedIdx,
    targetCoords, setTargetCoords,
    transportOptions, selectedModeIdx, routeSteps,
    currentStepIdx, setCurrentStepIdx, navInstruction, realTimeInfo, setRealTimeInfo,
    refreshingBike,
    performSearch, onSelectCandidate, selectModeAndPreview, checkDestinationParking,
    resetAll, arrowAngle,
    hasBoarded, setHasBoarded,
    alightWarning, setAlightWarning,
    boardedPlateNumb, setBoardedPlateNumb,
    busCurrentStatus
  };
};