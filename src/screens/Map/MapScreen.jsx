import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iOS 在 Expo Go 裡用 PROVIDER_DEFAULT（Apple Maps）
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

import { Fonts } from '../../constants/theme';
import { getMapStyle } from './constants/mapData';
import { useMapLogic } from './hooks/useMapLogic';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AddSpotModal from './components/AddSpotModal';

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { colors } = useTheme();

  // 主題色變化時重新產生地圖樣式
  const mapStyle = useMemo(() => getMapStyle(colors), [colors]);

  const {
    mapRef, mySpots,
    selectedSpot, setSelectedSpot,
    editingNote, setEditingNote,
    editingImage, pickImage, saveAndCloseSpot,
    goToUserLocation, handleMapLongPress, openMySpotDetail,
  } = useMapLogic({ isLoggedIn });

  return (
    <View style={[styles.container, { backgroundColor: colors.paper }]}>
      <MapView
        provider={MAP_PROVIDER}
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: 25.0400, longitude: 121.5450, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        customMapStyle={Platform.OS === 'android' ? mapStyle : undefined}
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
            {/* 主題色 marker */}
            <View style={[
              styles.markerOuter,
              { backgroundColor: colors.accent, borderColor: colors.paper },
            ]}>
              <View style={[styles.markerInner, { backgroundColor: colors.paper }]}>
                <Ionicons
                  name={spot.imageUri ? 'checkmark-circle' : 'camera-outline'}
                  size={20}
                  color={colors.accent}
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 定位 FAB */}
      <View style={[styles.fabContainer, { bottom: 100 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.card + 'F4', borderColor: colors.line }]}
          onPress={goToUserLocation}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* 底部提示 banner */}
      {!selectedSpot && (
        <View style={[styles.bannerWrap, { bottom: 16 + insets.bottom }]}>
          <View style={[styles.banner, { backgroundColor: colors.card + 'F5', borderColor: colors.line }]}>
            <Ionicons name="location" size={22} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.bannerTitle, { color: colors.ink }]}>我的足跡</Text>
              <Text style={[styles.bannerText, { color: colors.ink2 }]}>
                {isLoggedIn
                  ? '長按地圖新增足跡，自動同步雲端。'
                  : '長按地圖新增本機足跡。登入後自動同步雲端！'}
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
  container: { flex: 1 },

  // Marker
  markerOuter: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  markerInner: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // FAB
  fabContainer: { position: 'absolute', right: 16, alignItems: 'center', zIndex: 10 },
  fab: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },

  // Banner
  bannerWrap: { position: 'absolute', left: 16, right: 16, zIndex: 5 },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    elevation: 2,
  },
  bannerTitle: { fontFamily: Fonts.serifBold, fontSize: 13, marginBottom: 3 },
  bannerText:  { fontFamily: Fonts.serif, fontSize: 12, lineHeight: 18 },
});

export default MapScreen;
