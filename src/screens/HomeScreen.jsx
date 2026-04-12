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
// 🌟 請確保這些 KEY 已正確設定
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY; 
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

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

// 🌟 獨立出「質感泡泡小卡」元件
const BubbleCard = ({ message, onDismiss }) => {
  const popAnim = useRef(new Animated.Value(0)).current; // 0 = 顯示, 1 = 爆炸消失

  const handleClose = () => {
    // 泡泡破裂動畫
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  // 卡片本體的縮放與透明度
  const cardScale = popAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [1, 1.05, 0]
  });
  const cardOpacity = popAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0]
  });

  // 生成 6 顆散開的小泡泡
  const particles = [...Array(6)].map((_, i) => {
    const angle = (i * Math.PI * 2) / 6;
    const distance = 40; // 泡泡噴出的距離
    return {
      translateX: popAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(angle) * distance]
      }),
      translateY: popAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(angle) * distance]
      }),
      scale: popAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1.5, 0] // 泡泡從小變大再消失
      }),
      opacity: popAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0]
      })
    };
  });

  return (
    <View style={styles.bubbleCardWrapper}>
      {/* 渲染爆炸小泡泡 */}
      {particles.map((animStyle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            { transform: [{ translateX: animStyle.translateX }, { translateY: animStyle.translateY }, { scale: animStyle.scale }], opacity: animStyle.opacity }
          ]}
        />
      ))}
      
      {/* 卡片本體 */}
      <Animated.View style={[styles.greetingCard, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
        <Text style={styles.greetingText}>{message}</Text>
        <TouchableOpacity activeOpacity={0.6} onPress={handleClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Ionicons name="close" size={18} color={themeColors.textSub} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// 🌟 輔助函式：根據天氣狀況回傳對應的 Ionicons 名稱 (使用線條風格)
const getWeatherIcon = (condition) => {
  switch (condition) {
    case 'Clear': return 'sunny-outline';
    case 'Clouds': return 'cloud-outline';
    case 'Rain':
    case 'Drizzle': return 'rainy-outline';
    case 'Thunderstorm': return 'thunderstorm-outline';
    case 'Snow': return 'snow-outline';
    default: return 'partly-sunny-outline'; // 預設
  }
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 🌟 進場動畫 (從上方滑入)
  const slideAnimY = useRef(new Animated.Value(-100)).current;
  
  const [location, setLocation] = useState(null);
  const [district, setDistrict] = useState(null);
  // 🌟 分開儲存氣溫與天氣圖示，不要用 Emoji 字串
  const [temperature, setTemperature] = useState(null); 
  const [weatherCondition, setWeatherCondition] = useState(null); // 'Clear', 'Rain' 等
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  
  const [greetingMessage, setGreetingMessage] = useState(null);
  const [isGreetingVisible, setIsGreetingVisible] = useState(true);

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
          const condition = res.data.weather[0].main; 
          
          setTemperature(`${temp}°C`);
          setWeatherCondition(condition);

          // 🌟 無 AI 感質感文案
          let msg = `今日氣溫 ${temp}°C，適合出門走走。`;
          if (condition === 'Rain' || condition === 'Drizzle') msg = '今日降雨機率高，出門請留意攜帶雨具。';
          else if (temp >= 28) msg = '今日氣溫較高，外出請注意防曬與水分補充。';
          else if (temp <= 18) msg = '今日氣溫偏涼，請適時添加衣物。';

          setGreetingMessage(msg);
        }
      } catch (error) { 
        // 錯誤時預設，不使用 Emoji
        setTemperature('25°C'); 
        setWeatherCondition('Clear');
        setGreetingMessage('願妳有美好的一天。');
      }
    };
    fetchWeather();
  }, [location]);

  // 觸發進場動畫
  useEffect(() => {
    if (greetingMessage && isGreetingVisible) {
      Animated.spring(slideAnimY, {
        toValue: 0,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
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

  const isLoading = !location || !district || !temperature;

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
            
            {/* 🌟 質感貼心小語區塊 */}
            {isGreetingVisible && greetingMessage && (
              <Animated.View style={[styles.greetingContainer, { transform: [{ translateY: slideAnimY }] }]}>
                <BubbleCard 
                  message={greetingMessage} 
                  onDismiss={() => setIsGreetingVisible(false)} 
                />
              </Animated.View>
            )}

            {/* 🌟 修改此處的頂部列樣式和天氣圖示 approach */}
            <View style={styles.topRow} pointerEvents="box-none">
              <TouchableOpacity 
                style={styles.headerBadge}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('WeatherDetail', { lat: location.latitude, lon: location.longitude, district: district })}
              >
                <View style={styles.dot} />
                {/* 🌟 地區、時間文字 */}
                <Text style={styles.headerText}>{district} · {currentTime} · </Text>
                {/* 🌟 替換 Emoji 為質感向量圖示 */}
                <Ionicons name={getWeatherIcon(weatherCondition)} size={16} color={themeColors.textMain} />
                {/* 🌟 溫度文字 */}
                <Text style={styles.headerText}> {temperature}</Text>
                {/* 🌟 加一個小 chevron 提示可點擊 (可選) */}
                <Ionicons name="chevron-forward" size={14} color={themeColors.textSub} style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.recenterButton} 
                activeOpacity={0.8}
                onPress={() => mapRef.current.animateToRegion(location, 1000)}
              >
                {/* 🌟 定位圖示也換成更有科技感的樣式 */}
                <Ionicons name="navigate" size={20} color={themeColors.textMain} />
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
  container: { flex: 1, backgroundColor: '#362360' },
  loadingContainer: { flex: 1, backgroundColor: '#362360', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#E9F3FB', fontSize: 18, marginVertical: 20, fontFamily: 'VibePixel' },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 60, paddingBottom: 110 },
  
  greetingContainer: {
    position: 'absolute',
    top: 120, // 稍微調低一點，避免擋到新的 header 質感
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  bubbleCardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 18, 56, 0.75)', // 深色半透明玻璃感
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(233, 243, 251, 0.15)', // 極細微的反光邊框
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  greetingText: {
    color: '#E9F3FB',
    fontSize: 13, 
    letterSpacing: 0.5, // 拉開字距增加質感
    fontFamily: 'VibePixel',
    marginRight: 12,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.accentMain,
  },

  /* 🌟 全新質感頂部導航列樣式 */
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  headerBadge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(30, 18, 56, 0.75)', // 深色毛玻璃底
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20,
    borderWidth: 1, 
    borderColor: 'rgba(233, 243, 251, 0.2)', // 細緻微光邊框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: themeColors.accentMain, 
    marginRight: 10,
    shadowColor: themeColors.accentMain, // 🌟 讓小圓點有發光感
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4
  },
  headerText: { 
    color: '#E9F3FB', // 淺色文字
    fontSize: 13, 
    fontFamily: 'VibePixel',
    letterSpacing: 0.5 
  },
  recenterButton: {
    backgroundColor: 'rgba(30, 18, 56, 0.75)', // 呼應左邊的玻璃底
    width: 44, 
    height: 44, 
    borderRadius: 22,
    borderWidth: 1, 
    borderColor: 'rgba(233, 243, 251, 0.2)', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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