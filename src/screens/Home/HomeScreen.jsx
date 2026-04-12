import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ActivityIndicator, Modal } from 'react-native';
import MapView from 'react-native-maps'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { themeColors } from '../../constants/theme';
import { mockPlans } from '../../data/mockData';
import { useHomeData } from '../../hooks/useHomeData';
import { vibes, originalPurpleMapStyle, CARD_WIDTH, SPACING, SPACER_WIDTH } from './constants/homeData';

const HomeScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const { location, district, weather, currentTime, isLoading } = useHomeData();
  
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 核心功能：隨機抽選與跳轉
  const handleMagicPress = () => {
    if (!selectedVibe) {
      Alert.alert('先選一個 Vibe 啦！', '請滑動卡片選一個妳現在的心情喔 ✨');
      return;
    }

    const finalVibe = selectedVibe === 'random' 
      ? ['cafe', 'photo', 'food', 'rain', 'walk', 'gift'][Math.floor(Math.random() * 6)]
      : selectedVibe;

    const options = mockPlans[finalVibe];
    
    navigation.navigate('Result', {
      plan: options?.length ? options[Math.floor(Math.random() * options.length)] : mockPlans['cafe'][0],
      vibeKey: finalVibe,
      timestamp: Date.now(),
    });
  };

  return (
    <View style={styles.container}>
      <Modal visible={isLoading} transparent={false} animationType="fade">
        <View style={styles.loadingContainer}>
          <Ionicons name="compass-outline" size={60} color={themeColors.accentMain} />
          <Text style={styles.loadingText}>正在觀測星象與天氣...</Text>
          <ActivityIndicator size="large" color={themeColors.accentSub} />
        </View>
      </Modal>

      {!isLoading && location && (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={location}
            customMapStyle={originalPurpleMapStyle}
            showsUserLocation={true}
            showsMyLocationButton={false} 
            onMapReady={() => setIsMapReady(true)}
          />

          <View style={styles.overlay} pointerEvents="box-none">
            {/* 上方 Header */}
            <View style={styles.topRow} pointerEvents="box-none">
              <TouchableOpacity 
                style={styles.headerBadge}
                onPress={() => navigation.navigate('WeatherDetail', { lat: location.latitude, lon: location.longitude, district })}
              >
                <View style={styles.dot} />
                <Text style={styles.headerText}>{district} · {currentTime} · {weather} ❯</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.recenterButton} onPress={() => mapRef.current?.animateToRegion(location, 1000)}>
                <Ionicons name="locate" size={24} color={themeColors.background} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />

            {/* 下方卡片區 */}
            <View style={styles.glassPanel}>
              <Text style={styles.vibeTitle}>現在的直覺是？</Text>
              
              <View style={{ height: 160 }}>
                <Animated.FlatList
                  data={vibes}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + SPACING * 2}
                  decelerationRate="fast"
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                  contentContainerStyle={styles.flatListContent}
                  renderItem={({ item }) => {
                    if (item.id.includes('spacer')) return <View style={{ width: SPACER_WIDTH }} />;
                    const isSelected = selectedVibe === item.id;
                    return (
                      <Animated.View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.vibeCard, { backgroundColor: isSelected ? themeColors.accentMain : item.bgColor }]}
                          onPress={() => setSelectedVibe(item.id)}
                        >
                          <Ionicons name={item.icon} size={34} color={themeColors.background} />
                          <Text style={styles.vibeLabel}>{item.label}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }}
                />
              </View>

              <View style={styles.actionButtonContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMagicPress}>
                  <Ionicons name="sparkles" size={20} color={themeColors.background} />
                  <Text style={styles.actionButtonText}>抽取未來 3 小時盲盒</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: themeColors.textMain, fontSize: 18, marginVertical: 20, fontFamily: 'VibePixel' },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 60, paddingBottom: 110 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.textMain,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 2.5, borderColor: themeColors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors.accentMain, marginRight: 8 },
  headerText: { color: themeColors.background, fontSize: 13, fontFamily: 'VibePixel' },
  recenterButton: {
    backgroundColor: themeColors.textMain, width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderColor: themeColors.border, alignItems: 'center', justifyContent: 'center',
  },
  glassPanel: {
    backgroundColor: 'rgba(54, 35, 96, 0.85)',
    borderRadius: 42,
    marginHorizontal: 12, borderWidth: 2, borderColor: 'rgba(233, 243, 251, 0.2)', 
    paddingTop: 25, paddingBottom: 25, minHeight: 350,
  },
  vibeTitle: { color: themeColors.textMain, fontSize: 22, marginLeft: 28, marginBottom: 5, fontFamily: 'VibePixel' },
  flatListContent: { alignItems: 'center', paddingTop: 10 },
  cardWrapper: { marginHorizontal: SPACING, height: 140 },
  vibeCard: {
    flex: 1, borderRadius: 32, borderWidth: 3, borderColor: themeColors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: themeColors.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  vibeLabel: { fontSize: 17, color: themeColors.background, marginTop: 10, fontFamily: 'VibePixel' },
  actionButtonContainer: { paddingHorizontal: 20, marginTop: 15 },
  actionButton: {
    backgroundColor: themeColors.accentMain, width: '100%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 18,
    borderWidth: 3, borderColor: themeColors.border,
    shadowColor: themeColors.textMain, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
  },
  actionButtonText: { color: themeColors.background, fontSize: 18, marginLeft: 8, fontFamily: 'VibePixel' },
});

export default HomeScreen;