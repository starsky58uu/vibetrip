import React, { useRef, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert, Linking,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';

import { T, Fonts } from '../../constants/theme';
import { CATEGORY_MAP } from './constants/arData';
import { fmtSec } from './utils/helpers';
import { useArLogic } from './hooks/useArLogic';

export default function ArScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [camMode, setCamMode] = useState('picture');
  const [toast, setToast] = useState('');
  const [showTools, setShowTools] = useState(false);

  const {
    permission, viewMode, setViewMode, loading,
    searchQuery, setSearchQuery, candidates, setCandidates, selectedIdx, setSelectedIdx,
    targetCoords, setTargetCoords, transportOptions, selectedModeIdx, routeSteps,
    currentStepIdx, setCurrentStepIdx, navInstruction, realTimeInfo, setRealTimeInfo,
    refreshingBike, performSearch, onSelectCandidate, selectModeAndPreview,
    checkDestinationParking, resetAll, arrowAngle, hasBoarded, setHasBoarded,
    alightWarning, setAlightWarning, boardedPlateNumb, setBoardedPlateNumb,
    busCurrentStatus, showQuickTools, setShowQuickTools,
  } = useArLogic();

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

  const handleSnap = async () => {
    if (!cameraRef.current) return;
    setCamMode('picture');
    try {
      const photo = await cameraRef.current.takePictureAsync({ skipProcessing: true });
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      showToast('已存入相簿');
    } catch { showToast('拍照失敗'); }
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

  const handleBack = () => {
    if (viewMode === 'NAV') resetAll();
    else if (viewMode === 'PREVIEW') setViewMode('DETAIL');
    else if (viewMode === 'DETAIL') { setViewMode('SEARCH'); setSelectedIdx(null); setTargetCoords(null); }
    else if (viewMode === 'SEARCH' && candidates.length > 0) { setCandidates([]); setSearchQuery(''); }
    else navigation?.goBack?.();
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

        {viewMode === 'SEARCH' ? (
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
            <View style={[styles.dot, { backgroundColor: viewMode === 'NAV' ? T.moss : T.accent }]} />
            <Text style={styles.topTitle} numberOfLines={1}>
              {viewMode === 'NAV' ? '導航中' : viewMode === 'PREVIEW' ? '確認路線' : candidates[selectedIdx]?.name}
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
          <Text style={styles.alightIcon}>🔔</Text>
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
          <View style={[styles.arCompass, { transform: [{ rotate: `${arrowAngle}deg` }] }]}>
            <View style={styles.arCompassInner}>
              <Ionicons name="navigate" size={100} color={T.paper} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom panel ── */}
      <View style={[styles.panel, { paddingBottom: bottomPad + 4 }]}>

        {/* SEARCH: category chips or results */}
        {viewMode === 'SEARCH' && (
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

        {/* NAV: live instruction */}
        {viewMode === 'NAV' && (
          <View>
            <View style={styles.navBox}>
              <Text style={styles.navInstr}>{navInstruction}</Text>
            </View>

            {/* Transit boarding */}
            {transportOptions[selectedModeIdx]?.mode === 'transit' &&
              routeSteps[currentStepIdx]?.travel_mode === 'TRANSIT' && (
              <View style={styles.boardRow}>
                {!hasBoarded ? (
                  <TouchableOpacity
                    style={styles.boardBtn}
                    onPress={() => { setHasBoarded(true); if (realTimeInfo?.plateNumb) setBoardedPlateNumb(realTimeInfo.plateNumb); }}
                  >
                    <Ionicons name="enter-outline" size={19} color={T.paper} />
                    <Text style={styles.boardBtnText}>已上車</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.boardedBox}>
                    <Text style={styles.boardedText}>
                      🚌 乘車中 · {routeSteps[currentStepIdx]?.transit_details?.num_stops || 0} 站
                    </Text>
                    {busCurrentStatus && <Text style={styles.busStatus}>{busCurrentStatus}</Text>}
                  </View>
                )}
              </View>
            )}

            {/* Real-time ETA card */}
            {realTimeInfo && transportOptions[selectedModeIdx]?.mode === 'transit' && !hasBoarded && (
              <View style={styles.etaCard}>
                <View style={styles.etaLeft}>
                  <View style={styles.etaIcon}>
                    <Ionicons name={realTimeInfo.type === 'bus' ? 'bus-outline' : 'subway-outline'} size={18} color={T.paper} />
                  </View>
                  <View>
                    <Text style={styles.etaLine}>{realTimeInfo.type === 'bus' ? `公車 ${realTimeInfo.line}` : '捷運'}</Text>
                    <Text style={styles.etaStop}>{realTimeInfo.stop}</Text>
                  </View>
                </View>
                <View style={styles.etaBadge}>
                  <Text style={styles.etaBadgeText}>{fmtSec(realTimeInfo.etaSec)}</Text>
                </View>
              </View>
            )}

            {/* YouBike parking refresh */}
            {transportOptions[selectedModeIdx]?.mode === 'youbike' && (
              <TouchableOpacity style={styles.bikeRefreshBtn} onPress={checkDestinationParking} disabled={refreshingBike}>
                {refreshingBike
                  ? <ActivityIndicator size="small" color={T.ink} />
                  : <Ionicons name="refresh-circle-outline" size={18} color={T.ink} />}
                <Text style={styles.bikeRefreshText}>{refreshingBike ? '查詢中…' : '更新目的地車位'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.endBtn} onPress={resetAll}>
              <Text style={styles.endBtnText}>結束導覽</Text>
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
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const CREAM  = 'rgba(245,239,227,0.93)';
const CREAM2 = 'rgba(245,239,227,0.82)';

const styles = StyleSheet.create({
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
    paddingHorizontal: 13, fontFamily: Fonts.serif, fontSize: 13, color: T.ink,
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
  alightIcon: { fontSize: 24 },
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
  navInstr: { fontFamily: Fonts.serif, fontSize: 15, color: T.ink, lineHeight: 22 },
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
  boardedText: { fontFamily: Fonts.serif, fontSize: 14, color: T.moss },
  busStatus: { fontFamily: Fonts.mono, fontSize: 11, color: T.ink3, marginTop: 4 },

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
});
