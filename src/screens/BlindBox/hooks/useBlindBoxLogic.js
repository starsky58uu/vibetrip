import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { mockPlans } from '../../../data/mockData';

export const useBlindBoxLogic = (routeParams) => {
  const { plan, vibeKey, timestamp } = routeParams || {};
  const [currentPlan, setCurrentPlan] = useState(plan || { title: '驚喜盲盒', items: [] });
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lastShakeDate = useRef(Date.now());

  // 1. 監聽首頁傳來的新行程
  useEffect(() => {
    if (plan) {
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

  // 2. 搖一搖洗牌邏輯
  const handleReshuffle = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 動畫開始
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      
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

      // 動畫結束
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  // 3. 搖一搖感測器監聽
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

  return { currentPlan, fadeAnim };
};