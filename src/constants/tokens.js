/**
 * Design tokens — 統一全 App 的 spacing / typography / radius 階層
 *
 * 設計原則：
 *   1. 數值用 8 的倍數（手機螢幕通用基準）
 *   2. 階層不超過 6 級，避免決策碎片化
 *   3. 命名語意化（descriptive），而非絕對數字
 *
 * 使用方式：
 *   import { SPACE, TYPE, RADIUS } from '../../constants/tokens';
 *   <View style={{ padding: SPACE.md, gap: SPACE.sm }} />
 *   <Text style={{ fontSize: TYPE.body }} />
 */

// ─── Spacing scale ─────────────────────────────────────────────────────────
// 用於 padding / margin / gap
export const SPACE = {
  xxs: 2,    // 極小間距（icon 與文字微貼）
  xs:  4,    // 文字行內小間距
  sm:  8,    // 預設小間距（icon 與文字）
  md:  16,   // 標準間距（卡片內 padding、區塊間距）
  lg:  24,   // 大間距（區塊分隔、頁面 padding）
  xl:  32,   // 超大間距（章節分隔）
  xxl: 48,   // 大型留白
};

// ─── Typography scale ──────────────────────────────────────────────────────
// 字級階層 — 5 級就夠用
export const TYPE = {
  caption:    11,   // 次要說明文字、kicker、時間戳
  body:       14,   // 內文
  bodyLg:     16,   // 較大內文、按鈕文字
  heading:    18,   // 卡片標題、區塊標題
  display:    22,   // 頁面主標題
  displayLg:  32,   // 大數字（溫度、統計值）
  hero:       64,   // 超大數字（hero 區大溫度）
};

// ─── Radius scale ──────────────────────────────────────────────────────────
// 圓角階層
export const RADIUS = {
  sm:    8,    // 小元件（tag、chip）
  md:    16,   // 卡片
  lg:    24,   // 大卡片
  xl:    32,   // 圓潤大元件
  pill:  999,  // 膠囊形（全圓角）
  full:  9999, // 圓形
};

// ─── 動畫時長 ──────────────────────────────────────────────────────────────
// 統一動畫節奏，避免不協調
export const DURATION = {
  fast:    150,   // 按鈕按壓回饋
  normal:  280,   // 預設轉場
  slow:    450,   // 大幅度變化
  ambient: 1800,  // 環境動畫（呼吸、浮動）
};
