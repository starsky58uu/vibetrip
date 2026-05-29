import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, Animated, Dimensions, StyleSheet, Pressable, TouchableOpacity,
} from 'react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VIBES } from '../../data/vibeData';
import useWeather from '../../hooks/useWeather';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── 5 色 palette ───────────────────────────────────────────────────────────
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

const FRAMES = [
  [require('../../../assets/vibe1.png'),  require('../../../assets/vibe2.png')],
  [require('../../../assets/vibe3.png'),  require('../../../assets/vibe4.png')],
  [require('../../../assets/vibe5.png'),  require('../../../assets/vibe6.png')],
  [require('../../../assets/vibe7.png'),  require('../../../assets/vibe8.png')],
  [require('../../../assets/vibe9.png'),  require('../../../assets/vibe10.png')],
  [require('../../../assets/vibe11.png'), require('../../../assets/vibe12.png')],
  [require('../../../assets/vibe13.png'), require('../../../assets/vibe13.png')],
];

// ─── 雲狀對話框（含尾巴小點）────────────────────────────────────────────────
// viewBox 留 5 單位 padding，避免右側 / 底部圓圈被切掉
function CloudBubble({ size, color = PAL.pink }) {
  return (
    <Svg width={size} height={size * 1.095} viewBox="-3 -3 108 118">
      <SvgCircle cx="50" cy="48" r="34" fill={color} />
      <SvgCircle cx="30" cy="28" r="18" fill={color} />
      <SvgCircle cx="55" cy="22" r="20" fill={color} />
      <SvgCircle cx="78" cy="30" r="16" fill={color} />
      <SvgCircle cx="15" cy="52" r="15" fill={color} />
      <SvgCircle cx="86" cy="50" r="15" fill={color} />
      <SvgCircle cx="22" cy="76" r="16" fill={color} />
      <SvgCircle cx="50" cy="82" r="18" fill={color} />
      <SvgCircle cx="78" cy="76" r="15" fill={color} />
      <SvgCircle cx="78" cy="100" r="5" fill={color} />
    </Svg>
  );
}

// ─── 藍色平緩弧頂背景（單一 quadratic 弧線，非 borderRadius 雙圓角）──────────
function BlueArc({ w, h, rise = 60 }) {
  // 從 (0, rise) 經頂點 (w/2, 0) 到 (w, rise)，往下到 (w, h) (0, h) 收尾
  const d = `M 0 ${rise} Q ${w / 2} 0, ${w} ${rise} L ${w} ${h} L 0 ${h} Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFillObject}>
      <Path d={d} fill={PAL.blue} stroke={PAL.black} strokeWidth={3} />
    </Svg>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [frameIdx,  setFrameIdx]  = useState(0);
  const [blueH, setBlueH] = useState(300);
  const scrollRef  = useRef(null);
  const { current } = useWeather();

  // 時間 / 日期 / 天氣（最上面像素風 status bar 用）
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dayCh = ['日','月','火','水','木','金','土'][now.getDay()];
  const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${dayCh}`;
  const desc = current?.description ?? '—';
  const temp = current ? Math.round(current.temperature) : '--';

  // 紅點脈動
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const t = setInterval(() => setFrameIdx(p => (p === 0 ? 1 : 0)), 450);
    return () => clearInterval(t);
  }, []);

  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const swing = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: 1,  duration: 600, useNativeDriver: true }),
        Animated.timing(swing, { toValue: -1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [swing]);
  const swingRot = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });

  useEffect(() => {
    FRAMES.flat().forEach(src => { try { Image.resolveAssetSource(src); } catch {} });
  }, []);

  const goTrip = useCallback((key) => {
    navigation.navigate('Trip', { screen: 'TripMain', params: { vibeKey: key } });
  }, [navigation]);

  const swipeTo = useCallback((idx) => {
    const clamp = Math.max(0, Math.min(VIBES.length - 1, idx));
    scrollRef.current?.scrollTo({ x: clamp * SCREEN_W, animated: true });
  }, []);

  const onMomentumEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== activeIdx) setActiveIdx(i);
  }, [activeIdx]);

  return (
    <View style={styles.root}>
      {/* ── 上半：黃色 + status bar + 對話框 + 動物 ────────────────────── */}
      <View style={styles.top}>
        {/* 像素風 status bar */}
        <View style={[styles.statusBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.statusLeft}>
            <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
            <Text style={styles.statusText}>
              {hhmm} · {dateStr} · {desc}
            </Text>
          </View>
          <Text style={styles.statusTemp}>{temp}°</Text>
        </View>

        {/* 舞台（動物 + 對話框）— 在下方，比 status bar 低 */}
        <View style={styles.stageHolder}>
          <Animated.View style={[
            styles.stageWrap,
            {
              transform: [
                { translateY: floatY },
                ...(activeIdx === 6 ? [{ rotate: swingRot }] : []),
              ],
            },
          ]}>
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <CloudBubble size={BUBBLE_SIZE} />
            </View>
            <Image
              source={FRAMES[activeIdx][frameIdx]}
              style={styles.animal}
              resizeMode="contain"
              fadeDuration={0}
            />
          </Animated.View>
        </View>
      </View>

      {/* ── 下半：藍色（SVG 單弧線）+ 內容垂直置中 ──────────────────────── */}
      <View
        style={styles.bottom}
        onLayout={e => setBlueH(e.nativeEvent.layout.height)}
      >
        <BlueArc w={SCREEN_W} h={blueH} rise={90} />

        {/* 卡片 ScrollView — flex:1 填滿、內容置中 */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollFill}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_W}
          snapToAlignment="start"
          onMomentumScrollEnd={onMomentumEnd}
        >
          {VIBES.map((item, i) => (
            <Pressable key={item.key} style={styles.card} onPress={() => goTrip(item.key)}>
              <View style={styles.cardHeadRow}>
                <View style={styles.noBadge}>
                  <Text style={styles.noBadgeText}>NO.{String(i + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.cardZh}>{item.zh}</Text>
              </View>
              <Text style={styles.cardEn}>{item.en.toUpperCase()}</Text>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>選定，出發</Text>
                <Text style={styles.ctaArrow}>{'  →'}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* 左右箭頭 — 藍色垂直正中 */}
        {activeIdx > 0 && (
          <TouchableOpacity
            style={[styles.arrow, styles.arrowLeft, { top: blueH / 2 - 22 }]}
            onPress={() => swipeTo(activeIdx - 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 10 }}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
        )}
        {activeIdx < VIBES.length - 1 && (
          <TouchableOpacity
            style={[styles.arrow, styles.arrowRight, { top: blueH / 2 - 22 }]}
            onPress={() => swipeTo(activeIdx + 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 10 }}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        )}

        {/* 頁碼點 — 底部 */}
        <View style={styles.dotsRow}>
          {VIBES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIdx && styles.dotOn]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── 尺寸 ───────────────────────────────────────────────────────────────────
const BUBBLE_SIZE = SCREEN_W * 0.88;
const ANIMAL_SIZE = SCREEN_W * 0.72;   // 動物再大

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAL.yellow },

  // 上半黃色（status bar + 舞台）
  top: {
    flex: 1.55,
    backgroundColor: PAL.yellow,
    position: 'relative',
  },

  // status bar — 像素風時間 / 日期 / 天氣
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: PAL.pink,
    borderWidth: 1, borderColor: PAL.black,
  },
  statusText: {
    fontFamily: 'Cubic11', fontSize: 13,
    color: PAL.black, letterSpacing: 0.5,
  },
  statusTemp: {
    fontFamily: 'Cubic11', fontSize: 16,
    color: PAL.black, fontWeight: '900',
  },

  // 舞台容器 — 動物 + 對話框絕對置中
  stageHolder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  stageWrap: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE * 1.095,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animal: {
    width:  ANIMAL_SIZE,
    height: ANIMAL_SIZE,
    marginTop: -BUBBLE_SIZE * 0.05,    // 微微往上，動物在對話框上半中央
    zIndex: 2,
  },

  // 下半藍色 — flex 1，背景由 SVG 畫
  bottom: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  scrollFill: { flex: 1 },

  // 卡片：垂直置中於 ScrollView
  card: {
    width: SCREEN_W,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',         // 內容垂直置中
    paddingTop: 55,                    // 留位置給弧頂
  },
  cardHeadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  noBadge: {
    backgroundColor: PAL.yellow,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 2, borderColor: PAL.black,
    borderRadius: 4,
  },
  noBadgeText: { fontFamily: 'Cubic11', fontSize: 12, color: PAL.black, letterSpacing: 1 },
  cardZh: { fontFamily: 'Cubic11', fontSize: 28, color: PAL.white, letterSpacing: 1 },
  cardEn: { fontFamily: 'Cubic11', fontSize: 13, color: PAL.yellow, letterSpacing: 1.5, marginBottom: 16 },

  cta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PAL.pink,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 3, borderColor: PAL.black,
    shadowColor: PAL.black,
    shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
  },
  ctaText:  { fontFamily: 'Cubic11', fontSize: 18, color: PAL.black, letterSpacing: 1 },
  ctaArrow: { fontFamily: 'Cubic11', fontSize: 18, color: PAL.black },

  // 箭頭（位置由 inline top 動態算）
  arrow: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PAL.white,
    borderWidth: 2, borderColor: PAL.black,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PAL.black,
    shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    zIndex: 4,
  },
  arrowLeft:  { left: 16 },
  arrowRight: { right: 16 },
  arrowText:  { fontSize: 28, color: PAL.black, marginTop: -4, fontWeight: '900' },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingBottom: 10,
  },
  dot: { width: 6, height: 6, backgroundColor: PAL.white, opacity: 0.4, borderRadius: 3 },
  dotOn: { opacity: 1, width: 22, backgroundColor: PAL.yellow },
});
