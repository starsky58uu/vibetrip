import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T, Fonts } from '../../constants/theme';
import { VIBES } from '../../data/vibeData';
import VibeIcon from '../../components/VibeIcon';

const SHAKE_THRESHOLD = 1.8;   // g-force delta
const SHAKE_COOLDOWN  = 700;   // ms

export default function ShakeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const [vibeIndex, setVibeIndex] = useState(() => {
    const key = route.params?.vibeKey || 'cafe';
    return VIBES.findIndex(v => v.key === key) || 0;
  });
  const [shakeCount, setShakeCount] = useState(0);
  const [shaking, setShaking] = useState(false);

  const lastShakeRef = useRef(0);
  const lastAccRef = useRef({ x: 0, y: 0, z: 0 });
  const driftAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const vibe = VIBES[vibeIndex];

  // Drift animation (idle float)
  useEffect(() => {
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, { toValue: -6, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(driftAnim, { toValue: 6, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    drift.start();
    return () => drift.stop();
  }, []);

  const triggerShake = () => {
    const now = Date.now();
    if (now - lastShakeRef.current < SHAKE_COOLDOWN) return;
    lastShakeRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShaking(true);
    setShakeCount(c => c + 1);

    // shake jitter animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setVibeIndex(i => (i + 1) % VIBES.length);
      setShaking(false);
    }, 350);
  };

  // Accelerometer shake detection
  useEffect(() => {
    let sub;
    Accelerometer.setUpdateInterval(100);
    sub = Accelerometer.addListener(({ x, y, z }) => {
      const last = lastAccRef.current;
      const delta = Math.sqrt(
        Math.pow(x - last.x, 2) +
        Math.pow(y - last.y, 2) +
        Math.pow(z - last.z, 2)
      );
      lastAccRef.current = { x, y, z };
      if (delta > SHAKE_THRESHOLD) triggerShake();
    });
    return () => sub?.remove();
  }, []);

  const phoneTranslate = shaking
    ? shakeAnim
    : driftAnim;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>SHAKE TO REROLL</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* center illustration */}
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ translateY: phoneTranslate }] }}>
          <View style={[styles.phone, { shadowColor: vibe.accent }]}>
            <View style={styles.phoneNotch} />
            <View style={[styles.phoneCircle, { backgroundColor: vibe.accent }]}>
              <VibeIcon kind={vibe.icon} size={34} color={T.paper} />
            </View>
            <Text style={styles.phoneLabel}>{vibe.zh}</Text>
          </View>
          {shaking && (
            <>
              <Text style={[styles.motionMark, { color: vibe.accent, top: -12, right: -22 }]}>～</Text>
              <Text style={[styles.motionMark, { color: vibe.accent, top: 20, left: -28 }]}>～</Text>
              <Text style={[styles.motionMark, { color: vibe.accent, bottom: 10, right: -26, fontSize: 16 }]}>＊</Text>
            </>
          )}
        </Animated.View>

        <Text style={styles.prompt}>
          用力 <Text style={[styles.promptAccent, { color: vibe.accent }]}>搖</Text> 一搖 ——
        </Text>
        <Text style={styles.promptSub}>不想吃麵？換下一個 vibe</Text>

        {/* counters */}
        <View style={styles.counters}>
          <View style={styles.counterItem}>
            <Text style={[styles.counterNum, { color: vibe.accent }]}>
              {String(shakeCount).padStart(2, '0')}
            </Text>
            <Text style={styles.counterLabel}>SHAKES</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.counterItem}>
            <Text style={styles.counterVibe}>{vibe.zh}</Text>
            <Text style={styles.counterLabel}>CURRENT</Text>
          </View>
        </View>
      </View>

      {/* bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.btnManual, { backgroundColor: vibe.accent }]}
          onPress={triggerShake}
          activeOpacity={0.8}
        >
          <Text style={styles.btnManualText}>手動模擬搖一搖</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnGo}
          onPress={() => navigation.navigate('TripMain', { vibeKey: vibe.key, refreshKey: Date.now() })}
          activeOpacity={0.8}
        >
          <Text style={styles.btnGoText}>看新行程 →</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>✧ HAPTIC + MOTION SENSOR ✧</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.paper2,
    borderWidth: 1, borderColor: T.line,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: T.ink2, marginTop: -2 },
  headerLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: T.ink3,
    letterSpacing: 4,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  phone: {
    width: 120, height: 180,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1.5,
    borderColor: T.ink,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 8, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 0,
    elevation: 6,
  },
  phoneNotch: {
    width: 30, height: 3,
    backgroundColor: T.ink4,
    borderRadius: 2,
  },
  phoneCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  phoneLabel: {
    fontFamily: Fonts.serifBold,
    fontSize: 11,
    color: T.ink,
  },
  motionMark: {
    position: 'absolute',
    fontFamily: Fonts.serif,
    fontWeight: '700',
    fontSize: 22,
  },

  prompt: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    color: T.ink,
    marginTop: 32,
    letterSpacing: 1.5,
  },
  promptAccent: { fontFamily: Fonts.latinItalic, fontWeight: '400' },
  promptSub: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink3, marginTop: 4 },

  counters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 22,
  },
  counterItem: { alignItems: 'center' },
  counterNum: {
    fontFamily: Fonts.latin,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
  counterVibe: { fontFamily: Fonts.serif, fontSize: 16, fontWeight: '500', color: T.ink },
  counterLabel: { fontFamily: Fonts.mono, fontSize: 9, color: T.ink3, letterSpacing: 3, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: T.line },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    alignItems: 'stretch',
  },
  btnManual: {
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnManualText: { fontFamily: Fonts.serifBold, fontSize: 13, color: T.paper, letterSpacing: 1 },
  btnGo: {
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  btnGoText: { fontFamily: Fonts.serif, fontSize: 13, color: T.ink },
  hint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: T.ink4,
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 2,
  },
});
