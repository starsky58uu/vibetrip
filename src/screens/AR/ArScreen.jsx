import React from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themeColors as T } from '../../constants/theme';
import { CATEGORY_MAP } from './constants/arData';
import { fmtSec } from './utils/helpers';
import { useArLogic } from './hooks/useArLogic';

const ArScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const {
    permission, viewMode, setViewMode, loading,
    searchQuery, setSearchQuery, candidates, setCandidates, selectedIdx, setSelectedIdx, targetCoords, setTargetCoords,
    transportOptions, selectedModeIdx, routeSteps,
    setCurrentStepIdx, navInstruction, realTimeInfo, setRealTimeInfo,
    refreshingBike,
    performSearch, onSelectCandidate, selectModeAndPreview, checkDestinationParking,
    resetAll, arrowAngle,
    // 【新增】解構出從 useArLogic 傳來的公車追蹤與上車狀態
    hasBoarded, setHasBoarded,
    alightWarning, setAlightWarning,
    boardedPlateNumb, setBoardedPlateNumb,
    busCurrentStatus
  } = useArLogic();

  if (!permission?.granted) {
    return (
      <View style={styles.permContainer}>
        <Ionicons name="compass-outline" size={52} color={T.accentMain} />
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
          else if (viewMode === 'DETAIL') { 
            setViewMode('SEARCH'); 
            setSelectedIdx(null); 
            setTargetCoords(null); 
          }
          else if (viewMode === 'SEARCH' && candidates.length > 0) { 
            setCandidates([]); 
            setSearchQuery(''); 
          }
          else {
            navigation.navigate('Home'); 
          }
        }}>
          <Ionicons name="chevron-back" size={20} color={T.background} />
        </TouchableOpacity>
        
        {viewMode === 'SEARCH' ? (
          <View style={styles.searchWrap}>
            <TextInput style={styles.input} placeholder="要去哪裡？" placeholderTextColor={T.textSub} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => performSearch(searchQuery)} returnKeyType="search" />
            <TouchableOpacity style={styles.searchBtn} onPress={() => performSearch(searchQuery)}><Ionicons name="search" size={18} color={T.background} /></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topTitleWrap}><View style={styles.dot} /><Text style={styles.topTitle} numberOfLines={1}>{viewMode === 'NAV' ? '導航中' : viewMode === 'PREVIEW' ? '確認路線' : candidates[selectedIdx]?.name}</Text></View>
        )}
      </View>

      {/* 【新增】即將到站彈出卡片 */}
      {viewMode === 'NAV' && alightWarning && (
        <View style={[styles.alightWarningCard, { top: insets.top + 65 }]}>
          <Ionicons name="notifications-circle" size={36} color={T.background} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alightWarningTitle}>即將到站</Text>
            <Text style={styles.alightWarningDesc}>記得按下車鈴 / 準備下車！</Text>
          </View>
          <TouchableOpacity onPress={() => setAlightWarning(false)}>
            <Ionicons name="close" size={24} color={T.background} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.arArea} pointerEvents="none">
        {targetCoords && (
          <View style={[styles.arrowWrap, { transform: [{ rotate: `${arrowAngle}deg` }] }]}>
            <View style={styles.arrowCore}>
              <Ionicons 
                name="navigate" 
                size={110} 
                color={T.textMain} 
                style={{ transform: [{ rotate: '-45deg' }] }} 
              />
            </View>
          </View>
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
                            <Ionicons name={CATEGORY_MAP[cat].icon} size={13} color={T.background} />
                            <Text style={styles.catText}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>搜尋地名或選擇上方類別</Text>
            </View>
          ) : null
        )}

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
                      <Ionicons name={opt.icon} size={28} color={isAvail ? T.background : T.textSub} />
                      <Text style={[styles.modeBtnTxt, !isAvail && { color: T.textSub }]} numberOfLines={1}>{opt.title}</Text>
                      <Text style={[styles.modeBtnTime, !isAvail && { color: T.textSub }]}>{isAvail ? fmtSec(opt.totalSec) : '不可用'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : <ActivityIndicator color={T.accentMain} style={{ marginVertical: 20 }} />}
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
              <Ionicons name="navigate" size={18} color={T.background} /><Text style={styles.startBtnTxt}>開始導覽</Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'NAV' && (
          <View>
            <View style={styles.navBox}><Text style={styles.navInstr}>{navInstruction}</Text></View>

            {/* 【新增】公共運輸上車按鈕與動態追蹤狀態 */}
            {activeOpt?.mode === 'transit' && routeSteps[currentStepIdx]?.travel_mode === 'TRANSIT' && (
              <View style={styles.transitBoardingBox}>
                {!hasBoarded ? (
                  <TouchableOpacity 
                    style={styles.boardBtn} 
                    onPress={() => {
                      setHasBoarded(true);
                      // 如果抓到的資料有公車車牌，就存起來準備追蹤
                      if (realTimeInfo?.plateNumb) {
                        setBoardedPlateNumb(realTimeInfo.plateNumb);
                      }
                    }}
                  >
                    <Ionicons name="enter-outline" size={20} color={T.background} />
                    <Text style={styles.boardBtnTxt}>已上車</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.boardedInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="bus" size={20} color={T.accentMain} />
                      <Text style={styles.boardedTxt}>
                        乘車中 · 共需經過 {routeSteps[currentStepIdx]?.transit_details?.num_stops || 0} 站
                      </Text>
                    </View>
                    {/* 顯示 TDX 抓到的公車目前到哪一站 */}
                    {busCurrentStatus && (
                      <Text style={styles.busStatusTxt}>{busCurrentStatus}</Text>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {/* 尚未上車前顯示公車 ETA */}
            {realTimeInfo && activeOpt?.mode === 'transit' && !hasBoarded && (
              <View style={styles.rtCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.rtIconWrap}><Ionicons name={realTimeInfo.type==='bus'?'bus-outline':'subway-outline'} size={20} color={T.background} /></View>
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
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator color={T.accentMain} size="large" /><Text style={styles.loadingText}>運算中...</Text></View>}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permContainer: { flex: 1, backgroundColor: T.background, alignItems: 'center', justifyContent: 'center' },
  permText: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel', marginTop: 18 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'rgba(54,35,96,0.82)', borderBottomWidth: 2, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 40, borderRadius: 12, backgroundColor: T.textMain, borderWidth: 2.5, borderColor: T.border, paddingHorizontal: 14, color: T.background, fontSize: 13, fontFamily: 'VibePixel' },
  searchBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.accentMain, borderWidth: 2.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: T.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  catBarStatic: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border },
  catText: { color: T.background, fontSize: 13, fontFamily: 'VibePixel' },
  arArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 200 },
  arrowWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  arrowCore: { 
    width: 250, height: 250, borderRadius: 125, 
    backgroundColor: 'rgba(54,35,96,0.3)', 
    borderWidth: 3, borderColor: T.accentMain, 
    alignItems: 'center', justifyContent: 'center', 
    shadowColor: T.accentMain, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54,35,96,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 200 },  
  loadingText: { color: T.textMain, fontFamily: 'VibePixel', fontSize: 15, marginTop: 12 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(54,35,96,0.88)', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 2, borderColor: 'rgba(233,243,251,0.18)', paddingHorizontal: 20, paddingTop: 20, maxHeight: '65%' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accentMain },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(233,243,251,0.08)' },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  resultRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  resultMeta: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', marginTop: 2 },
  resultDist: { color: T.accentSub, fontSize: 13, fontFamily: 'VibePixel' },
  hint: { color: T.textSub, fontSize: 13, fontFamily: 'VibePixel', textAlign: 'center', paddingVertical: 6 },
  panelLabel: { color: T.textSub, fontSize: 11, fontFamily: 'VibePixel', letterSpacing: 1.2, marginBottom: 10 },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 16 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, gap: 6, backgroundColor: T.accentSub, borderWidth: 2.5, borderColor: T.border, shadowColor: T.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  modeBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', shadowOpacity: 0 },
  modeBtnTxt: { color: T.background, fontSize: 13, fontFamily: 'VibePixel', fontWeight: 'bold' },
  modeBtnTime: { color: T.background, fontSize: 15, fontFamily: 'VibePixel' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  previewTime: { color: T.textMain, fontSize: 18, fontFamily: 'VibePixel' },
  transitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  transitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accentMain, marginTop: 6 },
  transitLine: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', flex: 1, lineHeight: 22 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accentMain, borderRadius: 16, paddingVertical: 14, marginTop: 14, borderWidth: 3, borderColor: T.border },
  startBtnTxt: { color: T.background, fontSize: 17, fontFamily: 'VibePixel' },
  navBox: { backgroundColor: T.border, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: T.accentSub },
  navInstr: { color: T.textMain, fontSize: 15, fontFamily: 'VibePixel', lineHeight: 22 },
  rtCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(195,174,217,0.1)', borderRadius: 14, borderWidth: 1.5, borderColor: T.accentSub, padding: 12, marginBottom: 12 },
  rtIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.accentSub, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  rtLine: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  rtStop: { color: T.textSub, fontSize: 12, fontFamily: 'VibePixel', marginTop: 2 },
  rtEtaBadge: { backgroundColor: T.accentMain, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: T.border },
  rtEtaTxt: { color: T.background, fontSize: 15, fontFamily: 'VibePixel' },
  refreshBikeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: T.textSub },
  refreshBikeTxt: { color: T.textMain, fontSize: 14, fontFamily: 'VibePixel' },
  endBtn: { paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: T.accentSub },
  endBtnTxt: { color: T.textSub, fontSize: 14, fontFamily: 'VibePixel' },

  /* === 新增的樣式 === */
  alightWarningCard: {
    position: 'absolute',
    left: 20, right: 20,
    backgroundColor: T.accentMain,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 200,
  },
  alightWarningTitle: { color: T.background, fontSize: 18, fontFamily: 'VibePixel', fontWeight: 'bold' },
  alightWarningDesc: { color: T.background, fontSize: 13, fontFamily: 'VibePixel', marginTop: 4 },
  transitBoardingBox: { marginBottom: 12 },
  boardBtn: { 
    backgroundColor: T.accentMain, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 14, 
    borderRadius: 14,
    borderWidth: 2,
    borderColor: T.border
  },
  boardBtnTxt: { color: T.background, fontSize: 16, fontFamily: 'VibePixel' },
  boardedInfo: { 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    backgroundColor: 'rgba(233,243,251,0.1)', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: T.accentMain,
    justifyContent: 'center'
  },
  boardedTxt: { color: T.accentMain, fontSize: 15, fontFamily: 'VibePixel' },
  busStatusTxt: { color: T.textSub, fontSize: 13, fontFamily: 'VibePixel', marginTop: 6, marginLeft: 28 },
});

export default ArScreen;