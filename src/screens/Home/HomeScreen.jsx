import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, Animated, Dimensions, StyleSheet, Pressable, TouchableOpacity,
} from 'react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VIBES } from '../../data/vibeData';

const { width: SCREEN_W } = Dimensions.get('window');

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

// ─── 雲狀對話框 ──────────────────────────────────────────────
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

// ─── 波浪背景 ──────────────────────────────
function WavyBackground({ w, h }) {
  // 💡 【註解：波浪溢出高度】 這裡的 offset 控制波浪往上「吃」進黃色區域的高度
  // 如果妳覺得波浪太高蓋到動物，可以把這裡調小 (例如 80 或 100)
  const offset = 120; 
  const totalH = h + offset;

  // 💡 【註解：波浪形狀】 這些 C 後面的數字是貝茲曲線的控制點
  const whiteWave = `M 0,90 C ${w*0.4},60 ${w*0.7},180 ${w},70 L ${w},${totalH} L 0,${totalH} Z`;
  const blueWave  = `M 0,150 C ${w*0.4},80 ${w*0.7},220 ${w},140 L ${w},${totalH} L 1,${totalH} Z`;

  return (
    <Svg width={w} height={totalH} style={[StyleSheet.absoluteFillObject, { top: -offset }]}>
      <Path d={whiteWave} fill={PAL.white} />
      <Path d={blueWave} fill={PAL.blue} />
    </Svg>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [frameIdx,  setFrameIdx]  = useState(0);
  const [blueH, setBlueH] = useState(0); 
  const scrollRef  = useRef(null);

  const FRAMES = [
    [require('../../../assets/vibe1.png'),  require('../../../assets/vibe2.png')],
    [require('../../../assets/vibe3.png'),  require('../../../assets/vibe4.png')],
    [require('../../../assets/vibe5.png'),  require('../../../assets/vibe6.png')],
    [require('../../../assets/vibe7.png'),  require('../../../assets/vibe8.png')],
    [require('../../../assets/vibe9.png'),  require('../../../assets/vibe10.png')],
    [require('../../../assets/vibe11.png'), require('../../../assets/vibe12.png')],
    [require('../../../assets/vibe13.png'), require('../../../assets/vibe13.png')],
  ];

  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dayCh = ['日','月','火','水','木','金','土'][now.getDay()];
  const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${dayCh}`;

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
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
        Animated.timing(float, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

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
      {/* ==========================================
          [圖層 1] 底層背景 (純色塊 + 波浪)
          這個圖層專門用來畫背景，絕對不會干擾到文字排版
      ========================================== */}
      <View style={styles.bgLayer}>
        <View style={styles.bgYellow} />
        {/* onLayout 會把這一塊的高度存給 blueH，用來畫底下的波浪 */}
        <View style={styles.bgBlue} onLayout={e => setBlueH(e.nativeEvent.layout.height)}>
          {blueH > 0 && <WavyBackground w={SCREEN_W} h={blueH} />}
        </View>
      </View>

      {/* ==========================================
          [圖層 2] 上層內容 (所有會動、可以點擊的元素)
          蓋在背景層上面，負責真實的排版
      ========================================== */}
      <View style={styles.contentLayer}>
        
        {/* ─── 上半部區塊 (時間 + 動物) ─── */}
        <View style={[styles.topSection, { paddingTop: insets.top + 8 }]}>
          
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
              <Text style={styles.statusText}>{hhmm} · {dateStr}</Text>
            </View>
          </View>

          {/* 舞台 (對話框與動物) */}
          <View style={styles.stageHolder}>
            <Animated.View style={[
              styles.stageWrap,
              {
                transform: [
                  { translateY: floatY },
                  ...(activeIdx === 6 ? [{ rotate: swingRot }] : []), // 把搖擺動畫加回來了！
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

        {/* ─── 下半部區塊 (卡片 + 點點) ─── */}
        <View style={styles.bottomSection}>
          
          {/* 卡片容器：用來限定左右滑動的區域高度 */}
          <View style={styles.cardContainer}>
            <ScrollView
              ref={scrollRef} horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={SCREEN_W}
              snapToAlignment="start"
              onMomentumScrollEnd={onMomentumEnd}
            >
              {VIBES.map((item, i) => (
                <Pressable key={item.key} style={styles.card} onPress={() => goTrip(item.key)}>
                  {/* ✅ 修改 1：將 cardInner 改為 cardRowContainer (改成橫排) */}
                  <View style={styles.cardRowContainer}>
                    
                    {/* ✅ 修改 2：新增這層 View (styles.textStack)，用來包裹左邊的文字群 */}
                    <View style={styles.textStack}>
                      <View style={styles.cardHeadRow}>
                        <View style={styles.noBadge}>
                          <Text style={styles.noBadgeText}>NO.{String(i + 1).padStart(2, '0')}</Text>
                        </View>
                        <Text style={styles.cardZh}>{item.zh}</Text>
                      </View>
                      <Text style={styles.cardEn}>{item.en.toUpperCase()}</Text>
                    </View>

                    {/* 此按鈕會因為 cardRowContainer 的設定跑到右邊 */}
                    <View style={styles.cta}>
                      <Text style={styles.ctaText}>GO GO</Text>
                      <Text style={styles.ctaArrow}>→</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 底部分頁點點 */}
          <View style={styles.dotsRow}>
            {VIBES.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIdx && styles.dotOn]} />
            ))}
          </View>

        </View>
      </View>
    </View>
  );
}

const BUBBLE_SIZE = SCREEN_W * 0.82; 
const ANIMAL_SIZE = SCREEN_W * 0.68; 

const styles = StyleSheet.create({
  root: { flex: 1 },
  
  /* ==========================================
     背景層樣式 (控制黃藍色塊比例)
     ========================================== */
  bgLayer: { ...StyleSheet.absoluteFillObject },
  
  // 💡 【註解：上下比例調整】 flex: 1.1 代表黃色背景佔 55%，flex: 0.9 代表藍色背景佔 45%
  // 如果想讓波浪的起始線往下移，就把黃色調大 (如 1.2)、藍色調小 (如 0.8)
  bgYellow: { flex: 1.1, backgroundColor: PAL.yellow }, 
  bgBlue: { flex: 0.9, backgroundColor: PAL.blue, position: 'relative' },
  
  /* ==========================================
     內容層樣式 (控制實際排版)
     ========================================== */
  contentLayer: { ...StyleSheet.absoluteFillObject },
  
  // ─── 上半部 ───
  // 💡 flex: 1 代表上半部佔滿剩餘空間，往下推擠下半部
  topSection: { flex: 1 },
  
  statusBar: { flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PAL.pink },
  statusText: { fontFamily: 'NotoSansTC_700Bold', fontSize: 14, color: PAL.black, letterSpacing: 0.5 },

  // 舞台 (對話框+動物)：利用 flex 的特性，讓它在「上半部剩餘空間」中絕對置中
  stageHolder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageWrap: { width: BUBBLE_SIZE, height: BUBBLE_SIZE * 1.095, alignItems: 'center', justifyContent: 'center' },
  
  // 💡 【註解：動物微調】 marginTop 可以控制動物要在對話框裡的哪個高度
  animal: { width: ANIMAL_SIZE, height: ANIMAL_SIZE, marginTop: -BUBBLE_SIZE * 0.05, zIndex: 2 },
  
  // ─── 下半部 ───
  // 💡 【註解：防護罩】 paddingBottom: 130 這是最重要的「防護罩」！
  // 它可以確保卡片跟點點，絕對不會掉下去撞到妳那顆懸浮的 Tab 導覽列
  // 如果妳覺得距離導覽列太遠/太近，請修改這裡的數值！
  bottomSection: {
    justifyContent: 'flex-end',
    paddingBottom: 130, 
  },

  // 💡 【註解：卡片區塊高度】 限制高度，確保左右箭頭有基準點可以「垂直置中」
  cardContainer: {
    height: 180, // 如果文字被截斷，可以調高這裡
    justifyContent: 'center',
    position: 'relative',
  },
  
  // 讓單個卡片佔滿整個螢幕寬度並置中
 // 讓卡片佔滿寬度並加入左右留白
  card: { width: SCREEN_W, paddingHorizontal: 28, justifyContent: 'center' },
  // 讓文字在左、按鈕在右
  cardRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  textStack: { alignItems: 'flex-start', flex: 1 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  
  // 縮小標籤與文字
  noBadge: { backgroundColor: PAL.yellow, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  noBadgeText: { fontFamily: 'NotoSansTC_900Black', fontSize: 11, color: PAL.black, letterSpacing: 1 },
  cardZh: { fontFamily: 'NotoSansTC_900Black', fontSize: 24, color: PAL.white, letterSpacing: 1 },
  cardEn: { fontFamily: 'NotoSansTC_700Bold', fontSize: 12, color: PAL.white, letterSpacing: 1.5, opacity: 0.9 },
  
  // 縮小 GoGo 按鈕與字體
  cta: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: PAL.pink, paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 100, 
    shadowColor: PAL.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4
  },
  ctaText:  { fontFamily: 'NotoSansTC_900Black', fontSize: 12, color: PAL.white, letterSpacing: 1 },
  ctaArrow: { fontFamily: 'NotoSansTC_900Black', fontSize: 14, color: PAL.white, marginLeft: 6 },

  // ─── 分頁小圓點 ───
  // 💡 paddingVertical 可以控制點點與卡片(上)、與防護罩(下)的距離
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10 },
  dot: { width: 8, height: 8, backgroundColor: PAL.white, borderRadius: 4, opacity: 0.5 },
  dotOn: { opacity: 1, width: 24, backgroundColor: PAL.yellow },
});