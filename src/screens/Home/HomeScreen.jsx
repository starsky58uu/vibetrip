import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ActivityIndicator, Modal } from 'react-native';
import MapView from 'react-native-maps'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import { themeColors as T } from '../../constants/theme';
import { mockPlans } from '../../data/mockData';
import { useHomeData } from './hooks/useHomeData';
import { vibes, originalPurpleMapStyle, CARD_WIDTH, SPACING, SPACER_WIDTH, getWeatherIcon } from './constants/homeData';
import BubbleCard from './components/BubbleCard';

const HomeScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideAnimY = useRef(new Animated.Value(-100)).current;

  const insets = useSafeAreaInsets();
  const bottomPadding = 110 + insets.bottom;

  const { location, district, temperature, weatherCondition, greetingMessage, currentTime, isLoading } = useHomeData();
  
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isGreetingVisible, setIsGreetingVisible] = useState(true);

  // 觸發進場動畫
  useEffect(() => {
    if (greetingMessage && isGreetingVisible) {
      Animated.spring(slideAnimY, {
        toValue: 0, tension: 40, friction: 6, useNativeDriver: true,
      }).start();
    }
  }, [greetingMessage, isGreetingVisible]);

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
          <Ionicons name="compass-outline" size={60} color={T.accentMain} />
          <Text style={styles.loadingText}>正在觀測星象與天氣...</Text>
          <ActivityIndicator size="large" color={T.accentSub} />
        </View>
      </Modal>

      {!isLoading && location && (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            mapPadding={{ top: 0, right: 0, bottom: 300, left: 0 }}
            initialRegion={location}
            customMapStyle={originalPurpleMapStyle}
            showsUserLocation={true}
            showsMyLocationButton={false} 
            onMapReady={() => setIsMapReady(true)}
          />

          <View style={[styles.overlay, { paddingBottom: bottomPadding }]} pointerEvents="box-none">

            {/* 🌟 質感貼心小語區塊 */}
            {isGreetingVisible && greetingMessage && (
              <Animated.View style={[styles.greetingContainer, { transform: [{ translateY: slideAnimY }] }]}>
                <BubbleCard 
                  message={greetingMessage} 
                  onDismiss={() => setIsGreetingVisible(false)} 
                />
              </Animated.View>
            )}

            {/* 🌟 頂部天氣列 */}
            <View style={styles.topRow} pointerEvents="box-none">
              <TouchableOpacity 
                style={styles.headerBadge} activeOpacity={0.8}
                onPress={() => navigation.navigate('WeatherDetail', { lat: location.latitude, lon: location.longitude, district: district })}
              >
                <View style={styles.dot} />
                <Text style={styles.headerText}>{district} · {currentTime} · </Text>
                <Ionicons name={getWeatherIcon(weatherCondition)} size={16} color={T.textMain} />
                <Text style={styles.headerText}> {temperature}</Text>
                <Ionicons name="chevron-forward" size={14} color={T.textSub} style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.recenterButton} activeOpacity={0.8} onPress={() => mapRef.current?.animateToRegion(location, 1000)}>
                <Ionicons name="navigate" size={20} color={T.textMain} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />

            {/* 下方卡片區 */}
            <View style={styles.glassPanel}>
              <Text style={styles.vibeTitle}>現在的直覺是？</Text>
              
              <View style={{ height: 160 }}>
                <Animated.FlatList
                  data={vibes} horizontal showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + SPACING * 2} decelerationRate="fast"
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                  contentContainerStyle={styles.flatListContent}
                  renderItem={({ item }) => {
                    if (item.id.includes('spacer')) return <View style={{ width: SPACER_WIDTH }} />;
                    const isSelected = selectedVibe === item.id;
                    return (
                      <Animated.View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.vibeCard, { backgroundColor: isSelected ? T.accentMain : item.bgColor }]}
                          onPress={() => setSelectedVibe(item.id)}
                        >
                          <Ionicons name={item.icon} size={34} color={T.background} />
                          <Text style={styles.vibeLabel}>{item.label}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }}
                />
              </View>

              <View style={styles.actionButtonContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMagicPress}>
                  <Ionicons name="sparkles" size={20} color={T.background} />
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
  container: { flex: 1, backgroundColor: T.background },
  loadingContainer: { flex: 1, backgroundColor: T.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: T.textMain, fontSize: 18, marginVertical: 20, fontFamily: 'VibePixel' },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 10 },
  
  greetingContainer: { position: 'absolute', top: 120, left: 20, right: 20, zIndex: 100, alignItems: 'center' },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 18, 56, 0.75)', 
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(233, 243, 251, 0.2)', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  dot: { 
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.accentMain, marginRight: 10,
    shadowColor: T.accentMain, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4
  },
  headerText: { color: T.textMain, fontSize: 13, fontFamily: 'VibePixel', letterSpacing: 0.5 },
  recenterButton: {
    backgroundColor: 'rgba(30, 18, 56, 0.75)', width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(233, 243, 251, 0.2)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },

  glassPanel: {
    backgroundColor: 'rgba(54, 35, 96, 0.85)', borderRadius: 42,
    marginHorizontal: 12, borderWidth: 2, borderColor: 'rgba(233, 243, 251, 0.2)', 
    paddingTop: 25, paddingBottom: 25, minHeight: 350,
  },
  vibeTitle: { color: T.textMain, fontSize: 22, marginLeft: 28, marginBottom: 5, fontFamily: 'VibePixel' },
  flatListContent: { alignItems: 'center', paddingTop: 10 },
  cardWrapper: { marginHorizontal: SPACING, height: 140 },
  vibeCard: {
    flex: 1, borderRadius: 32, borderWidth: 3, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  vibeLabel: { fontSize: 17, color: T.background, marginTop: 10, fontFamily: 'VibePixel' },
  actionButtonContainer: { paddingHorizontal: 20, marginTop: 15 },
  actionButton: {
    backgroundColor: T.accentMain, width: '100%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 18,
    borderWidth: 3, borderColor: T.border,
    shadowColor: T.textMain, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
  },
  actionButtonText: { color: T.background, fontSize: 18, marginLeft: 8, fontFamily: 'VibePixel' },
});

export default HomeScreen;