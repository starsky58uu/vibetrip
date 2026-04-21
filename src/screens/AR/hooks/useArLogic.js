import { useState, useEffect, useRef } from 'react';
import { Keyboard, Alert } from 'react-native';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';

import { CATEGORY_MAP } from '../constants/arData';
import { fetchWithTimeout, getShortestAngle, getDistance, fmtSec, getBearing } from '../utils/helpers';
import { getTdxToken, getBusETASec, getMrtETASec, getNearestYouBike, getBusRealTimeStatus, searchPlaces } from '../services/transportApi';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY?.trim();

export const useArLogic = () => {
  const [permission, requestPermission] = useCameraPermissions();
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
  
  const [currentStepIdx, setCurrentStepIdx]   = useState(0);
  const [navInstruction, setNavInstruction]   = useState('計算路線中...');
  const [realTimeInfo, setRealTimeInfo]       = useState(null);
  const [refreshingBike, setRefreshingBike]   = useState(false);

  const [hasBoarded, setHasBoarded] = useState(false);
  const [alightWarning, setAlightWarning] = useState(false);
  const [hasShownAlightWarning, setHasShownAlightWarning] = useState(false);
  const [boardedPlateNumb, setBoardedPlateNumb] = useState(null);
  const [busCurrentStatus, setBusCurrentStatus] = useState(null);

  const [showQuickTools, setShowQuickTools] = useState(false);

  const stableLocationRef = useRef(null);
  const lastFetchRef      = useRef(0);
  const isFetchingEtaRef  = useRef(false);

  useEffect(() => {
    let headingSub = null;
    let locationSub = null;

    (async () => {
      const [{ status: cam }, { status: loc }] = await Promise.all([
        requestPermission(),
        Location.requestForegroundPermissionsAsync()
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
          return ((prev + diff * 0.15) + 360) % 360;         
        });
      });

      locationSub = await Location.watchPositionAsync({ 
        accuracy: Location.Accuracy.BestForNavigation, 
        distanceInterval: 2 
      }, l => {
        stableLocationRef.current = l.coords; 
        setUserLocation(l.coords);
      });
    })();

    return () => {
      if (headingSub) headingSub.remove();
      if (locationSub) locationSub.remove();
    };
  }, []);

  const performSearch = async (category) => {
    const loc = stableLocationRef.current;
    if (!loc) { Alert.alert('', '正在取得定位，請稍候'); return; }
    Keyboard.dismiss();
    setLoading(true); setCandidates([]); setTransportOptions([]);
    try {
      const results = await searchPlaces(category, loc.latitude, loc.longitude);
      setCandidates(results.slice(0, 6));
    } catch { Alert.alert('連線失敗', '請檢查網路狀態'); }
    finally { setLoading(false); }
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
        if (!token) {
          console.warn('無法取得 TDX Token，YouBike 功能將無法使用');
          return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '系統連線異常' };
        }
        const startStation = await getNearestYouBike(loc.latitude, loc.longitude, token, true);
        if (!startStation) {
          console.warn('附近 1km 內無車可借');
          return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '附近 1km 內無車可借' };
        }

        const endStation = await getNearestYouBike(item.latitude, item.longitude, token, false);
        if (!endStation) {
          console.warn('目的地 1km 內無位可還');
          return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '目的地 1km 內無位可還' };
        }

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
        youbikePromise().catch((err) => {
          console.error('YouBike 規劃失敗:', err);
          return { mode: 'youbike', title: 'YouBike', icon: 'bicycle-outline', isAvailable: false, reason: '規劃失敗' };
        })
      ]);

      const orderKeys = ['transit', 'youbike', 'walking'];
      const finalOrder = [];
      orderKeys.forEach(key => {
        const match = results.find(r => r.mode === key);
        if (match) finalOrder.push(match);
      });

      setTransportOptions(finalOrder);
    } catch (err) { Alert.alert('失敗', '規劃異常'); } finally { setLoading(false); }
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
      const det = upcoming.transit_details;
      const line = det.line.short_name || det.line.name;
      const stop = det.departure_stop.name;
      if (det.line.vehicle.type === 'BUS') {
        const busData = await getBusETASec(token, line, stop, 0);
        if (busData) setRealTimeInfo({ type: 'bus', line, stop, etaSec: busData.estimateSec, plateNumb: busData.plateNumb });
      } else {
        const etaSec = await getMrtETASec(token, stop, 0);
        setRealTimeInfo({ type: 'mrt', line, stop, etaSec });
      }
    } finally { isFetchingEtaRef.current = false; }
  };

  const trackBoardedBus = async () => {
    if (!boardedPlateNumb || !hasBoarded) return;
    lastFetchRef.current = Date.now();
    if (isFetchingEtaRef.current) return;
    isFetchingEtaRef.current = true;
    try {
      const token = await getTdxToken();
      const upcoming = routeSteps[currentStepIdx];
      const line = upcoming?.transit_details?.line?.short_name || upcoming?.transit_details?.line?.name;
      const status = await getBusRealTimeStatus(token, line, boardedPlateNumb);
      if (status) {
        setBusCurrentStatus(`目前${status.status}：${status.currentStop}`);
        if (status.currentStop === upcoming.transit_details.arrival_stop.name && status.status === '進站中' && !hasShownAlightWarning) {
          setAlightWarning(true); setHasShownAlightWarning(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
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
    if (currentStepIdx === routeSteps.length - 1 && d <= 30) {
      setNavInstruction('已抵達目的地 🏁'); return;
    }
    if (d < 40 && currentStepIdx < routeSteps.length - 1) {
      setCurrentStepIdx(c => c + 1); setRealTimeInfo(null); setHasBoarded(false); setAlightWarning(false); setHasShownAlightWarning(false);
      return;
    }
    if (step.travel_mode === 'TRANSIT' && hasBoarded && !hasShownAlightWarning && d < 500) {
      setAlightWarning(true); setHasShownAlightWarning(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setNavInstruction(`${step.html_instructions.replace(/<[^>]*>?/gm, '')} · 剩 ${d < 1000 ? `${d}m` : `${(d/1000).toFixed(1)}km`}`);
    if (transportOptions[selectedModeIdx]?.mode === 'transit' && (Date.now() - lastFetchRef.current > 15000)) {
      hasBoarded ? trackBoardedBus() : fetchNavETA();
    }
  }, [userLocation, currentStepIdx, viewMode, hasBoarded, alightWarning, hasShownAlightWarning]);

  const arrowAngle = (() => {
    if (!userLocation || !targetCoords) return 0;
    const target = (viewMode === 'NAV' && routeSteps[currentStepIdx]) ? { latitude: routeSteps[currentStepIdx].end_location.lat, longitude: routeSteps[currentStepIdx].end_location.lng } : targetCoords;
    return (getBearing(userLocation.latitude, userLocation.longitude, target.latitude, target.longitude) - heading + 360) % 360;
  })();

  const resetAll = () => {
    setViewMode('SEARCH'); setCandidates([]); setSelectedIdx(null); setTargetCoords(null); setRouteSteps([]); setSelectedModeIdx(null); setTransportOptions([]); setRealTimeInfo(null); setCurrentStepIdx(0); setNavInstruction('計算路線中...'); setHasBoarded(false); setAlightWarning(false); setHasShownAlightWarning(false); setBoardedPlateNumb(null); setBusCurrentStatus(null); setShowQuickTools(false);
  };

  return { permission, viewMode, setViewMode, loading, searchQuery, setSearchQuery, candidates, setCandidates, selectedIdx, setSelectedIdx, targetCoords, setTargetCoords, transportOptions, selectedModeIdx, routeSteps, currentStepIdx, setCurrentStepIdx, navInstruction, realTimeInfo, setRealTimeInfo, refreshingBike, performSearch, onSelectCandidate, selectModeAndPreview, checkDestinationParking, resetAll, arrowAngle, hasBoarded, setHasBoarded, alightWarning, setAlightWarning, boardedPlateNumb, setBoardedPlateNumb, busCurrentStatus, showQuickTools, setShowQuickTools };
};