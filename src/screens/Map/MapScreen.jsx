import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 模組化引入
import { themeColors } from '../../constants/theme';
import { darkMapStyle } from './constants/mapData';
import { useMapLogic } from './hooks/useMapLogic';

// 引入我們抽離的 Modals
import AddSpotModal from './components/AddSpotModal';
import CommunitySpotModal from './components/CommunitySpotModal';
import LoginModal from './components/LoginModal';

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (!username || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false); setIsLoggedIn(true); setShowLoginOverlay(false);
    }, 1000);
  };

  const {
    mapRef, mapMode, setMapMode, mySpots, communitySpots,
    selectedSpot, setSelectedSpot, selectedCommunitySpot, setSelectedCommunitySpot,
    editingNote, setEditingNote, editingImage, pickImage, saveAndCloseSpot,
    goToUserLocation, handleMapLongPress, openMySpotDetail,
    openCommunitySpot, toggleCommunityLike, toggleCommunitySave
  } = useMapLogic();

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: 25.0400, longitude: 121.5450, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false} 
        onLongPress={handleMapLongPress} 
      >
        {mapMode === 'personal' && mySpots.map((spot) => (
          <Marker key={`my-${spot.id}`} coordinate={{ latitude: spot.lat, longitude: spot.lng }} onPress={(e) => { e.stopPropagation(); openMySpotDetail(spot); }}>
            <View style={styles.safeMarker}>
              <View style={styles.safeMarkerInner}>
                <Ionicons name={spot.imageUri ? "checkmark-circle" : "camera"} size={22} color={themeColors.background} />
              </View>
            </View>
          </Marker>
        ))}

        {mapMode === 'explore' && communitySpots.map((spot) => {
          let iconName = spot.isSaved ? 'heart' : (spot.isViewed ? 'eye' : 'help');
          let markerColor = spot.isSaved ? themeColors.accentMain : (spot.isViewed ? themeColors.textSub : '#7f69c8'); 
          let iconColor = spot.isSaved ? themeColors.textMain : themeColors.background;

          return (
            <Marker key={`com-${spot.id}`} coordinate={{ latitude: spot.lat, longitude: spot.lng }} onPress={(e) => { e.stopPropagation(); openCommunitySpot(spot); }}>
              <View style={[styles.safeMarker, { borderColor: markerColor, backgroundColor: themeColors.border }]}>
                <View style={[styles.safeMarkerInner, { backgroundColor: markerColor }]}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.headerContainer, { paddingTop: 15 }]}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'explore' && styles.segmentBtnActive]} onPress={() => setMapMode('explore')} activeOpacity={0.8}>
            <Ionicons name="earth" size={16} color={mapMode === 'explore' ? themeColors.textMain : themeColors.textSub} />
            <Text style={[styles.segmentText, mapMode === 'explore' && styles.segmentTextActive]}>探索膠囊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'personal' && styles.segmentBtnActive]} onPress={() => setMapMode('personal')} activeOpacity={0.8}>
            <Ionicons name="location" size={16} color={mapMode === 'personal' ? themeColors.textMain : themeColors.textSub} />
            <Text style={[styles.segmentText, mapMode === 'personal' && styles.segmentTextActive]}>我的足跡</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => isLoggedIn ? setIsLoggedIn(false) : setShowLoginOverlay(true)}>
          <Ionicons name={isLoggedIn ? "log-out" : "person"} size={22} color={themeColors.textMain} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={goToUserLocation}>
          <Ionicons name="locate" size={24} color={themeColors.textMain} />
        </TouchableOpacity>
      </View>

      {!selectedSpot && !selectedCommunitySpot && (
        <View style={[styles.bottomBannerContainer, { bottom: 110 + insets.bottom }]}>
          <View style={styles.aiCard}>
            <Ionicons name={mapMode === 'personal' ? "information-circle" : "search"} size={24} color={themeColors.accentMain} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.aiTitle}>{mapMode === 'personal' ? '建立回憶' : '探索世界'}</Text>
              <Text style={styles.aiText}>
                {mapMode === 'personal' 
                  ? (isLoggedIn ? '長按地圖新增足跡，將自動同步至雲端。' : '長按地圖新增本機足跡。登入解鎖分享！')
                  : '點開地圖上的「？」探索別人的行程！遇到喜歡的就收藏成愛心吧❤️'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 獨立模組化的 Modals，負責接 props 而已 */}
      <AddSpotModal 
        visible={!!selectedSpot} 
        onClose={() => setSelectedSpot(null)}
        isLoggedIn={isLoggedIn}
        editingNote={editingNote} setEditingNote={setEditingNote}
        editingImage={editingImage} pickImage={pickImage}
        saveAndCloseSpot={saveAndCloseSpot}
      />

      <CommunitySpotModal 
        visible={!!selectedCommunitySpot} 
        spot={selectedCommunitySpot} 
        onClose={() => setSelectedCommunitySpot(null)}
        onToggleLike={toggleCommunityLike}
        onToggleSave={toggleCommunitySave}
      />

      <LoginModal 
        visible={showLoginOverlay} 
        onClose={() => setShowLoginOverlay(false)}
        username={username} setUsername={setUsername}
        password={password} setPassword={setPassword}
        isLoading={isLoading} handleLogin={handleLogin}
      />

    </View>
  );
};

// 瘦身過後的 Styles，只保留跟 Map 主畫面有關的排版！
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  segmentedControl: { flexDirection: 'row', backgroundColor: 'rgba(30, 18, 56, 0.85)', borderRadius: 24, padding: 4, borderWidth: 1.5, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  segmentBtnActive: { backgroundColor: themeColors.accentMain },
  segmentText: { fontFamily: 'VibePixel', fontSize: 13, color: themeColors.textSub, marginTop: 2 },
  segmentTextActive: { color: themeColors.textMain },
  fabContainer: { position: 'absolute', right: 15, top: '45%', alignItems: 'center', gap: 15, zIndex: 10 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(54, 35, 96, 0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3 },
  bottomBannerContainer: { position: 'absolute', left: 15, right: 15, zIndex: 5 },
  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(54, 35, 96, 0.95)', borderWidth: 2, borderColor: themeColors.accentSub, borderRadius: 20, padding: 15, shadowColor: themeColors.accentSub, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  aiTitle: { fontFamily: 'VibePixel', fontSize: 14, color: themeColors.accentMain, marginBottom: 4 },
  aiText: { fontFamily: 'VibePixel', fontSize: 12, color: themeColors.textMain, lineHeight: 18 },
  safeMarker: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: themeColors.accentMain, 
    borderWidth: 2.5, borderColor: themeColors.textMain, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3 }, android: { elevation: 0 } })
  },
  safeMarkerInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }
});

export default MapScreen;