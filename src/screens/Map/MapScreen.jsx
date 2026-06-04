import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iOS 在 Expo Go 裡用 PROVIDER_DEFAULT（Apple Maps）
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

import { Fonts } from '../../constants/theme';
import { useMapLogic } from './hooks/useMapLogic';
import { useAuth } from '../../context/AuthContext';
import AddSpotModal from './components/AddSpotModal';
import { usePAL } from '../../context/DimContext';

// 卡通配色（與其他頁面一致）
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const C = usePAL();

  const {
    mapRef, mySpots,
    selectedSpot, setSelectedSpot,
    editingNote, setEditingNote,
    editingImage, pickImage, saveAndCloseSpot,
    goToUserLocation, handleMapLongPress, openMySpotDetail,
  } = useMapLogic({ isLoggedIn });

  return (
    <View style={styles.container}>
      <MapView
        provider={MAP_PROVIDER}
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: 25.0400, longitude: 121.5450, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onLongPress={handleMapLongPress}
      >
        {mySpots.map((spot) => (
          <Marker
            key={`my-${spot.id}`}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            onPress={(e) => { e.stopPropagation(); openMySpotDetail(spot); }}
          >
            {/* 粉色卡通 marker */}
            <View style={[styles.markerOuter, { backgroundColor: C.pink }]}>
              <View style={[styles.markerInner, { backgroundColor: C.white }]}>
                <Ionicons
                  name={spot.imageUri ? 'checkmark' : 'camera'}
                  size={18}
                  color={C.pink}
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 定位 FAB — 白色圓形膠囊 */}
      <View style={[styles.fabContainer, { bottom: 100 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.white }]}
          onPress={goToUserLocation} activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color={C.blue} />
        </TouchableOpacity>
      </View>

      {/* 底部提示 banner — 白色膠囊 */}
      {!selectedSpot && (
        <View style={[styles.bannerWrap, { bottom: 16 + insets.bottom }]}>
          <View style={[styles.banner, { backgroundColor: C.white }]}>
            <View style={[styles.bannerIcon, { backgroundColor: C.blue }]}>
              <Ionicons name="location" size={18} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>我的足跡</Text>
              <Text style={styles.bannerText}>
                {isLoggedIn
                  ? '長按地圖新增足跡，自動同步雲端'
                  : '長按地圖新增本機足跡，登入後雲端同步'}
              </Text>
            </View>
          </View>
        </View>
      )}

      <AddSpotModal
        visible={!!selectedSpot}
        onClose={() => setSelectedSpot(null)}
        isLoggedIn={isLoggedIn}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        editingImage={editingImage}
        pickImage={pickImage}
        saveAndCloseSpot={saveAndCloseSpot}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAL.yellow },

  // Marker — 粉色圓形 + 白心
  markerOuter: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PAL.pink,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  markerInner: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: PAL.white,
    alignItems: 'center', justifyContent: 'center',
  },

  // FAB
  fabContainer: { position: 'absolute', right: 16, alignItems: 'center', zIndex: 10 },
  fab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: PAL.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6,
    elevation: 4,
  },

  // 底部 banner — 白色膠囊 + 藍色圖示底
  bannerWrap: { position: 'absolute', left: 16, right: 16, zIndex: 5 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: PAL.white,
    borderRadius: 999,
    padding: 12, paddingRight: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 3,
  },
  bannerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PAL.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontFamily: Fonts.sansBlack, fontSize: 13, color: PAL.black },
  bannerText:  { fontFamily: Fonts.sansMed,   fontSize: 11, color: 'rgba(0,0,0,0.6)', lineHeight: 16, marginTop: 1 },
});

export default MapScreen;
