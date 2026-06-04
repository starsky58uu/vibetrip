import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Fonts } from '../../constants/theme';
import { VIBES } from '../../data/vibeData';
import { usePAL } from '../../context/DimContext';

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};
const BORDER = 0;     // 無黑框
const PILL_R = 999;
const HARD_SH = () => ({});  // 無黑色硬陰影

const VIBE_FRAMES = [
  [require('../../../assets/vibe1.png'),  require('../../../assets/vibe2.png')],
  [require('../../../assets/vibe3.png'),  require('../../../assets/vibe4.png')],
  [require('../../../assets/vibe5.png'),  require('../../../assets/vibe6.png')],
  [require('../../../assets/vibe7.png'),  require('../../../assets/vibe8.png')],
  [require('../../../assets/vibe9.png'),  require('../../../assets/vibe10.png')],
  [require('../../../assets/vibe11.png'), require('../../../assets/vibe12.png')],
  [require('../../../assets/vibe13.png'), require('../../../assets/vibe13.png')],
];

const SHAKE_THRESHOLD = 1.5;
const SHAKE_COOLDOWN  = 600;

export default function ShakeScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const C          = usePAL();

  const vibeKey = route.params?.vibeKey || 'cafe';
  const vibe    = VIBES.find(v => v.key === vibeKey) || VIBES[0];
  const vibeIdx = VIBES.findIndex(v => v.key === vibeKey);
  const frames  = VIBE_FRAMES[Math.max(0, vibeIdx) % VIBE_FRAMES.length];

  const [frameIdx,   setFrameIdx]   = useState(0);
  const [shakeCount, setShakeCount] = useState(0);
  const [shaking,    setShaking]    = useState(false);

  const lastShakeRef  = useRef(0);
  const lastAccRef    = useRef({ x: 0, y: 0, z: 0 });
  const shakeCountRef = useRef(0);
  const navigatedRef  = useRef(false);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const arcAnim   = useRef(new Animated.Value(0)).current;   // 0=idle, 1=shaking

  // 上下浮動（待機）
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(floatAnim, { toValue:  8, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // 動物幀切換
  useEffect(() => {
    const t = setInterval(() => setFrameIdx(p => (p === 0 ? 1 : 0)), 500);
    return () => clearInterval(t);
  }, []);

  // 導覽到新行程
  const goNewTrip = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'TripMain', params: { vibeKey: vibe.key, refreshKey: Date.now() } }],
      })
    );
  }, [navigation, vibe.key]);

  // 搖動處理
  const triggerShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeRef.current < SHAKE_COOLDOWN) return;
    lastShakeRef.current = now;

    shakeCountRef.current += 1;
    setShakeCount(shakeCountRef.current);
    setShaking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 弧線亮起
    Animated.sequence([
      Animated.timing(arcAnim, { toValue: 1, duration: 80,  useNativeDriver: false }),
      Animated.timing(arcAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();

    // 手機抖動
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  14, duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 80,  useNativeDriver: true }),
    ]).start(() => setShaking(false));

    if (shakeCountRef.current === 1) {
      setTimeout(goNewTrip, 1400);
    }
  }, [shakeAnim, arcAnim, goNewTrip]);

  // Accelerometer
  useEffect(() => {
    Accelerometer.setUpdateInterval(80);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const last  = lastAccRef.current;
      const delta = Math.sqrt((x-last.x)**2 + (y-last.y)**2 + (z-last.z)**2);
      lastAccRef.current = { x, y, z };
      if (delta > SHAKE_THRESHOLD) triggerShake();
    });
    return () => sub?.remove();
  }, [triggerShake]);

  const phoneTranslate = shaking ? shakeAnim : floatAnim;

  // arc 透明度（idle 時半透明，shake 時全亮）
  const arcOpInner = arcAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1]   });
  const arcOpOuter = arcAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2,  0.75] });

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: C.yellow }]}>

      {/* ── 頂部：返回 + 計數 ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={18} color={PAL.black} />
          <Text style={s.backTxt}>返回</Text>
        </TouchableOpacity>
        <Text style={s.countTxt}>
          已搖 <Text style={s.countNum}>{String(shakeCount).padStart(2, '0')}</Text> 次
        </Text>
      </View>

      {/* ── 文字標題區 ── */}
      <View style={s.headerBlock}>
        {/* CHANGE OF MIND tag */}
        <View style={[s.tag, { transform: [{ rotate: '-1deg' }] }]}>
          <Text style={s.tagTxt}>CHANGE OF MIND</Text>
        </View>

        {/* 大標：搖一搖就換 [下一個] */}
        <View style={s.titleRow}>
          <Text style={s.titleBig}>搖一搖就換</Text>
          <View style={s.titleHL}>
            <Text style={s.titleHLTxt}>下一個</Text>
          </View>
        </View>

        {/* 副標：一句話 */}
        <Text style={s.subtitle}>再也不用將就。</Text>
      </View>

      {/* ── 中央：手機插圖 ── */}
      <View style={s.center}>
        {/* 弧線 SVG */}
        <Svg width={240} height={200} viewBox="0 0 240 200" style={StyleSheet.absoluteFillObject}>
          {/* 左側弧線 */}
          <AnimatedPath
            d="M 78,55 Q 55,100 78,145"
            stroke={PAL.pink} strokeWidth={3.5} fill="none" strokeLinecap="round"
            opacity={arcOpInner}
          />
          <AnimatedPath
            d="M 58,42 Q 26,100 58,158"
            stroke={PAL.pink} strokeWidth={2.5} fill="none" strokeLinecap="round"
            opacity={arcOpOuter}
          />
          {/* 右側弧線 */}
          <AnimatedPath
            d="M 162,55 Q 185,100 162,145"
            stroke={PAL.pink} strokeWidth={3.5} fill="none" strokeLinecap="round"
            opacity={arcOpInner}
          />
          <AnimatedPath
            d="M 182,42 Q 214,100 182,158"
            stroke={PAL.pink} strokeWidth={2.5} fill="none" strokeLinecap="round"
            opacity={arcOpOuter}
          />
        </Svg>

        {/* 手機本體 */}
        <Animated.View style={[s.phone, { transform: [{ translateX: shaking ? shakeAnim : Animated.multiply(floatAnim, 0) }, { translateY: shaking ? 0 : floatAnim }] }]}>
          <View style={s.phoneNotch} />
          <Image source={frames[frameIdx]} style={s.phoneAnimal} resizeMode="contain" fadeDuration={0} />
          <View style={s.phoneBar} />
        </Animated.View>
      </View>

      {/* ── 目前 vibe 資訊卡 ── */}
      <View style={s.vibeCardWrap}>
        <View style={s.vibeCard}>
          <Image source={frames[0]} style={s.vibeIcon} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={s.vibeLabel}>NOW · 目前心情</Text>
            <Text style={s.vibeName}>{vibe.zh}</Text>
          </View>
          <Text style={s.vibeNum}>{String(shakeCount + 1).padStart(2, '0')}</Text>
        </View>
      </View>

      {/* ── 底部按鈕 ── */}
      <View style={[s.btmBar, { paddingBottom: Math.max(insets.bottom + 90, 100) }]}>
        {/* 主按鈕 */}
        <TouchableOpacity
          style={s.mainBtn}
          onPress={shakeCount > 0 ? goNewTrip : triggerShake}
          activeOpacity={0.85}
        >
          <Ionicons name="phone-portrait-outline" size={17} color={PAL.white} />
          <Text style={s.mainBtnTxt}>
            {shakeCount > 0 ? '換一份新行程' : '點這裡模擬搖一搖'}
          </Text>
        </TouchableOpacity>

        {/* 看看 / 算了 圓形按鈕 */}
        <TouchableOpacity
          style={s.seeBtn}
          onPress={shakeCount > 0 ? goNewTrip : () => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={s.seeBtnTxt}>{shakeCount > 0 ? '看看' : '算了'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Animated.Path wrapper（讓 opacity 可以 interpolate）
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ── 樣式 ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAL.yellow },

  // 頂部
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  backTxt: { fontFamily: Fonts.sansBold, fontSize: 14, color: PAL.black },
  countTxt:{ fontFamily: Fonts.sansMed, fontSize: 12, color: PAL.black },
  countNum:{ fontFamily: Fonts.sansBlack, color: PAL.blue },

  // 標題區
  headerBlock: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 8,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: PAL.pink,
    borderRadius: 4,
    borderWidth: BORDER,
    borderColor: PAL.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...HARD_SH(2, 3),
  },
  tagTxt: {
    fontFamily: Fonts.sansBlack,
    fontSize: 11,
    color: PAL.black,
    letterSpacing: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleBig: {
    fontFamily: Fonts.sansBlack,
    fontSize: 30,
    color: PAL.black,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  titleHL: {
    backgroundColor: PAL.blue,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SH(3, 3),
  },
  titleHLTxt: {
    fontFamily: Fonts.sansBlack,
    fontSize: 30,
    color: PAL.white,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Fonts.sansMed,
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    letterSpacing: 0.5,
  },

  // 中央
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phone: {
    width: 100,
    height: 164,
    borderRadius: 20,
    backgroundColor: PAL.white,
    borderWidth: BORDER,
    borderColor: PAL.black,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    ...HARD_SH(4, 5),
  },
  phoneNotch: {
    width: 30, height: 4,
    backgroundColor: PAL.black,
    borderRadius: 2,
  },
  phoneAnimal: { width: 72, height: 72 },
  phoneBar: {
    width: 36, height: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 2,
  },

  // Vibe 資訊卡
  vibeCardWrap: { paddingHorizontal: 20, marginBottom: 10 },
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PAL.white,
    borderRadius: 16,
    borderWidth: BORDER,
    borderColor: PAL.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...HARD_SH(3, 4),
  },
  vibeIcon: { width: 40, height: 40 },
  vibeLabel:{ fontFamily: Fonts.sansMed, fontSize: 10, color: 'rgba(0,0,0,0.45)', letterSpacing: 1 },
  vibeName: { fontFamily: Fonts.sansBlack, fontSize: 18, color: PAL.black, marginTop: 2 },
  vibeNum:  { fontFamily: Fonts.sansBlack, fontSize: 32, color: PAL.pink, letterSpacing: -1 },

  // 底部按鈕
  btmBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    backgroundColor: PAL.blue,
    borderRadius: PILL_R,
    borderWidth: BORDER,
    borderColor: PAL.black,
    ...HARD_SH(3, 4),
  },
  mainBtnTxt: { fontFamily: Fonts.sansBlack, fontSize: 14, color: PAL.white, letterSpacing: 0.5 },
  seeBtn: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: PAL.white,
    borderWidth: BORDER,
    borderColor: PAL.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...HARD_SH(3, 4),
  },
  seeBtnTxt: { fontFamily: Fonts.sansBlack, fontSize: 12, color: PAL.black },
});
