import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { mockPlans } from '../../../data/mockData';

export const useBlindBoxLogic = (route) => {
  const [currentTime, setCurrentTime] = useState('--:--');

  // 1.從路由取得資料
  const { plan, vibeKey, timestamp, headerData } = route.params || {};
  const [currentPlan, setCurrentPlan] = useState(plan || { title: '驚喜盲盒', items: [] });
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lastShakeDate = useRef(Date.now());

  // 2.更新時間邏輯
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // 3.監聽首頁傳來的新行程
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
  }, [timestamp]);

  // 4.搖一搖感測器邏輯
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
  }, [currentPlan, vibeKey]);

  // 5.搖一搖洗牌邏輯
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

  // 回傳 View 需要用到的變數與函式
  return {
    currentTime,
    currentPlan,
    headerData,
    fadeAnim,
    handleReshuffle
  };
};