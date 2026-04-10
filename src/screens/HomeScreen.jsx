import React, { useState, useEffect, useRef } from 'react';
import { mockPlans } from '../data/mockData';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Dimensions, Animated, ActivityIndicator, Modal,
} from 'react-native';
import MapView from 'react-native-maps'; 
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const { width } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; 
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

const themeColors = {
  background: '#362360',
  textMain: '#E9F3FB',
  accentMain: '#C95E9E',
  accentSub: '#C3AED9',
  textSub: '#84A6D3',
  border: '#1E1238'
};

const CARD_WIDTH = width * 0.46;
const SPACING = 12;
const SPACER_WIDTH = (width - CARD_WIDTH) / 2;

const vibes = [
  { id: 'left-spacer' },
  { id: 'cafe',   icon: 'cafe',        label: '想耍廢', bgColor: themeColors.textSub },
  { id: 'photo',  icon: 'camera',      label: '拍美照', bgColor: themeColors.accentSub },
  { id: 'food',   icon: 'restaurant',  label: '肚子餓', bgColor: themeColors.textSub },
  { id: 'rain',   icon: 'umbrella',    label: '躲室內', bgColor: themeColors.accentSub },
  { id: 'walk',   icon: 'walk',        label: '散散步', bgColor: themeColors.textSub },
  { id: 'gift',   icon: 'gift',        label: '買東西', bgColor: themeColors.accentSub },
  { id: 'random', icon: 'help-circle', label: '隨便啦', bgColor: '#B197FC' },
  { id: 'right-spacer' },
];

const originalPurpleMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#241842" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#241842" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#84A6D3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#362360" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1E1238" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1E1238" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "on" }] } 
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [location, setLocation] = useState(null);
  const [district, setDistrict] = useState(null);
  const [weather, setWeather] = useState(null); 
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    fmt();
    const timer = setInterval(fmt, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = currentLoc.coords;
        setLocation({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 });
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        setDistrict(geo[0]?.district || geo[0]?.subregion || '台北市');
      } catch (error) { setDistrict('未知區域'); }
    })();
  }, []);

  useEffect(() => {
    if (!location) return; 
    const fetchWeather = async () => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&lang=zh_tw&appid=${OPENWEATHER_API_KEY}`;
        const res = await axios.get(url);
        if (res.data && res.data.main) {
          const temp = Math.round(res.data.main.temp);
          setWeather(`☀️ ${temp}°C`);
        }
      } catch (error) { setWeather('⛅ 25°C'); }
    };
    fetchWeather();
  }, [location]);

  // 🌟 核心功能：隨機抽選與跳轉
  const handleMagicPress = () => {
    if (!selectedVibe) {
      Alert.alert('先選一個 Vibe 啦！', '請滑動卡片選一個妳現在的心情喔 ✨');
      return;
    }

    // 如果選到「隨便啦」，就從其他 6 個標籤裡隨便選一個
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

  const isLoading = !location || !district || !weather;

  return (
    <View style={styles.container}>
      <Modal visible={isLoading} transparent={false} animationType="fade">
        <View style={styles.loadingContainer}>
          <Ionicons name="compass-outline" size={60} color={themeColors.accentMain} />
          <Text style={styles.loadingText}>正在觀測星象與天氣...</Text>
          <ActivityIndicator size="large" color={themeColors.accentSub} />
        </View>
      </Modal>

      {!isLoading && (
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
            <View style={styles.topRow} pointerEvents="box-none">
              <TouchableOpacity 
                style={styles.headerBadge}
                onPress={() => navigation.navigate('WeatherDetail', { lat: location.latitude, lon: location.longitude, district: district })}
              >
                <View style={styles.dot} />
                <Text style={styles.headerText}>{district} · {currentTime} · {weather} ❯</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.recenterButton} onPress={() => mapRef.current.animateToRegion(location, 1000)}>
                <Ionicons name="locate" size={24} color={themeColors.background} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />

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
                  renderItem={({ item, index }) => {
                    if (item.id.includes('spacer')) return <View style={{ width: SPACER_WIDTH }} />;
                    const isSelected = selectedVibe === item.id;
                    return (
                      <Animated.View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.vibeCard, { backgroundColor: isSelected ? themeColors.accentMain : item.bgColor }]}
                          onPress={() => {
                            console.log("Selected:", item.id);
                            setSelectedVibe(item.id);
                          }}
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
  container: { flex: 1, backgroundColor: '#362360' },
  loadingContainer: { flex: 1, backgroundColor: '#362360', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#E9F3FB', fontSize: 18, marginVertical: 20, fontFamily: 'VibePixel' },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 60, paddingBottom: 110 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9F3FB',
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 2.5, borderColor: '#1E1238',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C95E9E', marginRight: 8 },
  headerText: { color: '#362360', fontSize: 13, fontFamily: 'VibePixel' },
  recenterButton: {
    backgroundColor: '#E9F3FB', width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderColor: '#1E1238', alignItems: 'center', justifyContent: 'center',
  },
  glassPanel: {
    backgroundColor: 'rgba(54, 35, 96, 0.85)', borderRadius: 42,
    marginHorizontal: 12, borderWidth: 2, borderColor: 'rgba(233, 243, 251, 0.2)', 
    paddingTop: 25, paddingBottom: 25, minHeight: 350,
  },
  vibeTitle: { color: '#E9F3FB', fontSize: 22, marginLeft: 28, marginBottom: 5, fontFamily: 'VibePixel' },
  flatListContent: { alignItems: 'center', paddingTop: 10 },
  cardWrapper: { marginHorizontal: SPACING, height: 140 },
  vibeCard: {
    flex: 1, borderRadius: 32, borderWidth: 3, borderColor: '#1E1238',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1E1238', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  vibeLabel: { fontSize: 17, color: '#362360', marginTop: 10, fontFamily: 'VibePixel' },
  actionButtonContainer: { paddingHorizontal: 20, marginTop: 15 },
  actionButton: {
    backgroundColor: themeColors.accentMain, width: '100%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 18,
    borderWidth: 3, borderColor: '#1E1238',
    shadowColor: '#E9F3FB', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
  },
  actionButtonText: { color: '#362360', fontSize: 18, marginLeft: 8, fontFamily: 'VibePixel' },
});

export default HomeScreen;