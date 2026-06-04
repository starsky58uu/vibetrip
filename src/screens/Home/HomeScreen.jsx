import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, Animated, Dimensions, StyleSheet, Pressable, TouchableOpacity, Easing,
} from 'react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { VIBES } from '../../data/vibeData';
import useWeather, { owmIconToKind } from '../../hooks/useWeather';
import { useAuth } from '../../context/AuthContext';
import { usePAL } from '../../context/DimContext';

// 天氣動畫圖幀（亮色 + dim 版）
// 天氣動畫圖（始終保持鮮豔色）
const WEATHER_FRAMES = {
  sunny:  [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  partly: [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  cloudy: [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  night:  [require('../../../assets/sun1.png'),  require('../../../assets/sun2.png')],
  rain:   [require('../../../assets/rain1.png'), require('../../../assets/rain2.png'),
           require('../../../assets/rain3.png'), require('../../../assets/rain4.png')],
};

const { width: SCREEN_W } = Dimensions.get('window');

// 預設亮色（fallback；元件內會用 usePAL() 取真實當前色票）
const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

// ─── 不規則雲狀對話框（手繪感） ──────────────────────────────
// 用 SVG Path 把多個大小不一的弧連起來，做成不對稱的有機形狀
// 同時保留底下幾顆小圓 = 思考泡泡尾巴
function CloudBubble({ size, color = PAL.pink }) {
  // viewBox 100×110，路徑刻意做不對稱：右上比左上凸、左下比右下大
  // 每一個 Q 都是一個「凸起」，半徑刻意不同
  const cloudPath = `
    M 18,55
    Q 8,40 18,28
    Q 22,12 38,18
    Q 48,2 62,12
    Q 78,5 84,22
    Q 98,28 90,42
    Q 100,55 88,64
    Q 96,80 78,80
    Q 70,95 56,84
    Q 40,94 32,80
    Q 16,82 18,68
    Q 6,62 18,55
    Z
  `.replace(/\s+/g, ' ').trim();

  return (
    <Svg width={size} height={size * 1.1} viewBox="-4 -4 108 120">
      {/* 主雲體 */}
      <Path d={cloudPath} fill={color} />
      {/* 思考泡泡尾巴（兩顆小圓往左下）*/}
      <SvgCircle cx="28" cy="100" r="6" fill={color} />
      <SvgCircle cx="18" cy="110" r="3" fill={color} />
    </Svg>
  );
}

// ─── 波浪背景 ──────────────────────────────
function WavyBackground({ w, h, colors }) {
  const C = colors || PAL;
  // 💡 【註解：波浪溢出高度】 這裡的 offset 控制波浪往上「吃」進黃色區域的高度
  // 如果妳覺得波浪太高蓋到動物，可以把這裡調小 (例如 80 或 100)
  const offset = 120; 
  const totalH = h + offset;

  // 💡 【註解：波浪形狀】 這些 C 後面的數字是貝茲曲線的控制點
  const whiteWave = `M 0,90 C ${w*0.4},60 ${w*0.7},180 ${w},70 L ${w},${totalH} L 0,${totalH} Z`;
  const blueWave  = `M 0,150 C ${w*0.4},80 ${w*0.7},220 ${w},140 L ${w},${totalH} L 1,${totalH} Z`;

  return (
    <Svg width={w} height={totalH} style={[StyleSheet.absoluteFillObject, { top: -offset }]}>
      <Path d={whiteWave} fill={C.white} />
      <Path d={blueWave} fill={C.blue} />
    </Svg>
  );
}

// vibe 動畫圖（13 隻動物 × 2 幀）
const VIBE_FRAMES = [
  [require('../../../assets/vibe1.png'),  require('../../../assets/vibe2.png')],
  [require('../../../assets/vibe3.png'),  require('../../../assets/vibe4.png')],
  [require('../../../assets/vibe5.png'),  require('../../../assets/vibe6.png')],
  [require('../../../assets/vibe7.png'),  require('../../../assets/vibe8.png')],
  [require('../../../assets/vibe9.png'),  require('../../../assets/vibe10.png')],
  [require('../../../assets/vibe11.png'), require('../../../assets/vibe12.png')],
  [require('../../../assets/vibe13.png'), require('../../../assets/vibe13.png')],
];

// ─── 飄浮愛心（摸動物時噴出來的）──────────────────────────────────────────
function Heart({ startX, drift, size, delay, color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // 用 setTimeout 強制延遲，避免 native driver 的 delay 邊界問題
    const t = setTimeout(() => {
      Animated.timing(v, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  // 從頭頂往上飛、左右飄、放大後縮小、淡出
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -180] });
  const translateX = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, drift * 0.6] });
  const scale      = v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1.3, 0.7] });
  const opacity    = v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });

  // 起點在動物頭頂位置（stageWrap 中央往上一點），愛心會往上短距離飛
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '50%',
        top: '28%',                    // 動物頭頂位置（不是 stageWrap 頂端）
        width: size,
        height: size,
        marginLeft: -size / 2 + startX,
        opacity,
        zIndex: 999,
        transform: [
          { translateX },
          { translateY },
          { scale },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 21s-7-4.5-9.5-9.5C1 8 3 4.5 7 4.5c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 4 0 6 3.5 4.5 7C19 16.5 12 21 12 21z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const C          = usePAL();                  // 當前色票（亮 or dim）
  const [activeIdx, setActiveIdx] = useState(0);
  const [frameIdx,  setFrameIdx]  = useState(0);
  const [weatherFrame, setWeatherFrame] = useState(0);
  const [avatarUri, setAvatarUri] = useState(null);
  const { isLoggedIn } = useAuth();

  // 登入後讀本機儲存的頭像
  useEffect(() => {
    if (!isLoggedIn) { setAvatarUri(null); return; }
    AsyncStorage.getItem('vt_avatar_uri').then(uri => { if (uri) setAvatarUri(uri); });
  }, [isLoggedIn]);
  const [blueH, setBlueH] = useState(0);
  const scrollRef  = useRef(null);

  // 天氣資料 → 動畫幀（圖片始終鮮豔，讓角色在霧面背景上像貼紙跳出來）
  const { current } = useWeather();
  const weatherKind = current ? owmIconToKind(current.icon) : 'partly';
  const weatherImgs = WEATHER_FRAMES[weatherKind] || WEATHER_FRAMES.partly;
  const FRAMES = VIBE_FRAMES;

  // 天氣動畫切換（每 500ms 換一幀）
  useEffect(() => {
    const t = setInterval(
      () => setWeatherFrame(p => (p + 1) % weatherImgs.length),
      500
    );
    return () => clearInterval(t);
  }, [weatherImgs.length]);

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

  // ── 摸動物：scale 縮放 + 飄愛心 + 觸覺回饋 ─────────────────────────────
  const petScale = useRef(new Animated.Value(1)).current;
  const [hearts, setHearts] = useState([]);   // [{ id, x, y }]
  const heartIdRef = useRef(0);

  const petAnimal = useCallback(() => {
    // 1) 觸覺：輕度震動（try/catch 避免在某些模擬器上拋例外阻塞後續）
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    // 2) 動物縮放 1 → 1.12 → 1
    Animated.sequence([
      Animated.timing(petScale, { toValue: 1.12, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(petScale,  { toValue: 1,    friction: 4, tension: 180, useNativeDriver: true }),
    ]).start();

    // 3) 噴出 3 顆隨機位置愛心
    const newHearts = [0, 1, 2].map(() => ({
      id:     heartIdRef.current++,
      startX: (Math.random() - 0.5) * 80,   // 起點 X 偏移 -40 ~ +40
      drift:  (Math.random() - 0.5) * 50,   // 上升時的左右飄
      size:   22 + Math.random() * 14,      // 22~36（放大讓更明顯）
      delay:  Math.random() * 150,          // 0~150ms 錯開
    }));
    setHearts(prev => [...prev, ...newHearts]);

    // 4) 1.3 秒後移除（動畫結束）
    setTimeout(() => {
      setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)));
    }, 1400);
  }, [petScale]);

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
        <View style={[styles.bgYellow, { backgroundColor: C.yellow }]} />
        {/* onLayout 會把這一塊的高度存給 blueH，用來畫底下的波浪 */}
        <View style={[styles.bgBlue, { backgroundColor: C.blue }]} onLayout={e => setBlueH(e.nativeEvent.layout.height)}>
          {blueH > 0 && <WavyBackground w={SCREEN_W} h={blueH} colors={C} />}
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
            {/* 左：天氣動畫（直接圖，無圓框）*/}
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { screen: 'Weather' })}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image
                source={weatherImgs[weatherFrame]}
                style={styles.weatherImg}
                resizeMode="contain"
                fadeDuration={0}
              />
            </TouchableOpacity>

            {/* 右：圓形頭像/登入 icon；登入後若有 avatar 就顯示，否則顯示預設 person icon */}
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isLoggedIn && avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.circleInner} />
              ) : (
                <Image
                  source={require('../../../assets/vibe3.png')}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* 舞台 (對話框與動物) */}
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
                <CloudBubble size={BUBBLE_SIZE} color={C.pink} />
              </View>

              {/* 動物本體：可摸（縮放 + 噴愛心 + 觸覺）*/}
              <Pressable
                onPress={petAnimal}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                style={styles.animalWrap}
              >
                <Animated.View style={{ transform: [{ scale: petScale }] }}>
                  <Image
                    source={FRAMES[activeIdx][0]}
                    style={[styles.animal, { opacity: frameIdx === 0 ? 1 : 0 }]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                  <Image
                    source={FRAMES[activeIdx][1]}
                    style={[styles.animal, { position: 'absolute', opacity: frameIdx === 1 ? 1 : 0 }]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </Animated.View>
              </Pressable>

              {/* 飄浮愛心層（在動物上方，pointerEvents:none 不擋觸控）*/}
              {hearts.map(h => (
                <Heart key={h.id} startX={h.startX} drift={h.drift} size={h.size} delay={h.delay} color={C.white} />
              ))}
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
  
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  logoImg:    { width: 48, height: 48 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PAL.pink },
  weatherImg: { width: 52, height: 52 },
  circleBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: PAL.white,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  circleInner: { width: 64, height: 64, borderRadius: 32, resizeMode: 'cover' },
  statusText: { fontFamily: 'NotoSansTC_700Bold', fontSize: 14, color: PAL.black, letterSpacing: 0.5 },

  // 舞台 (對話框+動物)：往上推一點，讓對話框完全在黃色區內
  stageHolder: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  stageWrap: { width: BUBBLE_SIZE, height: BUBBLE_SIZE * 1.095, alignItems: 'center', justifyContent: 'center' },
  
  // 💡 【註解：動物微調】 marginTop 可以控制動物要在對話框裡的哪個高度
  animalWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  animal: { width: ANIMAL_SIZE, height: ANIMAL_SIZE, marginTop: -BUBBLE_SIZE * 0.05 },
  
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