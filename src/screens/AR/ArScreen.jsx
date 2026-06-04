import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert, Linking, Animated,
  Modal, Image, KeyboardAvoidingView, Platform, BackHandler,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { apiPost, apiUpload } from '../../services/apiClient';

import { Fonts as _Fonts } from '../../constants/theme';
import { CATEGORY_MAP } from './constants/arData';
import { fmtSec, getDistance } from './utils/helpers';
import { usePAL } from '../../context/DimContext';

// 卡通配色（與其他頁面一致）
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

// 用 PAL 對映 T；改成函式，元件內依當前色票（亮 / 低明度）即時計算
const makeT = (P) => ({
  paper:  P.white,    paper2: P.yellow,
  card:   P.white,
  ink:    P.black,    ink2: 'rgba(0,0,0,0.7)',
  ink3:   'rgba(0,0,0,0.5)', ink4: 'rgba(0,0,0,0.35)',
  line:   'rgba(0,0,0,0.12)',
  accent: P.blue,
  cRed:   P.pink, cYellow: P.yellow, cBlue: P.blue,
  cGreen: P.blue, cPink: P.pink, cCyan: P.blue,
  indigo: P.blue, stamp: P.pink, tea: P.blue,
});
// 模組層 fallback（給檔內外面的少數參考使用，元件內會用動態 T 覆蓋）
const T = makeT(PAL);

// 把所有 serif/latin/mono 字體統一改為 sans 系（思源黑體）
const Fonts = {
  ..._Fonts,
  serif:        _Fonts.sans,
  serifBold:    _Fonts.sansBold,
  latin:        _Fonts.sans,
  latinMed:     _Fonts.sansBold,
  latinItalic:  _Fonts.sansMed,
  mono:         _Fonts.sansBold,
};
import { useArLogic } from './hooks/useArLogic';

// ── tag / mood → Ionicons 圖示對映（與 TripScreen 保持一致）──────────────────
const MOOD_ICON_MAP = {
  '☕': 'cafe-outline',   '🍵': 'cafe-outline',   '🧋': 'cafe-outline',
  '🍜': 'restaurant-outline', '🍣': 'restaurant-outline', '🍔': 'restaurant-outline',
  '🥘': 'restaurant-outline', '🍱': 'restaurant-outline', '🍝': 'restaurant-outline',
  '🍰': 'ice-cream-outline',  '🧁': 'ice-cream-outline',  '🍦': 'ice-cream-outline',
  '🍺': 'beer-outline',  '🍷': 'wine-outline',  '🥂': 'wine-outline', '🍸': 'wine-outline',
  '🌿': 'leaf-outline',  '🌳': 'leaf-outline',  '🌸': 'flower-outline',
  '📷': 'camera-outline', '📸': 'camera-outline',
  '🎨': 'color-palette-outline', '📚': 'book-outline', '📖': 'book-outline',
  '🛍': 'bag-handle-outline', '🛍️': 'bag-handle-outline',
  '🌙': 'moon-outline', '⭐': 'star-outline',
};
function getMoodIcon(tag = '', mood = '') {
  const t = (tag || '').toLowerCase();
  if (t.includes('咖啡') || t.includes('cafe'))              return 'cafe-outline';
  if (t.includes('散步') || t.includes('漫步') || t.includes('消化') || t.includes('公園')) return 'walk-outline';
  if (t.includes('拍照') || t.includes('攝影'))              return 'camera-outline';
  if (t.includes('甜點') || t.includes('蛋糕') || t.includes('冰'))   return 'ice-cream-outline';
  if (t.includes('飲料') || t.includes('手搖'))              return 'cafe-outline';
  if (t.includes('書'))                                      return 'book-outline';
  if (t.includes('選物') || t.includes('文創') || t.includes('禮') || t.includes('購物')) return 'bag-handle-outline';
  if (t.includes('宵夜') || t.includes('深夜') || t.includes('夜間')) return 'moon-outline';
  if (t.includes('酒') || t.includes('bar') || t.includes('居酒'))    return 'wine-outline';
  if (t.includes('博物') || t.includes('展覽') || t.includes('美術')) return 'business-outline';
  if (t.includes('美食') || t.includes('必吃') || t.includes('小吃') || t.includes('餐') || t.includes('吃')) return 'restaurant-outline';
  return MOOD_ICON_MAP[mood] || 'location-outline';
}

export default function ArScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  // 動態色票 — 隨低明度模式即時切換
  // eslint-disable-next-line no-unused-vars
  const C = usePAL();
  const T = React.useMemo(() => makeT(C), [C]);
  const styles = React.useMemo(() => makeStyles(T), [T]);
  const [isRecording, setIsRecording] = useState(false);
  const [camMode, setCamMode] = useState('picture');
  const [toast, setToast] = useState('');
  const [showTools, setShowTools] = useState(false);

  // ── 足跡儲存 modal ─────────────────────────────────────────────────────────
  const [saveModal, setSaveModal] = useState({ visible: false, photoUri: null });
  const [caption, setCaption] = useState('');
  const [savingSpot, setSavingSpot] = useState(false);

  // ── 箭頭動畫用的 Animated refs
  const arrowAnim    = useRef(new Animated.Value(0)).current;
  const lastAngleRef = useRef(0);

  // ── 行程模式 params ────────────────────────────────────────────────────────
  const arMode    = route?.params?.mode ?? 'search';          // 'search' | 'trip'
  const tripItems = route?.params?.tripItems ?? [];
  const tripTitle = route?.params?.tripTitle ?? '行程景點';
  const [showTripList, setShowTripList] = useState(
    arMode === 'trip' && tripItems.length > 0
  );

  const {
    permission, viewMode, setViewMode, loading,
    searchQuery, setSearchQuery, candidates, setCandidates, selectedIdx, setSelectedIdx,
    targetCoords, setTargetCoords, transportOptions, selectedModeIdx, routeSteps,
    currentStepIdx, setCurrentStepIdx, navInstruction, realTimeInfo, setRealTimeInfo,
    refreshingBike, performSearch, onSelectCandidate, selectModeAndPreview,
    checkDestinationParking, resetAll, arrowAngle, hasBoarded, setHasBoarded,
    alightWarning, setAlightWarning, boardedPlateNumb, setBoardedPlateNumb,
    busCurrentStatus, showQuickTools, setShowQuickTools,
    userLocation,
    navDistanceM, navManeuverIcon, nextManeuver, etaDisplaySec, handleAlight,
  } = useArLogic();

  // ── 即時距離計算
  const distToTarget = (() => {
    if (!userLocation || !targetCoords) return null;
    return Math.round(getDistance(
      userLocation.latitude, userLocation.longitude,
      targetCoords.latitude, targetCoords.longitude,
    ));
  })();

  // ── 箭頭旋轉 effect
  useEffect(() => {
    let diff = arrowAngle - ((lastAngleRef.current % 360) + 360) % 360;
    if (diff > 180)  diff -= 360;
    if (diff < -180) diff += 360;
    const next = lastAngleRef.current + diff;
    lastAngleRef.current = next;
    arrowAnim.setValue(next);
  }, [arrowAngle]);

  const arrowRotate = arrowAnim.interpolate({
    inputRange:  [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });


  // 🚀 =======================================================
  // 🚀 ======= 這區是我搬上來的 (原本在下面 160 行左右) =======
  // 🚀 =======================================================
  
  const handleBack = () => {
    if (viewMode === 'NAV') {
      resetAll();
      if (arMode === 'trip') setShowTripList(true);
    } else if (viewMode === 'PREVIEW') {
      setViewMode('DETAIL');
    } else if (viewMode === 'DETAIL') {
      setViewMode('SEARCH'); setSelectedIdx(null); setTargetCoords(null);
    } else if (viewMode === 'SEARCH' && candidates.length > 0) {
      setCandidates([]); setSearchQuery('');
    } else if (arMode === 'trip' && !showTripList) {
      // 從搜尋/空狀態返回行程列表
      setShowTripList(true);
      setCandidates([]); setSearchQuery('');
    } else {
      navigation?.goBack?.();
    }
  };

  // Android 硬體返回鍵
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackRef.current?.();
        return true;            // 告訴 Android：這個 back 我們吃掉了
      });
      return () => sub.remove();
    }, []),
  );

  // 🚀 =======================================================
  // 🚀 ======= 搬移結束，這樣 Hooks 就會安穩地在 return 前執行完 =======
  // 🚀 =======================================================


  // ⚠️ 這裡是你原本的 early return！因為我們把上面的東西搬到它前面了，所以 React 就不會報錯囉！
  if (!permission?.granted) {
    return (
      <View style={styles.permBox}>
        <Text style={styles.permIcon}>◎</Text>
        <Text style={styles.permText}>等待相機與定位授權</Text>
        <ActivityIndicator color={T.accent} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fmtCountdown = (sec) => {
    if (sec == null || sec < 0) return '--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}分 ${String(s).padStart(2, '0')}秒`;
    return `${s}秒`;
  };

  const handleSnap = async () => {
    if (!cameraRef.current) return;
    setCamMode('picture');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75, skipProcessing: false });
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      // 拍完後彈「儲存為足跡」modal
      setCaption('');
      setSaveModal({ visible: true, photoUri: photo.uri });
    } catch { showToast('拍照失敗'); }
  };

  // ── 儲存足跡 ──────────────────────────────────────────────────────────────
  const handleSaveSpot = async () => {
    if (savingSpot) return;
    setSavingSpot(true);
    try {
      let lat = 25.033, lon = 121.565; // fallback 台北
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) { console.warn('[Spot] location failed:', e); }

      let image_url = null;
      try {
        const form = new FormData();
        form.append('file', { uri: saveModal.photoUri, type: 'image/jpeg', name: 'spot.jpg' });
        const uploaded = await apiUpload('/uploads/image', form);
        image_url = uploaded.image_url;
      } catch (e) { console.warn('[Spot] upload failed:', e); }

      await apiPost('/spots/personal', {
        latitude: lat,
        longitude: lon,
        note: caption.trim() || '足跡',
        image_url,
        is_public: false,
      });

      setSaveModal({ visible: false, photoUri: null });
      showToast('足跡已記錄，地圖可見');
    } catch (e) {
      console.warn('[Spot] save failed:', e);
      setSaveModal({ visible: false, photoUri: null });
      showToast('已存入相簿');   // 至少相簿有存
    } finally {
      setSavingSpot(false);
    }
  };

  const toggleRecord = () => {
    if (!cameraRef.current) return;
    if (isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false); setCamMode('picture');
    } else {
      setCamMode('video'); setIsRecording(true);
      setTimeout(async () => {
        try {
          const video = await cameraRef.current.recordAsync({ mute: true });
          if (video?.uri) { await MediaLibrary.saveToLibraryAsync(video.uri); showToast('影片已存入相簿'); }
        } catch { setIsRecording(false); showToast('錄影失敗'); }
      }, 500);
    }
  };

  // 結束導覽：trip 模式回行程列表，search 模式重置
  const handleEndNav = () => {
    resetAll();
    if (arMode === 'trip') setShowTripList(true);
  };

  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} mode={camMode} style={StyleSheet.absoluteFillObject} facing="back" />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.circleBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color={T.ink} />
        </TouchableOpacity>

        {viewMode === 'SEARCH' && !showTripList ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="要去哪裡？"
              placeholderTextColor={T.ink3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => performSearch(searchQuery)}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchGoBtn} onPress={() => performSearch(searchQuery)}>
              <Ionicons name="search" size={17} color={T.paper} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topTitleRow}>
            <View style={[styles.dot, {
              backgroundColor: viewMode === 'NAV' ? T.moss : showTripList ? T.accent : T.accent,
            }]} />
            <Text style={styles.topTitle} numberOfLines={1}>
              {showTripList
                ? tripTitle
                : viewMode === 'NAV' ? (candidates[selectedIdx]?.name ?? '導航中')
                : viewMode === 'PREVIEW' ? '確認路線'
                : candidates[selectedIdx]?.name}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.circleBtn} onPress={() => setShowQuickTools(v => !v)}>
          <Ionicons name="shield-outline" size={18} color={T.ink} />
        </TouchableOpacity>
      </View>

      {/* ── Toast ── */}
      {toast !== '' && (
        <View style={[styles.toast, { top: insets.top + 64 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── Recording badge ── */}
      {isRecording && (
        <View style={[styles.recordBadge, { top: insets.top + 64 }]}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>錄影中</Text>
        </View>
      )}

      {/* ── Quick tools panel ── */}
      {showQuickTools && (
        <View style={styles.quickPanel}>
          {[
            { label: '110', icon: 'call', color: '#FF3B30', onPress: () => Alert.alert('🚨 緊急報案', '確定要撥打 110？', [{ text: '取消', style: 'cancel' }, { text: '確定', style: 'destructive', onPress: () => Linking.openURL('tel:110') }]) },
            { label: isRecording ? '停止' : '錄影', icon: isRecording ? 'stop' : 'videocam', color: isRecording ? '#FF3B30' : '#FF9500', onPress: toggleRecord },
            { label: '拍照', icon: 'camera', color: T.moss, onPress: handleSnap },
          ].map(({ label, icon, color, onPress }) => (
            <TouchableOpacity key={label} style={styles.toolItem} onPress={onPress}>
              <View style={[styles.toolCircle, { borderColor: color }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={styles.toolLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowQuickTools(false)} style={{ marginTop: 4 }}>
            <Ionicons name="close" size={22} color={T.ink3} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Alight warning ── */}
      {viewMode === 'NAV' && alightWarning && (
        <View style={[styles.alightCard, { top: insets.top + 64 }]}>
          <Ionicons name="notifications" size={22} color={T.paper} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alightTitle}>即將到站</Text>
            <Text style={styles.alightDesc}>記得按下車鈴 / 準備下車！</Text>
          </View>
          <TouchableOpacity onPress={() => setAlightWarning(false)}>
            <Ionicons name="close" size={20} color={T.ink2} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── AR compass arrow ── */}
      <View style={styles.arArea} pointerEvents="none">
        {targetCoords && (
          <Animated.View style={[styles.arCompass, { transform: [{ rotate: arrowRotate }] }]}>
            <View style={styles.arCompassInner}>
              {/* navigate icon 原本朝右上 45°，補 -45° 讓它朝正上方，
                  外層 Animated.View 再依 arrowAngle 轉到正確方向 */}
              <Ionicons name="navigate" size={100} color={T.paper} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </Animated.View>
        )}
      </View>

      {/* ── 距離卡 overlay（DETAIL / PREVIEW / NAV 且有目標時顯示）── */}
      {distToTarget !== null && !showTripList && viewMode !== 'SEARCH' && (
        <View style={styles.distCard} pointerEvents="none">
          {/* 距離 */}
          <View style={styles.distCell}>
            <Text style={styles.distVal}>
              {distToTarget < 1000
                ? `${distToTarget} m`
                : `${(distToTarget / 1000).toFixed(1)} km`}
            </Text>
            <Text style={styles.distLab}>直線距離</Text>
          </View>

          <View style={styles.distDivider} />

          {/* 預計時間 */}
          <View style={styles.distCell}>
            <Text style={styles.distVal}>
              {selectedModeIdx != null && transportOptions[selectedModeIdx]
                ? fmtSec(transportOptions[selectedModeIdx].totalSec)
                : fmtSec(Math.round(distToTarget / 1.2))}
            </Text>
            <Text style={styles.distLab}>
              {selectedModeIdx != null && transportOptions[selectedModeIdx]
                ? transportOptions[selectedModeIdx].title
                : '步行預估'}
            </Text>
          </View>
        </View>
      )}

      {/* ── Bottom panel ── */}
      <View style={[styles.panel, { paddingBottom: bottomPad + 4 }]}>

        {/* ── TRIP_LIST：行程景點清單 ─────────────────────────────────────── */}
        {showTripList && (
          <View>
            <View style={styles.tripListHeader}>
              <Text style={styles.tripListLabel}>ITINERARY · 行程景點</Text>
              <TouchableOpacity
                style={styles.tripSearchBtn}
                onPress={() => { setShowTripList(false); }}
              >
                <Ionicons name="search" size={13} color={T.ink2} />
                <Text style={styles.tripSearchBtnText}>自行搜尋</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tripItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.tripItemRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowTripList(false);
                    performSearch(item.name);
                  }}
                >
                  <View style={styles.tripItemMoodBox}>
                    <Ionicons name={getMoodIcon(item.tag, item.mood)} size={16} color={T.ink2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripItemName}>{item.name}</Text>
                    <Text style={styles.tripItemMeta}>{item.time}  ·  {item.dur}</Text>
                  </View>
                  <View style={styles.tripNavArrow}>
                    <Ionicons name="navigate-outline" size={16} color={T.paper} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* SEARCH: category chips or results */}
        {viewMode === 'SEARCH' && !showTripList && (
          candidates.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {candidates.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.resultRow} onPress={() => onSelectCandidate(idx)}>
                  <View style={styles.resultLeft}>
                    <View style={[styles.dot, { backgroundColor: T.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      {item.rating != null && (
                        <Text style={styles.resultMeta}>{'★'.repeat(Math.round(item.rating))}  {item.rating}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.resultDist}>
                      {item.dist < 1000 ? `${item.dist}m` : `${(item.dist / 1000).toFixed(1)}km`}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={T.ink3} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : !loading ? (
            <View style={{ gap: 12 }}>
              {/* 行程模式：顯示「返回行程列表」的提示 */}
              {arMode === 'trip' && (
                <TouchableOpacity
                  style={styles.backToTripBtn}
                  onPress={() => setShowTripList(true)}
                >
                  <Ionicons name="list-outline" size={15} color={T.ink2} />
                  <Text style={styles.backToTripText}>返回行程景點列表</Text>
                </TouchableOpacity>
              )}
              <View style={styles.catChips}>
                {Object.keys(CATEGORY_MAP).map(cat => (
                  <TouchableOpacity key={cat} style={styles.catChip} onPress={() => performSearch(cat)}>
                    <Ionicons name={CATEGORY_MAP[cat].icon} size={13} color={T.paper} />
                    <Text style={styles.catChipText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>搜尋地名或選擇上方類別</Text>
            </View>
          ) : null
        )}

        {/* DETAIL: transport mode selection */}
        {viewMode === 'DETAIL' && selectedIdx != null && (
          <View>
            <Text style={styles.panelLabel}>選擇交通方案</Text>
            {transportOptions.length > 0 ? (
              <View style={styles.modeRow}>
                {transportOptions.map((opt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.modeBtn, !opt.isAvailable && styles.modeBtnOff]}
                    onPress={() => opt.isAvailable ? selectModeAndPreview(idx) : Alert.alert('此方案無法使用', opt.reason)}
                    activeOpacity={opt.isAvailable ? 0.75 : 1}
                  >
                    <Ionicons name={opt.icon} size={26} color={opt.isAvailable ? T.paper : T.ink3} />
                    <Text style={[styles.modeBtnTitle, !opt.isAvailable && { color: T.ink3 }]} numberOfLines={1}>
                      {opt.title}
                    </Text>
                    <Text style={[styles.modeBtnTime, !opt.isAvailable && { color: T.ink3 }]}>
                      {opt.isAvailable ? fmtSec(opt.totalSec) : '不可用'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ActivityIndicator color={T.accent} style={{ marginVertical: 20 }} />
            )}
          </View>
        )}

        {/* PREVIEW: step list + start button */}
        {viewMode === 'PREVIEW' && selectedModeIdx != null && transportOptions[selectedModeIdx] && (
          <View style={{ maxHeight: 260 }}>
            <View style={styles.previewHeader}>
              <Ionicons name={transportOptions[selectedModeIdx].icon} size={22} color={T.ink} />
              <Text style={styles.previewTime}>總計 {fmtSec(transportOptions[selectedModeIdx].totalSec)}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {routeSteps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.dot, { backgroundColor: T.accent, marginTop: 6 }]} />
                  <Text style={styles.stepText}>{s.html_instructions.replace(/<[^>]*>?/gm, '')}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => { setCurrentStepIdx(0); setRealTimeInfo(null); setViewMode('NAV'); }}
            >
              <Ionicons name="navigate" size={17} color={T.paper} />
              <Text style={styles.startBtnText}>開始導覽</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NAV: live turn-by-turn instruction */}
        {viewMode === 'NAV' && (
          <View>
            {/* ── Main nav instruction box ── */}
            <View style={styles.navBox}>
              {navInstruction === '已抵達目的地' ? (
                /* Arrived state */
                <View style={styles.arrivedRow}>
                  <Ionicons name="checkmark-circle" size={34} color={T.moss} />
                  <Text style={styles.arrivedText}>已抵達目的地</Text>
                </View>
              ) : (
                /* Turn-by-turn row: icon + instruction + distance */
                <View style={styles.navMainRow}>
                  <View style={styles.navManeuverBox}>
                    <Ionicons name={navManeuverIcon} size={24} color={T.paper} />
                  </View>
                  <Text style={styles.navInstr} numberOfLines={2}>{navInstruction}</Text>
                  <Text style={styles.navDist}>
                    {navDistanceM >= 1000
                      ? `${(navDistanceM / 1000).toFixed(1)}km`
                      : `${navDistanceM}m`}
                  </Text>
                </View>
              )}

              {/* Next maneuver preview（出現在 150m 以內） */}
              {nextManeuver && navInstruction !== '已抵達目的地' && (
                <View style={styles.nextManeuverRow}>
                  <Ionicons name="return-down-forward-outline" size={12} color={T.ink3} />
                  <Ionicons name={nextManeuver.icon} size={12} color={T.ink2} />
                  <Text style={styles.nextManeuverText} numberOfLines={1}>
                    接著：{nextManeuver.text}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Transit boarding / alighting ── */}
            {transportOptions[selectedModeIdx]?.mode === 'transit' &&
              routeSteps[currentStepIdx]?.travel_mode === 'TRANSIT' && (
              <View style={styles.boardRow}>
                {!hasBoarded ? (
                  <TouchableOpacity
                    style={styles.boardBtn}
                    onPress={() => {
                      setHasBoarded(true);
                      if (realTimeInfo?.plateNumb) setBoardedPlateNumb(realTimeInfo.plateNumb);
                    }}
                  >
                    <Ionicons name="enter-outline" size={19} color={T.paper} />
                    <Text style={styles.boardBtnText}>已上車</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <View style={styles.boardedBox}>
                      <View style={styles.boardedRow}>
                        <Ionicons name="bus" size={15} color={T.moss} />
                        <Text style={styles.boardedText}>
                          乘車中 · {routeSteps[currentStepIdx]?.transit_details?.num_stops || 0} 站
                        </Text>
                      </View>
                      {busCurrentStatus && <Text style={styles.busStatus}>{busCurrentStatus}</Text>}
                    </View>
                    {/* 已下車按鈕：到站前才顯示 */}
                    {alightWarning && (
                      <TouchableOpacity style={styles.alightBtn} onPress={handleAlight}>
                        <Ionicons name="exit-outline" size={19} color={T.paper} />
                        <Text style={styles.alightBtnText}>已下車</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── Real-time ETA card with live countdown ── */}
            {realTimeInfo && transportOptions[selectedModeIdx]?.mode === 'transit' && !hasBoarded && (
              <View style={styles.etaCard}>
                <View style={styles.etaLeft}>
                  <View style={styles.etaIcon}>
                    <Ionicons
                      name={realTimeInfo.type === 'bus' ? 'bus-outline' : 'subway-outline'}
                      size={18} color={T.paper}
                    />
                  </View>
                  <View>
                    <Text style={styles.etaLine}>
                      {realTimeInfo.type === 'bus' ? `公車 ${realTimeInfo.line}` : '捷運'}
                    </Text>
                    <Text style={styles.etaStop}>{realTimeInfo.stop}</Text>
                  </View>
                </View>
                <View style={styles.etaBadge}>
                  <Text style={styles.etaBadgeText}>
                    {etaDisplaySec != null
                      ? fmtCountdown(etaDisplaySec)
                      : fmtSec(realTimeInfo.etaSec)}
                  </Text>
                </View>
              </View>
            )}

            {/* ── YouBike parking refresh ── */}
            {transportOptions[selectedModeIdx]?.mode === 'youbike' && (
              <TouchableOpacity
                style={styles.bikeRefreshBtn}
                onPress={checkDestinationParking}
                disabled={refreshingBike}
              >
                {refreshingBike
                  ? <ActivityIndicator size="small" color={T.ink} />
                  : <Ionicons name="refresh-circle-outline" size={18} color={T.ink} />}
                <Text style={styles.bikeRefreshText}>
                  {refreshingBike ? '查詢中…' : '更新目的地車位'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.endBtn} onPress={handleEndNav}>
              <Text style={styles.endBtnText}>
                {arMode === 'trip' ? '返回行程列表' : '結束導覽'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={styles.loadingText}>運算中…</Text>
        </View>
      )}

      {/* ── 儲存足跡 Modal ── */}
      <Modal
        visible={saveModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => !savingSpot && setSaveModal({ visible: false, photoUri: null })}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !savingSpot && setSaveModal({ visible: false, photoUri: null })}
          >
            <View
              style={[styles.modalSheet, { paddingBottom: bottomPad + 16 }]}
              onStartShouldSetResponder={() => true}
            >
              {/* handle bar */}
              <View style={styles.modalHandle} />

              {/* 標題 */}
              <Text style={styles.modalTitle}>儲存為足跡？</Text>
              <Text style={styles.modalSub}>照片已存入相簿，也可標記到你的足跡地圖</Text>

              {/* 縮圖預覽 */}
              {saveModal.photoUri && (
                <Image
                  source={{ uri: saveModal.photoUri }}
                  style={styles.thumbPreview}
                  resizeMode="cover"
                />
              )}

              {/* 備注輸入 */}
              <TextInput
                style={styles.captionInput}
                placeholder="寫下這一刻…"
                placeholderTextColor={T.ink3}
                value={caption}
                onChangeText={setCaption}
                maxLength={100}
                multiline
              />

              {/* 儲存按鈕 */}
              <TouchableOpacity
                style={[styles.saveSpotBtn, savingSpot && { opacity: 0.6 }]}
                onPress={handleSaveSpot}
                disabled={savingSpot}
              >
                {savingSpot ? (
                  <ActivityIndicator color={T.paper} size="small" />
                ) : (
                  <>
                    <Ionicons name="location" size={16} color={T.paper} />
                    <Text style={styles.saveSpotBtnText}>標記到足跡地圖</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* 略過 */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  setSaveModal({ visible: false, photoUri: null });
                  showToast('已存入相簿');
                }}
                disabled={savingSpot}
              >
                <Text style={styles.skipText}>略過，只存相簿</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const CREAM  = 'rgba(245,239,227,0.93)';
const CREAM2 = 'rgba(245,239,227,0.82)';

// styles 改成 factory 函式，接受當前 T → 元件內 useMemo 即時建立
const makeStyles = (T) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  permBox: { flex: 1, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center', gap: 12 },
  permIcon: { fontSize: 48, color: T.ink3 },
  permText: { fontFamily: Fonts.serif, fontSize: 16, color: T.ink2 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: CREAM,
    borderBottomWidth: 1, borderBottomColor: 'rgba(221,213,200,0.6)',
  },
  circleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.paper2, borderWidth: 1, borderColor: T.line,
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: { flex: 1, flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, height: 38, borderRadius: 12,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
    paddingHorizontal: 13, paddingVertical: 0,
    fontFamily: Fonts.serif, fontSize: 13, color: T.ink,
    textAlignVertical: 'center',   // Android 文字垂直置中
    includeFontPadding: false,     // 去除 Android 自訂字型額外間距
  },
  searchGoBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center',
  },
  topTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontFamily: Fonts.serifBold, fontSize: 15, color: T.ink, flex: 1 },

  // Toast / badges
  toast: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(28,26,23,0.82)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10, zIndex: 300,
  },
  toastText: { fontFamily: Fonts.serif, fontSize: 13, color: T.paper },
  recordBadge: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(200,90,59,0.9)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 200,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.paper },
  recText: { fontFamily: Fonts.serifBold, fontSize: 13, color: T.paper },

  // Quick tools
  quickPanel: {
    position: 'absolute', right: 16, top: '30%',
    backgroundColor: CREAM,
    borderRadius: 24, padding: 16, gap: 20,
    alignItems: 'center', zIndex: 201,
    borderWidth: 1, borderColor: T.line,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  toolItem: { alignItems: 'center', gap: 6 },
  toolCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(245,239,227,0.9)',
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  toolLabel: { fontFamily: Fonts.serif, fontSize: 11, color: T.ink2 },

  // Alight warning
  alightCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: T.accent, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    zIndex: 200,
  },
  alightTitle: { fontFamily: Fonts.serifBold, fontSize: 16, color: T.paper },
  alightDesc: { fontFamily: Fonts.serif, fontSize: 12, color: 'rgba(245,239,227,0.85)', marginTop: 2 },

  // AR compass
  arArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 180 },
  arCompass: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  arCompassInner: {
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: 'rgba(200,90,59,0.25)',
    borderWidth: 2, borderColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom panel
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: CREAM,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: T.line,
    paddingHorizontal: 20, paddingTop: 18,
    maxHeight: '62%',
  },

  // Search results
  dot: { width: 8, height: 8, borderRadius: 4 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { fontFamily: Fonts.serif, fontSize: 14, color: T.ink },
  resultMeta: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, marginTop: 2 },
  resultDist: { fontFamily: Fonts.mono, fontSize: 12, color: T.moss },

  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: T.ink,
  },
  catChipText: { fontFamily: Fonts.serif, fontSize: 13, color: T.paper },
  hint: { fontFamily: Fonts.serif, fontSize: 12, color: T.ink3, textAlign: 'center' },
  panelLabel: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, letterSpacing: 2.5, marginBottom: 10 },

  // Mode buttons
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    borderRadius: 14, gap: 5, backgroundColor: T.ink,
  },
  modeBtnOff: { backgroundColor: T.paper2, borderWidth: 1, borderColor: T.line },
  modeBtnTitle: { fontFamily: Fonts.serifBold, fontSize: 12, color: T.paper },
  modeBtnTime: { fontFamily: Fonts.latin, fontSize: 14, color: T.paper },

  // Preview
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  previewTime: { fontFamily: Fonts.latin, fontSize: 18, fontWeight: '500', color: T.ink },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepText: { fontFamily: Fonts.serif, fontSize: 14, color: T.ink, flex: 1, lineHeight: 20 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.ink, borderRadius: 100, paddingVertical: 14, marginTop: 12,
  },
  startBtnText: { fontFamily: Fonts.serifBold, fontSize: 15, color: T.paper, letterSpacing: 1 },

  // Navigation
  navBox: {
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line,
    padding: 14, marginBottom: 12,
  },
  // 指令列：轉向圖示 + 文字 + 距離
  navMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navManeuverBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  navInstr: {
    fontFamily: Fonts.serif, fontSize: 14, color: T.ink, lineHeight: 21,
    flex: 1,
  },
  navDist: {
    fontFamily: Fonts.latin, fontSize: 17, fontWeight: '600', color: T.accent,
    minWidth: 48, textAlign: 'right', flexShrink: 0,
  },
  // 下一步預告（150m 以內才出現）
  nextManeuverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 9, paddingTop: 9,
    borderTopWidth: 1, borderTopColor: T.line,
  },
  nextManeuverText: {
    fontFamily: Fonts.serif, fontSize: 12, color: T.ink3, flex: 1,
  },
  // 已抵達
  arrivedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrivedText: { fontFamily: Fonts.serifBold, fontSize: 18, color: T.moss },

  boardRow: { marginBottom: 12 },
  boardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.ink, borderRadius: 100, paddingVertical: 13,
  },
  boardBtnText: { fontFamily: Fonts.serifBold, fontSize: 15, color: T.paper },
  boardedBox: {
    backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.line,
    padding: 12,
  },
  boardedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardedText: { fontFamily: Fonts.serif, fontSize: 14, color: T.moss },
  busStatus: { fontFamily: Fonts.mono, fontSize: 11, color: T.ink3, marginTop: 4 },
  // 已下車按鈕（到站警告時顯示）
  alightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.accent, borderRadius: 100, paddingVertical: 12, marginTop: 10,
  },
  alightBtnText: { fontFamily: Fonts.serifBold, fontSize: 15, color: T.paper },

  etaCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.line,
    padding: 12, marginBottom: 12,
  },
  etaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etaIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center',
  },
  etaLine: { fontFamily: Fonts.serifBold, fontSize: 13, color: T.ink },
  etaStop: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, marginTop: 2 },
  etaBadge: {
    backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100,
  },
  etaBadgeText: { fontFamily: Fonts.serifBold, fontSize: 14, color: T.paper },

  bikeRefreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.paper2, borderRadius: 100,
    paddingVertical: 11, marginBottom: 10,
    borderWidth: 1, borderColor: T.line,
  },
  bikeRefreshText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink },
  endBtn: {
    paddingVertical: 11, borderRadius: 100,
    alignItems: 'center', borderWidth: 1, borderColor: T.line,
  },
  endBtnText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink2 },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,239,227,0.82)',
    alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  loadingText: { fontFamily: Fonts.serif, fontSize: 14, color: T.ink, marginTop: 12 },

  // ── Trip list panel ────────────────────────────────────────────────────────
  tripListHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripListLabel: {
    fontFamily: Fonts.mono, fontSize: 10, color: T.ink3, letterSpacing: 2.5,
  },
  tripSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1, borderColor: T.line,
    backgroundColor: T.paper2,
  },
  tripSearchBtnText: { fontFamily: Fonts.serif, fontSize: 12, color: T.ink2 },

  tripItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  tripItemMoodBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.paper2, borderWidth: 1, borderColor: T.line,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tripItemName: { fontFamily: Fonts.serifBold, fontSize: 14, color: T.ink, marginBottom: 2 },
  tripItemMeta: { fontFamily: Fonts.mono, fontSize: 10, color: T.ink3 },
  tripNavArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // ── 距離卡 ────────────────────────────────────────────────────────────────
  distCard: {
    position: 'absolute',
    bottom: 220,           // 底部面板上方一些空間
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,239,227,0.92)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(221,213,200,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 80,
  },
  distCell:    { alignItems: 'center', minWidth: 70 },
  distVal:     { fontFamily: Fonts.latin, fontSize: 20, fontWeight: '500', color: T.ink },
  distLab:     { fontFamily: Fonts.mono, fontSize: 9, color: T.ink3, letterSpacing: 1.5, marginTop: 2 },
  distDivider: { width: 1, height: 28, backgroundColor: T.line },

  // ── 足跡 modal ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: T.line,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.line, alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: {
    fontFamily: Fonts.serifBold, fontSize: 18, color: T.ink, marginBottom: 4,
  },
  modalSub: {
    fontFamily: Fonts.serif, fontSize: 13, color: T.ink3, marginBottom: 14,
  },
  thumbPreview: {
    width: '100%', height: 140, borderRadius: 14, marginBottom: 14,
  },
  captionInput: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: Fonts.serif, fontSize: 14, color: T.ink,
    marginBottom: 14, minHeight: 48,
  },
  saveSpotBtn: {
    backgroundColor: T.ink, borderRadius: 100, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 10,
  },
  saveSpotBtnText: {
    fontFamily: Fonts.serifBold, fontSize: 15, color: T.paper, letterSpacing: 0.5,
  },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink3 },

  // Back-to-trip button (shown in search empty state)
  backToTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 100, borderWidth: 1, borderColor: T.line,
    backgroundColor: T.paper2, alignSelf: 'flex-start',
  },
  backToTripText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink2 },
});