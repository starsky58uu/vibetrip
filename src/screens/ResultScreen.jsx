import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { mockPlans } from '../data/mockData';
import * as Location from 'expo-location';
import axios from 'axios';

const { width } = Dimensions.get('window');

const themeColors = {
  background: '#362360', 
  textMain: '#E9F3FB',   
  textSub: '#84A6D3',    
  accentMain: '#C95E9E', 
  accentSub: '#C3AED9',  
};

const ResultScreen = ({ route, navigation }) => {
  const [currentTime, setCurrentTime] = useState('--:--');

useEffect(() => {
  const updateTime = () => {
    const now = new Date();
    setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };
  updateTime();
  const timer = setInterval(updateTime, 60000);
  return () => clearInterval(timer);
}, []);
  // 🌟 從路由取得資料，並解構出 vibeKey
  const { plan, vibeKey, timestamp, headerData } = route.params || {};
  const [currentPlan, setCurrentPlan] = useState(plan || { title: '驚喜盲盒', items: [] });
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lastShakeDate = useRef(Date.now());

  // 🌟 監聽首頁傳來的新行程（當點擊底部大按鈕跳轉時）
  useEffect(() => {
    if (plan) {
      console.log("✅ 收到新行程：", plan.title);
      setCurrentPlan(plan);
      
      // 入場動畫
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }).start();
    }
  }, [timestamp]); // 👈 透過時間戳記判斷是不是新的一次抽取

  // 🌟 搖一搖感測器邏輯
  useEffect(() => {
    Accelerometer.setUpdateInterval(50);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // 判斷搖晃：門檻 2.0，冷卻時間 1 秒
      if (acceleration > 2.0 && now - lastShakeDate.current > 1000) {
        lastShakeDate.current = now;
        handleReshuffle();
      }
    });

    return () => subscription && subscription.remove();
  }, [currentPlan, vibeKey]); // 👈 這裡要監聽，確保 handleReshuffle 抓得到最新的 Key

  // 🌟 搖一搖洗牌邏輯
  const handleReshuffle = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. 動畫開始
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      
      // 2. 根據「目前的類別」抽新的
      const category = vibeKey || 'cafe';
      const options = mockPlans[category] || mockPlans['cafe'];
      
      // 隨機抽一個跟現在不一樣的行程
      let nextPlan = options[Math.floor(Math.random() * options.length)];
      if (options.length > 1) {
        while (nextPlan.title === currentPlan.title) {
          nextPlan = options[Math.floor(Math.random() * options.length)];
        }
      }

      setCurrentPlan(nextPlan);

      // 3. 動畫結束
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBadge}>
        <View style={styles.dot} />
        <Text style={styles.headerText}>
          {headerData?.district || '大安區'} · {currentTime} · {headerData?.weather || '☁️ 22℃'}
        </Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>{currentPlan.title}</Text>

          <View style={styles.glassPanel}>
            <View style={styles.timelineLine} />
            {currentPlan.items && currentPlan.items.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timeMarker, { backgroundColor: item.color }]}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={[styles.eventCard, { backgroundColor: item.color }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name={item.icon} size={22} color="#362360" />
                    <Text style={styles.activityTitle}>{item.activity}</Text>
                  </View>
                  <Text style={styles.activityDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.shakeHintContainer}>
            <Ionicons name="phone-portrait-outline" size={24} color={themeColors.accentSub} />
            <Text style={styles.shakeText}>不滿意？搖一搖手機重新抽取！</Text>
          </View>
          <TouchableOpacity 
            style={styles.reshuffleButton} 
            activeOpacity={0.8}
            onPress={handleReshuffle} // 直接複用原本搖一搖的邏輯
>
            <Ionicons name="refresh" size={20} color={themeColors.textMain} />
            <Text style={styles.reshuffleButtonText}>再抽一次驚喜盲盒</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.arButton} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AR')}
          >
            <Ionicons name="scan" size={22} color="#362360" />
            <Text style={styles.arButtonText}>開啟 AR 實境導航</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background, paddingTop: 60 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9F3FB', 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14, marginLeft: 24, alignSelf: 'flex-start',
    borderWidth: 2.5, borderColor: '#1E1238', shadowColor: themeColors.accentMain, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    zIndex: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors.accentMain, marginRight: 8 },
  headerText: { fontFamily: 'VibePixel', color: '#362360', fontSize: 12 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 120 },
  pageTitle: { 
    fontFamily: 'VibePixel', fontSize: 24, color: themeColors.textMain, 
    marginBottom: 25, marginLeft: 10,
    textShadowColor: themeColors.accentMain, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 
  },
  glassPanel: {
    backgroundColor: 'rgba(54, 35, 96, 0.65)', 
    borderRadius: 40, padding: 20,
    borderWidth: 2, borderColor: 'rgba(233, 243, 251, 0.15)',
  },
  timelineLine: {
    position: 'absolute', left: 42, top: 40, bottom: 40,
    width: 3, backgroundColor: 'rgba(233, 243, 251, 0.2)', borderRadius: 2,
  },
  timelineItem: { flexDirection: 'row', marginBottom: 30, alignItems: 'flex-start' },
  timeMarker: {
    width: 60, paddingVertical: 5, borderRadius: 10, alignItems: 'center',
    borderWidth: 2, borderColor: '#1E1238', zIndex: 2,
  },
  timeText: { fontFamily: 'VibePixel', fontSize: 11, color: '#362360' },
  eventCard: {
    flex: 1, marginLeft: 15, borderRadius: 24, padding: 16,
    borderWidth: 2.5, borderColor: '#1E1238',
    shadowColor: '#1E1238', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityTitle: { fontFamily: 'VibePixel', fontSize: 16, color: '#362360', marginLeft: 8 },
  activityDesc: { fontFamily: 'VibePixel', fontSize: 12, color: 'rgba(54, 35, 96, 0.8)', lineHeight: 18 },
  shakeHintContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, marginBottom: 15 },
  shakeText: { fontFamily: 'VibePixel', fontSize: 13, color: themeColors.textSub, marginLeft: 10 },
  arButton: {
    backgroundColor: themeColors.accentMain, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, gap: 10,
    borderWidth: 2.5, borderColor: '#1E1238',
    shadowColor: themeColors.textMain, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
  },
  reshuffleButton: {
    backgroundColor: 'rgba(201, 94, 158, 0.2)', // 桃紅色的透明感背景
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 15, // 與下方 AR 按鈕保持間距
    borderWidth: 2,
    borderColor: themeColors.accentMain,
    borderStyle: 'dashed', // 虛線增加一種「盲盒」的活潑感
  },
  reshuffleButtonText: {
    fontFamily: 'VibePixel',
    fontSize: 16,
    color: themeColors.textMain,
    marginLeft: 8,
  },
  arButtonText: { fontFamily: 'VibePixel', fontSize: 17, color: '#362360' },
});

export default ResultScreen;