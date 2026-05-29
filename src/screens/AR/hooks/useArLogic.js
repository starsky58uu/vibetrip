import { useState, useEffect, useRef } from 'react';
import { Keyboard, Alert } from 'react-native';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';

import { getShortestAngle, getDistance, getBearing } from '../utils/helpers';
import { getBusETASec, getMrtETASec, getNearestYouBike, getBusRealTimeStatus, searchPlaces } from '../services/transportApi';
import { apiPost, apiGet } from '../../../services/apiClient';

// ── Google maneuver → Ionicons 圖示 ──────────────────────────────────────────
const MANEUVER_ICON = {
  'turn-left':          'arrow-back-outline',
  'turn-right':         'arrow-forward-outline',
  'turn-sharp-left':    'return-up-back-outline',
  'turn-sharp-right':   'return-up-forward-outline',
  'turn-slight-left':   'arrow-up-outline',
  'turn-slight-right':  'arrow-up-outline',
  'uturn-left':         'refresh-outline',
  'uturn-right':        'refresh-outline',
  'straight':           'arrow-up-outline',
  'roundabout-left':    'sync-outline',
  'roundabout-right':   'sync-outline',
  'merge':              'git-merge-outline',
  'ramp-left':          'arrow-back-outline',
  'ramp-right':         'arrow-forward-outline',
  'ferry':              'boat-outline',
};

/**
 * Google Directions step → { text, icon }
 * text：去掉所有 HTML tag 後的中文指令
 * icon：對應 Ionicons name
 */
function parseStep(step) {
  if (!step) return { text: '前進', icon: 'arrow-up-outline' };
  const maneuver = step.maneuver || 'straight';
  const text = (step.html_instructions || '')
    .replace(/<[^>]*>/gm, '')
    .replace(/\s+/g, ' ')
    .trim() || '前進';
  return { text, icon: MANEUVER_ICON[maneuver] || 'arrow-up-outline' };
}

// ── 後端 mode → 前端顯示設定 ───────────────────────────────────────────────
const MODE_CONFIG = {
  walking:     { title: '純步行',   icon: 'walk-outline',    displayMode: 'walking'  },
  transit_bus: { title: '大眾運輸', icon: 'bus-outline',     displayMode: 'transit'  },
  transit_mrt: { title: '大眾運輸', icon: 'bus-outline',     displayMode: 'transit'  },
  youbike:     { title: 'YouBike',  icon: 'bicycle-outline', displayMode: 'youbike'  },
};
const MODE_ORDER = ['transit_bus', 'transit_mrt', 'youbike', 'walking'];

// ── Directions helper（改走後端代理，金鑰留在伺服器）────────────────────────
async function fetchGoogleDirections(olat, olng, dlat, dlng, mode) {
  try {
    const data = await apiGet('/api/v1/directions/raw', { olat, olng, dlat, dlng, mode });
    return data.routes?.[0] ?? null;
  } catch {
    return null;
  }
}

export const useArLogic = () => {
  const [permission, requestPermission]       = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

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
  const [routeSteps, setRouteSteps]             = useState([]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [navInstruction, setNavInstruction] = useState('計算路線中...');
  const [realTimeInfo, setRealTimeInfo]     = useState(null);
  const [refreshingBike, setRefreshingBike] = useState(false);

  const [hasBoarded, setHasBoarded]                   = useState(false);
  const [alightWarning, setAlightWarning]             = useState(false);
  const [hasShownAlightWarning, setHasShownAlightWarning] = useState(false);
  const [boardedPlateNumb, setBoardedPlateNumb]       = useState(null);
  const [busCurrentStatus, setBusCurrentStatus]       = useState(null);

  const [showQuickTools, setShowQuickTools] = useState(false);

  // ── 路段導航 ──────────────────────────────────────────────────────────────
  const [navDistanceM,   setNavDistanceM]   = useState(0);
  const [navManeuverIcon, setNavManeuverIcon] = useState('arrow-up-outline');
  const [nextManeuver,   setNextManeuver]   = useState(null); // { text, icon }

  // ── ETA 倒數 ──────────────────────────────────────────────────────────────
  const [etaDisplaySec, setEtaDisplaySec]   = useState(null);
  const etaIntervalRef = useRef(null);

  const stableLocationRef  = useRef(null);
  const lastFetchRef       = useRef(0);
  const isFetchingEtaRef   = useRef(false);
  const hasArrivedRef      = useRef(false);   // 抵達 haptic 只觸發一次

  // ── GPS + 方向感測器 ────────────────────────────────────────────────────
  useEffect(() => {
    let headingSub = null;
    let locationSub = null;

    (async () => {
      const [{ status: cam }, { status: loc }] = await Promise.all([
        requestPermission(),
        Location.requestForegroundPermissionsAsync(),
      ]);
      requestMicPermission();
      requestMediaPermission();
      if (cam !== 'granted' || loc !== 'granted') return;

      const lastLoc = await Location.getLastKnownPositionAsync();
      if (lastLoc && !stableLocationRef.current) {
        stableLocationRef.current = lastLoc.coords;
        setUserLocation(lastLoc.coords);
      }

      headingSub = await Location.watchHeadingAsync(d => {
        const newHeading = d.trueHeading >= 0 ? d.trueHeading : d.magHeading;
        setHeading(prev => {
          const diff = getShortestAngle(prev, newHeading);
          if (Math.abs(diff) < 1.5) return prev;
          // 轉身超過 40° 直接跳，避免慢慢轉過來的延遲感
          if (Math.abs(diff) > 40) return newHeading;
          // 一般小角度變化：0.35 平滑（比原本的 0.15 快兩倍多）
          return ((prev + diff * 0.35) + 360) % 360;
        });
      });

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 },
        l => { stableLocationRef.current = l.coords; setUserLocation(l.coords); },
      );
    })();

    return () => {
      headingSub?.remove();
      locationSub?.remove();
    };
  }, []);

  // ── 搜尋地點 ────────────────────────────────────────────────────────────
  const performSearch = async (query) => {
    const loc = stableLocationRef.current;
    if (!loc) { Alert.alert('', '正在取得定位，請稍候'); return; }
    Keyboard.dismiss();
    setLoading(true); setCandidates([]); setTransportOptions([]);
    try {
      const results = await searchPlaces(query, loc.latitude, loc.longitude);
      setCandidates(results.slice(0, 6));
    } catch {
      Alert.alert('連線失敗', '請檢查網路狀態');
    } finally {
      setLoading(false);
    }
  };

  // ── 選擇目的地：後端一次算出所有交通方案 ────────────────────────────────
  const onSelectCandidate = async (idx) => {
    const loc  = stableLocationRef.current;
    const item = candidates[idx];
    setSelectedIdx(idx);
    setTargetCoords(item);
    setTransportOptions([]);
    setViewMode('DETAIL');
    setLoading(true);

    try {
      // 後端 /directions/calculate 整合 Google Directions + TDX YouBike/公車
      const result = await apiPost('/api/v1/directions/calculate', {
        origin_latitude:       loc.latitude,
        origin_longitude:      loc.longitude,
        destination_latitude:  item.latitude,
        destination_longitude: item.longitude,
        modes: ['walking', 'transit_bus', 'youbike'],
      });

      const options = (result.routes ?? [])
        .map(route => {
          const cfg = MODE_CONFIG[route.mode] ?? MODE_CONFIG.walking;
          return {
            backendMode:  route.mode,
            mode:         cfg.displayMode,
            title:        cfg.title,
            icon:         cfg.icon,
            totalSec:     route.duration_seconds,
            isAvailable:  route.available,
            reason:       route.reason ?? null,
          };
        })
        .sort((a, b) => MODE_ORDER.indexOf(a.backendMode) - MODE_ORDER.indexOf(b.backendMode));

      setTransportOptions(options);
    } catch (e) {
      console.warn('[AR] directions/calculate 失敗，改用 Google 直連', e.message);
      // Fallback：直接打 Google Directions（不含 YouBike TDX 資訊）
      try {
        const [walkRoute, transitRoute] = await Promise.all([
          fetchGoogleDirections(loc.latitude, loc.longitude, item.latitude, item.longitude, 'walking'),
          fetchGoogleDirections(loc.latitude, loc.longitude, item.latitude, item.longitude, 'transit'),
        ]);
        setTransportOptions([
          { backendMode: 'transit_bus', mode: 'transit', title: '大眾運輸', icon: 'bus-outline',   totalSec: transitRoute?.legs[0]?.duration?.value ?? 0, isAvailable: !!transitRoute },
          { backendMode: 'walking',     mode: 'walking',  title: '純步行',   icon: 'walk-outline',  totalSec: walkRoute?.legs[0]?.duration?.value ?? 0,    isAvailable: !!walkRoute    },
        ]);
      } catch {
        Alert.alert('失敗', '路線規劃異常，請確認網路連線');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 選擇交通方案：從 Google 拉完整 steps（含座標）供導航用 ───────────────
  const selectModeAndPreview = async (idx) => {
    const selected = transportOptions[idx];
    if (!selected?.isAvailable) return;

    setSelectedModeIdx(idx);
    setLoading(true);

    const loc  = stableLocationRef.current;
    const item = candidates[selectedIdx];

    try {
      let steps = [];

      if (selected.mode === 'youbike') {
        // YouBike：從後端拿站點座標，建三段 pseudoSteps
        const [rentSt, returnSt] = await Promise.all([
          getNearestYouBike(loc.latitude, loc.longitude, null, true),
          getNearestYouBike(item.latitude, item.longitude, null, false),
        ]);

        if (rentSt) {
          const rentName = rentSt.StationName.Zh_tw.replace('YouBike2.0_', '');
          steps.push({
            travel_mode:       'WALKING',
            html_instructions: `步行 ${Math.round(rentSt.dist)}m 到 ${rentName}（可借 ${rentSt.AvailableRentBikes} 台）`,
            end_location:      { lat: rentSt.StationPosition.PositionLat, lng: rentSt.StationPosition.PositionLon },
            duration:          { value: Math.round(rentSt.dist / 1.2) },
          });
        }
        if (rentSt && returnSt) {
          const returnName = returnSt.StationName.Zh_tw.replace('YouBike2.0_', '');
          const rideDist = getDistance(
            rentSt.StationPosition.PositionLat, rentSt.StationPosition.PositionLon,
            returnSt.StationPosition.PositionLat, returnSt.StationPosition.PositionLon,
          );
          steps.push({
            travel_mode:       'BICYCLING',
            html_instructions: `騎 YouBike 到 ${returnName}（可還 ${returnSt.AvailableReturnBikes} 格）`,
            end_location:      { lat: returnSt.StationPosition.PositionLat, lng: returnSt.StationPosition.PositionLon },
            duration:          { value: Math.round(rideDist / 3.33) },
          });
        }
        // 最後一段：還車站 → 目的地
        const fromLat = returnSt?.StationPosition.PositionLat ?? loc.latitude;
        const fromLng = returnSt?.StationPosition.PositionLon ?? loc.longitude;
        const lastDist = getDistance(fromLat, fromLng, item.latitude, item.longitude);
        steps.push({
          travel_mode:       'WALKING',
          html_instructions: `還車後步行 ${Math.round(returnSt?.dist ?? lastDist)}m 到目的地`,
          end_location:      { lat: item.latitude, lng: item.longitude },
          duration:          { value: Math.round((returnSt?.dist ?? lastDist) / 1.2) },
        });

      } else {
        // 步行 / 大眾運輸：Google Directions 拿完整 steps
        const googleMode  = selected.mode === 'transit' ? 'transit' : 'walking';
        const googleRoute = await fetchGoogleDirections(
          loc.latitude, loc.longitude, item.latitude, item.longitude, googleMode,
        );

        if (googleRoute) {
          steps = googleRoute.legs[0].steps;

          // 大眾運輸：額外補上 TDX 即時 ETA（後端優先）
          if (selected.mode === 'transit') {
            const firstTransit = steps.find(s => s.travel_mode === 'TRANSIT');
            if (firstTransit?.transit_details) {
              const det      = firstTransit.transit_details;
              const type     = det.line.vehicle.type;
              const lineName = det.line.short_name || det.line.name;
              const stopName = det.departure_stop.name;
              let walkSec = 0;
              for (const s of steps) {
                if (s.travel_mode === 'TRANSIT') break;
                walkSec += s.duration?.value ?? 0;
              }
              if (type === 'SUBWAY' || type === 'HEAVY_RAIL') {
                const etaSec = await getMrtETASec(null, stopName, walkSec);
                if (etaSec) selected.totalSec = etaSec + steps.slice(steps.indexOf(firstTransit)).reduce((a, s) => a + (s.duration?.value ?? 0), 0);
                selected.title = `捷運 ${stopName}`;
              } else if (type === 'BUS') {
                const busData = await getBusETASec(null, lineName, stopName, walkSec);
                if (busData?.estimateSec) {
                  selected.totalSec = busData.estimateSec + steps.slice(steps.indexOf(firstTransit)).reduce((a, s) => a + (s.duration?.value ?? 0), 0);
                }
                selected.title = `公車 ${lineName}`;
              }
              // 更新顯示
              setTransportOptions(prev => prev.map((o, i) => i === idx ? { ...o, ...selected } : o));
            }
          }
        } else {
          // Google 也沒有路線 → 用一個單步 fallback
          steps = [{
            travel_mode:       'WALKING',
            html_instructions: `前往 ${item.name}`,
            end_location:      { lat: item.latitude, lng: item.longitude },
            duration:          { value: selected.totalSec },
          }];
        }
      }

      setRouteSteps(steps);
      setViewMode('PREVIEW');
    } catch (e) {
      console.warn('[AR] 路線 steps 取得失敗', e.message);
      // 最後防線：單步直達
      setRouteSteps([{
        travel_mode:       'WALKING',
        html_instructions: `前往 ${item?.name ?? '目的地'}`,
        end_location:      { lat: item?.latitude ?? 0, lng: item?.longitude ?? 0 },
        duration:          { value: selected.totalSec },
      }]);
      setViewMode('PREVIEW');
    } finally {
      setLoading(false);
    }
  };

  // ── NAV 即時 ETA（後端優先）──────────────────────────────────────────────
  const fetchNavETA = async () => {
    lastFetchRef.current = Date.now();
    if (isFetchingEtaRef.current) return;
    const upcoming = routeSteps.slice(currentStepIdx).find(s => s.travel_mode === 'TRANSIT');
    if (!upcoming?.transit_details) return;
    isFetchingEtaRef.current = true;
    try {
      const det  = upcoming.transit_details;
      const line = det.line.short_name || det.line.name;
      const stop = det.departure_stop.name;
      if (det.line.vehicle.type === 'BUS') {
        const busData = await getBusETASec(null, line, stop, 0);
        if (busData) setRealTimeInfo({ type: 'bus', line, stop, etaSec: busData.estimateSec, plateNumb: busData.plateNumb });
      } else {
        const etaSec = await getMrtETASec(null, stop, 0);
        setRealTimeInfo({ type: 'mrt', line, stop, etaSec });
      }
    } finally {
      isFetchingEtaRef.current = false;
    }
  };

  // ── 追蹤已上車公車 ───────────────────────────────────────────────────────
  const trackBoardedBus = async () => {
    if (!boardedPlateNumb || !hasBoarded) return;
    lastFetchRef.current = Date.now();
    if (isFetchingEtaRef.current) return;
    isFetchingEtaRef.current = true;
    try {
      const upcoming = routeSteps[currentStepIdx];
      const line = upcoming?.transit_details?.line?.short_name || upcoming?.transit_details?.line?.name;
      const status = await getBusRealTimeStatus(null, line, boardedPlateNumb);
      if (status) {
        setBusCurrentStatus(`目前${status.status}：${status.currentStop}`);
        if (
          status.currentStop === upcoming.transit_details.arrival_stop.name &&
          status.status === '進站中' &&
          !hasShownAlightWarning
        ) {
          setAlightWarning(true);
          setHasShownAlightWarning(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } finally {
      isFetchingEtaRef.current = false;
    }
  };

  // ── ETA 倒數計時器：realTimeInfo 更新時重設 ──────────────────────────────
  useEffect(() => {
    if (etaIntervalRef.current) {
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = null;
    }
    if (realTimeInfo?.etaSec != null && !hasBoarded) {
      const fetchedAt = Date.now();
      const initial   = realTimeInfo.etaSec;
      setEtaDisplaySec(initial);
      etaIntervalRef.current = setInterval(() => {
        const elapsed    = Math.floor((Date.now() - fetchedAt) / 1000);
        const remaining  = Math.max(0, initial - elapsed);
        setEtaDisplaySec(remaining);
        if (remaining === 0) {
          clearInterval(etaIntervalRef.current);
          etaIntervalRef.current = null;
        }
      }, 1000);
    } else {
      setEtaDisplaySec(null);
    }
    return () => {
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    };
  }, [realTimeInfo?.etaSec, hasBoarded]);

  // ── 下車動作 ─────────────────────────────────────────────────────────────
  const handleAlight = () => {
    const nextIdx = currentStepIdx + 1;
    setAlightWarning(false);
    setHasShownAlightWarning(false);
    setHasBoarded(false);
    setBoardedPlateNumb(null);
    setBusCurrentStatus(null);
    setRealTimeInfo(null);
    if (nextIdx < routeSteps.length) setCurrentStepIdx(nextIdx);
    Haptics.selectionAsync();
  };

  // ── 查詢目的地 YouBike 還車位（不需前端 TDX token）─────────────────────
  const checkDestinationParking = async () => {
    if (!targetCoords || refreshingBike) return;
    setRefreshingBike(true);
    try {
      const endStation = await getNearestYouBike(targetCoords.latitude, targetCoords.longitude, null, false);
      if (endStation) {
        const name = endStation.StationName.Zh_tw.replace('YouBike2.0_', '');
        Alert.alert(
          '車位即時資訊',
          `目的地附近最優站點：\n${name}\n目前剩餘可還空位：${endStation.AvailableReturnBikes} 格`,
        );
      } else {
        Alert.alert('注意', '目的地 1km 內目前無車位可還，請提早規劃！');
      }
    } finally {
      setRefreshingBike(false);
    }
  };

  // ── NAV 步驟推進邏輯（turn-by-turn）────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'NAV' || !userLocation || !routeSteps.length) return;

    const step = routeSteps[currentStepIdx];

    // 所有步驟已完成
    if (!step) {
      setNavInstruction('已抵達目的地');
      setNavManeuverIcon('checkmark-circle-outline');
      setNavDistanceM(0);
      setNextManeuver(null);
      return;
    }

    const d = getDistance(
      userLocation.latitude, userLocation.longitude,
      step.end_location.lat, step.end_location.lng,
    );
    setNavDistanceM(Math.round(d));

    // ── 最後一步且距離 ≤ 10m → 已抵達 ────────────────────────────────────
    if (currentStepIdx === routeSteps.length - 1 && d <= 10) {
      if (!hasArrivedRef.current) {
        hasArrivedRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setNavInstruction('已抵達目的地');
      setNavManeuverIcon('checkmark-circle-outline');
      setNavDistanceM(0);
      setNextManeuver(null);
      return;
    }

    // ── 中間步驟距目標 < 25m → 自動推進 ─────────────────────────────────
    if (d < 25 && currentStepIdx < routeSteps.length - 1) {
      setCurrentStepIdx(c => c + 1);
      setRealTimeInfo(null);
      setHasBoarded(false);
      setAlightWarning(false);
      setHasShownAlightWarning(false);
      return;
    }

    // ── 下車提醒（乘車中且快到終點站）──────────────────────────────────
    if (step.travel_mode === 'TRANSIT' && hasBoarded && !hasShownAlightWarning && d < 500) {
      setAlightWarning(true);
      setHasShownAlightWarning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // ── 解析目前步驟指令 ─────────────────────────────────────────────────
    const { text, icon } = parseStep(step);
    setNavManeuverIcon(icon);

    if (step.travel_mode === 'TRANSIT') {
      // 大眾運輸：顯示路線名稱與下車站
      const det      = step.transit_details;
      const lineName = det?.line?.short_name || det?.line?.name || '';
      const arrStop  = det?.arrival_stop?.name || '目的地';
      const numStops = det?.num_stops || 0;
      setNavInstruction(
        lineName
          ? `搭乘 ${lineName} 路至「${arrStop}」下車，共 ${numStops} 站`
          : text,
      );
    } else {
      // WALKING / BICYCLING：直接用解析出的路段指令
      setNavInstruction(text);
    }

    // ── 下一步預告（150m 以內才顯示，避免畫面太早出現）────────────────
    const nextStep = routeSteps[currentStepIdx + 1];
    if (nextStep && d < 150) {
      const next = parseStep(nextStep);
      setNextManeuver({ text: next.text, icon: next.icon });
    } else {
      setNextManeuver(null);
    }

    // ── 大眾運輸即時 ETA 刷新（每 15s 一次）────────────────────────────
    if (
      transportOptions[selectedModeIdx]?.mode === 'transit' &&
      Date.now() - lastFetchRef.current > 15000
    ) {
      hasBoarded ? trackBoardedBus() : fetchNavETA();
    }
  }, [userLocation, currentStepIdx, viewMode, hasBoarded, alightWarning, hasShownAlightWarning]);

  // ── AR 指北針角度 ────────────────────────────────────────────────────────
  const arrowAngle = (() => {
    if (!userLocation || !targetCoords) return 0;
    const target = (viewMode === 'NAV' && routeSteps[currentStepIdx])
      ? { latitude: routeSteps[currentStepIdx].end_location.lat, longitude: routeSteps[currentStepIdx].end_location.lng }
      : targetCoords;
    return (getBearing(userLocation.latitude, userLocation.longitude, target.latitude, target.longitude) - heading + 360) % 360;
  })();

  // ── 全部重置 ─────────────────────────────────────────────────────────────
  const resetAll = () => {
    if (etaIntervalRef.current) { clearInterval(etaIntervalRef.current); etaIntervalRef.current = null; }
    setViewMode('SEARCH'); setCandidates([]); setSelectedIdx(null);
    setTargetCoords(null); setRouteSteps([]); setSelectedModeIdx(null);
    setTransportOptions([]); setRealTimeInfo(null); setCurrentStepIdx(0);
    setNavInstruction('計算路線中...'); setHasBoarded(false);
    setAlightWarning(false); setHasShownAlightWarning(false);
    setBoardedPlateNumb(null); setBusCurrentStatus(null); setShowQuickTools(false);
    setNavDistanceM(0); setNavManeuverIcon('arrow-up-outline');
    setNextManeuver(null); setEtaDisplaySec(null);
    hasArrivedRef.current = false;
  };

  return {
    permission, viewMode, setViewMode, loading,
    searchQuery, setSearchQuery, candidates, setCandidates,
    selectedIdx, setSelectedIdx, targetCoords, setTargetCoords,
    transportOptions, selectedModeIdx, routeSteps,
    currentStepIdx, setCurrentStepIdx, navInstruction,
    realTimeInfo, setRealTimeInfo, refreshingBike,
    performSearch, onSelectCandidate, selectModeAndPreview,
    checkDestinationParking, resetAll, arrowAngle,
    hasBoarded, setHasBoarded, alightWarning, setAlightWarning,
    boardedPlateNumb, setBoardedPlateNumb, busCurrentStatus,
    showQuickTools, setShowQuickTools,
    userLocation,          // 供 ArScreen 計算即時距離
    navDistanceM,          // 目前步驟剩餘距離（公尺）
    navManeuverIcon,       // Ionicons 圖示名稱
    nextManeuver,          // { text, icon } 下一步預告
    etaDisplaySec,         // 公車/捷運即時倒數（秒）
    handleAlight,          // 使用者按「已下車」
  };
};
