# VibeTrip Design System

> 「卡通膠囊風」— 用大色塊、圓潤膠囊、不規則手繪雲，讓 App 看起來像繪本而不是介面。

---

## 1. 設計哲學

| 原則 | 說明 |
|---|---|
| **少色制** | 全 App 只用 5 個顏色，避免色彩污染 |
| **形狀統一** | 一律膠囊（borderRadius: 999），不混用方形圓角 |
| **角色為主** | 13 隻 vibe 動物是品牌核心，UI 退到背景 |
| **手繪不齊** | 對話框不對稱、膠囊微歪斜、虛線連接 → 親切感 |
| **大字優先** | 標題盡可能用 sansBlack（900）+ 大字級，遠看就懂 |
| **觸覺回饋** | 重要操作必有 Haptics + scale 動畫 |

---

## 2. 色彩系統

### 雙色票（亮 / 低明度）

| 角色 | Bright（白天）| Dim（莫蘭迪，護眼）|
|---|:---:|:---:|
| **yellow**（主背景） | `#E2E146` | `#F5E6C8` |
| **pink**（強調、輔助） | `#FF6FA8` | `#E5C1CD` |
| **blue**（CTA、深色塊） | `#2E45B0` | `#AAC9CE` |
| **black**（字、輪廓） | `#000000` | `#3D3A42` |
| **white**（卡片、留白） | `#FFFFFF` | `#FBF6F0` |

### 使用規則

| 顏色 | 場景 |
|---|---|
| Yellow | 整體主背景、hero 區、貼牌底 |
| Pink | 角色泡泡、輔助強調、行程膠囊第 1 順位 |
| Blue | **主要 CTA 按鈕**、行程膠囊第 3 順位、深色卡片 |
| White | 浮動卡片、輸入框、loading 海浪後層 |
| Black | 所有文字、icon、薄黑線、loading 海浪輪廓 |

### 切換方式

```jsx
import { usePAL } from '../context/DimContext';

function Screen() {
  const C = usePAL();      // 自動讀目前模式
  return <View style={{ backgroundColor: C.yellow }} />;
}
```

切換時整個 App 同時 re-render（透過 React Context），圖片預設保持鮮豔色（讓角色在霧面背景上像「貼紙」跳出）。

### 對比度檢查

| 配對 | 比例 | WCAG AA |
|---|:---:|:---:|
| 黃底 + 黑字 | 10.7 : 1 | ✅ |
| 藍底 + 白字 | 7.5 : 1 | ✅ |
| 粉底 + 黑字 | 5.0 : 1 | ✅ |
| 粉底 + 白字 | 2.3 : 1 | ❌ **避免** |

---

## 3. 字型系統

統一使用 **思源黑體（Noto Sans TC）** 四種字重，移除所有 serif / latin / mono 系列以減少 bundle 體積與冷啟動時間。

| Token | 字重 | 用途 |
|---|---|---|
| `Fonts.sans` | Regular | 內文 |
| `Fonts.sansMed` | Medium | 次要強調、時間/距離 |
| `Fonts.sansBold` | Bold | 按鈕、標籤 |
| `Fonts.sansBlack` | Black | 標題、品牌字、CTA 文字 |

### Type Scale

```js
TYPE.caption    11   // 次要說明、kicker
TYPE.body       14   // 內文
TYPE.bodyLg     16   // 按鈕、行程地點名
TYPE.heading    18   // 卡片標題
TYPE.display    22   // 頁面主標
TYPE.displayLg  32   // 大數字
TYPE.hero       64   // hero 溫度數字
```

定義在 `src/constants/tokens.js`。

---

## 4. 間距與圓角

### Spacing Scale（8 倍數）

```js
SPACE.xxs  2     SPACE.lg   24
SPACE.xs   4     SPACE.xl   32
SPACE.sm   8     SPACE.xxl  48
SPACE.md   16
```

### Radius Scale

```js
RADIUS.sm    8       // 小 tag、chip
RADIUS.md    16      // 卡片
RADIUS.lg    24      // 大卡片
RADIUS.xl    32      // 圓潤大元件
RADIUS.pill  999     // 膠囊形（主要元素）
RADIUS.full  9999    // 圓形（頭像、icon 按鈕）
```

---

## 5. 動畫節奏

```js
DURATION.fast     150ms    // 按鈕按壓回饋
DURATION.normal   280ms    // 預設轉場
DURATION.slow     450ms    // 大幅度變化（page 切換）
DURATION.ambient  1800ms   // 環境動畫（呼吸、浮動、海浪）
```

### Easing 對映

| 用途 | Easing |
|---|---|
| 進場 | `Easing.out(Easing.cubic)` |
| 離場 | `Easing.in(Easing.quad)` |
| 上下浮動 | `Easing.inOut(Easing.sin)` |
| 海浪流動 | `Easing.linear` |
| 按鈕 spring | `friction: 5, tension: 200` |

---

## 6. 核心元件

### 6.1 膠囊（Pill）— 整個 App 的基本元素

```jsx
<View style={{
  borderRadius: 999,
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: C.blue,
}}>
  <Text>內文</Text>
</View>
```

**色彩 offset shadow 取代黑邊**：兩個 View 疊起來，後層偏移 6px 當作彩色硬陰影。

```jsx
<View style={{ position: 'relative' }}>
  <View style={{ ...pillStyle, position: 'absolute', top: 6, left: 6, backgroundColor: C.pink }} />
  <Pressable style={{ ...pillStyle, backgroundColor: C.blue }}>...</Pressable>
</View>
```

### 6.2 雲狀對話框（CloudBubble）

用 SVG Path 11 段 Q 二次貝茲曲線 + 2 顆思考尾巴小圓組成不對稱有機形狀。出現在：
- HomeScreen 的角色泡泡
- TripScreen 的 EmptyTripState

**規則**：泡泡內文字 padding 取 `BUBBLE * 0.18`（比例縮放，避免被弧邊切到）。

### 6.3 海浪（Wave）

**靜態波浪**（HomeScreen 背景、Profile 邊界）：
- 用兩段 Cubic Bezier (`C`) 畫白 + 藍兩層
- 藍色 path 起點 y=122 對應到藍色背景頂端，零縫隙

**動態海浪**（TripScreen loading）：
- 寬度 `2 * SW` 包含 8 段交替波峰
- `translateX` 線性 loop 0 → -SW（半個 path 剛好無縫接續）
- 兩層用不同速度（4.4s / 6.2s）產生視差
- 嚴禁 `scaleY: -1`，會跟 native driver 衝突造成抖動

### 6.4 行程膠囊（StopPill）

左右交錯 + 白色虛線 S 形連接 + 顏色輪播：

```
i=0 (左) → pink
i=1 (右) → white
i=2 (左) → blue
i=3 (右) → white
```

陰影採對比色：粉 ↔ 藍、白 ↔ 粉。

### 6.5 TabBar

懸浮白色膠囊，active 指示是底部一條 24×3 小粉線**滑動**（不是 fade）到當前 tab 位置。`Animated.spring` friction 8 / tension 80。

---

## 7. 互動模式

### 7.1 按鈕回饋（`PressBtn`）

```js
按下 → scale 0.96 (spring friction: 5, tension: 200)
放開 → spring 回 1
```

### 7.2 列表進場（`StaggerPill` / `StaggerItem`）

```js
每個 item 延遲 (index × 70-90)ms 開始
translateY 24 → 0
opacity   0  → 1
Easing.out.cubic, duration 380-420ms
```

用於：
- 行程膠囊列
- Profile 選單膠囊

### 7.3 角色互動（HomeScreen）

**摸動物**：
1. `Haptics.impactAsync(Light)`
2. 動物 scale 1 → 1.12 → spring 1
3. 從頭頂噴 3 顆白色愛心，往上飛 180px，左右隨機飄
4. 1.4 秒後自動清除

### 7.4 觸覺回饋總表

| 操作 | Haptic |
|---|---|
| 摸動物 | Light Impact |
| 按下換一批 | Medium Impact |
| 行程生成完成 | Success Notification |
| 錯誤、衝突 | Error Notification |

---

## 8. 圖片資產

### Vibe 動物（13 隻）

每隻 2 幀（vibe1+vibe2、vibe3+vibe4…），主畫面每 450ms 切幀做眨眼/喘息。
最後一隻 vibe13 是「Surprise Me」隨機，只有 1 幀，改用左右搖晃動畫。

### 天氣動畫

```
sun1, sun2   → 晴天 / 陰天 / 夜晚共用（2 幀）
rain1-4      → 雨天（4 幀）
loading1-3   → 載入動畫（3 幀，含粉色泡泡圈圈）
```

### 圖片不閃技巧

切換 source 會導致 RN Image 卸載重載產生閃白。改用：

```jsx
<Image source={frames[0]} style={{ opacity: idx === 0 ? 1 : 0 }} />
<Image source={frames[1]} style={{ position:'absolute', opacity: idx === 1 ? 1 : 0 }} />
```

兩張同時掛載，只切 opacity → native layer 不卸載 → 零閃爍。

---

## 9. 排版層級規則

```
[頂部 Status Bar 區]
  左：天氣動畫 64×64
  右：圓形頭像 64×64（登入後）

[主舞台 stageHolder]
  上：雲狀對話框 + 動物
  下：vibe 卡片橫向滑動

[底部 TabBar]
  懸浮膠囊 88% 寬，bottom: max(insets.bottom + 10, 24)
```

每頁底部都要為 TabBar 預留 `Math.max(insets.bottom + 90, 100)` 高度避免被擋。

---

## 10. 低明度模式實作

```
DimContext
  ├── dim: boolean              (持久化在 AsyncStorage)
  ├── pal: { yellow, pink, ... } (依 dim 切換 PAL_BRIGHT/PAL_DIM)
  ├── setDim, toggleDim
  └── usePAL() hook              (各元件取當前色票)
```

**關鍵**：所有色塊用 `C.x`（從 `usePAL()` 取），StyleSheet 預設值不重要。AR Screen 例外使用 `makeStyles(T)` 工廠 + `useMemo` 即時重建整套 styles（因為 styles 太多無法逐一覆寫）。

---

## 11. Don't / Do 守則

### ❌ Don't
- 用粉底白字（對比 2.3:1 失敗）
- 在元件內定義動畫元件（每次 render 重建會 reset 動畫）
- 用 `<Image source={frames[idx]} />` 切換幀（會閃）
- 在 transform 同時用 translateX + scaleY:-1（native driver 衝突）
- 亂用 `Alert`（操作成功用 toast 不用 modal）

### ✅ Do
- CTA 永遠用 blue 背景 + white sansBlack 字
- 進場動畫加 stagger 創造節奏感
- 危險/失敗操作用 Haptics.Error
- 大數字用 sansBlack + letterSpacing 負值
- 頁面 padding 統一 SPACE.lg (24)
