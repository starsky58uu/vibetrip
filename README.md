# VibeTrip

> 用「心情」當搜尋條件的台灣旅遊 App — 選一個 vibe（喝杯咖啡／想拍美照／躲雨室內…），讓 AI 即時生成一份附近真實店家組成的小旅程，並用 AR 帶你導覽。

| | |
|---|---|
| 平台 | iOS / Android（React Native 0.81 + Expo SDK 54） |
| 後端 | FastAPI · PostgreSQL/PostGIS · Redis · Groq Llama 3.3 |
| 地圖 | Google Maps SDK + Places + Directions |
| 字型 | 思源黑體（Noto Sans TC）四種字重 |

---

## 功能總覽

| 模組 | 內容 |
|---|---|
| **首頁** | 13 種 vibe 卡通動物橫向滑動，狀態列即時天氣動畫，點動物就生成行程 |
| **行程** | 左右交錯彩色膠囊 + 白色虛線連接，搖一搖換一批，按「開始導覽」進 AR |
| **AR 導覽** | 相機畫面疊指南針 + 距離卡片，逐站引導，可拍照 / 錄影直接存為足跡 |
| **探索（地圖）** | 雙分頁：Google Map 個人足跡 + 社群貼文 feed |
| **天氣** | 點主頁天氣 icon 進詳細頁，hero 區大溫度 + 逐時 / 多日 / 詳細數據 |
| **個人** | 頭像（可換）+ 統計 pill + 選單膠囊，登入後同步雲端 |
| **低明度模式** | 一鍵切換莫蘭迪低飽和色票（不是 overlay，是真實 PAL 換色） |

---

## 開發環境

### 前置

- Node.js 20+
- **pnpm**（必須，repo 有 `only-allow pnpm` lock）
- Expo CLI（透過 npx 呼叫）
- iOS：Xcode 15+ / macOS
- Android：Android Studio + JDK 17

### 啟動

```bash
# 1. 安裝相依
pnpm install

# 2. 環境變數（見 docs/ENV.md）
cp .env.example .env
cp .env.local.example .env.local   # 本機 dev：LAN IP + :8001
cp .env.preview.example .env.preview
cp .env.production.example .env.production
# 填入 EXPO_PUBLIC_GOOGLE_API_KEY

# 3. 本機 Metro（.env.local → dev API 或 .env → 正式 API）
pnpm start
```

**環境對照** → [docs/ENV.md](docs/ENV.md)（本機 dev / EAS preview / production）

```bash
# 舊：只填 .env 一個檔
# 新：.env = 正式預設；本機改 .env.local；EAS 用 update:preview / update:production
```

### 後端

後端在獨立 repo（`vibetrip-backend`），用 Docker Compose 起：

```bash
cd ../vibetrip-backend
docker compose up -d
# 預設曝在 0.0.0.0:8000，把 IP 填進 frontend .env
```

---

## 專案結構

```
vibetrip/
├── App.jsx                    # 根組件，掛 Providers + Navigator
├── app.config.js              # Expo 設定（icon、splash、權限）
├── eas.json                   # EAS Build 設定
├── assets/
│   ├── vibe1-13.png           # 13 隻 vibe 動物（2 幀動畫）
│   ├── sun1-2.png             # 晴天動畫
│   ├── rain1-4.png            # 雨天動畫
│   ├── loading1-3.png         # 載入動畫
│   └── logo2.png              # App icon
├── scripts/
│   └── make_dim_assets.py     # 工具：用 PIL 把 bright PNG → dim PNG（圖片若要降飽和）
└── src/
    ├── constants/
    │   ├── palette.js         # PAL_BRIGHT + PAL_DIM 兩組色票
    │   └── theme.js           # Fonts（字型）
    ├── context/
    │   ├── AuthContext.jsx    # JWT、登入狀態、SecureStore 持久化
    │   └── DimContext.jsx     # 低明度模式切換 + usePAL() hook
    ├── data/
    │   └── vibeData.js        # 13 種 vibe 的中英文、預設 trip 模板
    ├── hooks/
    │   ├── useFontsLoaded.js  # expo-font 載字型
    │   └── useWeather.js      # 抓 OpenWeather + 詩意 tag
    ├── navigation/
    │   ├── AppNavigator.jsx   # 根 Stack：Tabs + AR 全螢幕
    │   └── TabNavigator.jsx   # 4 個底部 tab（自製膠囊樣式）
    ├── screens/
    │   ├── Home/HomeScreen.jsx          # 主頁 vibe 選單
    │   ├── Trip/
    │   │   ├── TripScreen.jsx           # 行程膠囊列 + loading 海浪
    │   │   └── ShakeScreen.jsx          # 搖一搖換行程
    │   ├── Explore/ExploreScreen.jsx    # 地圖 + 社群雙分頁
    │   ├── Map/
    │   │   ├── MapScreen.jsx            # Google Map 主畫面
    │   │   ├── components/AddSpotModal.jsx  # 長按新增足跡
    │   │   └── hooks/useMapLogic.js
    │   ├── Profile/ProfileScreen.jsx    # 個人 + Login + Register + Weather + MyCapsules + SavedSpots（5 個子畫面）
    │   └── AR/
    │       ├── ArScreen.jsx             # 相機 + AR overlay
    │       ├── hooks/useArLogic.js
    │       ├── services/transportApi.js # 透過 backend 打 TDX
    │       └── utils/helpers.js
    └── services/
        └── apiClient.js       # fetch wrapper + JWT header
```

---

## 設計系統

### 色票（`src/constants/palette.js`）

兩套色票，由 `DimContext` 切換：

|         | Bright（亮） | Dim（莫蘭迪） |
|---------|:---:|:---:|
| yellow  | `#E2E146` | `#F5E6C8` |
| pink    | `#FF6FA8` | `#E5C1CD` |
| blue    | `#2E45B0` | `#AAC9CE` |
| black   | `#000000` | `#3D3A42` |
| white   | `#FFFFFF` | `#FBF6F0` |

### 使用方式

```jsx
import { usePAL } from '../context/DimContext';

function MyScreen() {
  const C = usePAL();
  return <View style={{ backgroundColor: C.yellow }}>...</View>;
}
```

切換時所有用 `C.x` 的地方會自動 re-render。圖片預設保持鮮豔（讓角色在霧面背景上跳出來），若要圖片同步降飽和可改用 `assets/dim/` 內的版本。

### 字型（`src/constants/theme.js`）

統一只用思源黑體（Noto Sans TC）四種字重：

```js
Fonts.sans       → Regular  // 一般文字
Fonts.sansMed    → Medium   // 次要強調
Fonts.sansBold   → Bold     // 重要文字、按鈕
Fonts.sansBlack  → Black    // 標題、品牌字
```

> AR Screen 內部保留 `serif/latin/mono` alias 對映到對應 sans 字重，舊樣式不用改也能 work。

---

## 後端 API（摘要）

| Method | Path | 說明 |
|---|---|---|
| POST | `/auth/login` `/auth/register` | JWT 登入 / 註冊 |
| GET | `/api/v1/users/me/stats` | 個人足跡 / 收藏統計 |
| GET | `/api/v1/taste/profile` | AI 漫遊品味分析 |
| POST | `/api/v1/trips/recommend` | **AI 生成行程**（吃 vibe + lat/lon） |
| GET | `/api/v1/spots/community` | 社群 feed |
| POST | `/api/v1/spots/community/{id}/like` `/save` | 互動 |
| GET / POST | `/api/v1/spots/personal` `/saved` | 個人足跡 CRUD |

完整文件：啟動 backend 後看 `http://<IP>:8000/docs`（Swagger）。

---

## 開發備忘

### 重要 Hooks

- `useAuth()` → `{ user, isLoggedIn, loading, login, register, logout }`
- `usePAL()` → 當前色票物件
- `useDim()` → `{ dim, toggleDim }`
- `useWeather()` → `{ current, forecast }`

### 模組層快取

`TripScreen.jsx` 用 `let _tripCache = null` 在模組層快取最後一次行程：
- Tab 切走再回來會直接還原（不重新 fetch）
- App 關閉重啟才會清空

### AR 樣式動態化

`ArScreen.jsx` 樣式眾多用了 `makeT(PAL)` 和 `makeStyles(T)` 工廠函式 + `useMemo` 即時重建，這樣切低明度時整個 AR 介面才能跟著換色。

### 圖片不閃技巧

切換 vibe 動物 / loading 幀時：
- **不要**換 `<Image source>`（會卸載重載 → 閃光）
- **改用** 兩張 Image 重疊 + `opacity: 0/1` 切換顯示

### 載入海浪

`LoadingWaves` 用 `translateX` 橫向 loop 兩層藍/白 SVG path（寬度 2*SW，loop 半個剛好無縫接續），絕對不可用 `scaleY:-1` 因為會跟 native driver 衝突造成抖動。

---

## 部署

### EAS Build & Update

```bash
pnpm build:preview       # 首次：建 preview 原生包（internal APK 等）
pnpm update:preview -- --message "試新 UI"

pnpm build:production    # 商店 / 正式包
pnpm update:production -- --message "1.0.1 修正"
```

設定在 `eas.json`（`preview` / `production` channel + API URL）。production 啟用 `autoIncrement`。

詳見 [docs/ENV.md](docs/ENV.md)。

### 上架前 checklist

- [ ] `app.config.js` 補 `ios.bundleIdentifier`
- [ ] `infoPlist` 寫權限說明（Camera / Location / PhotoLibrary）
- [ ] 後端 `JWT_SECRET_KEY` 換成隨機 64 字元
- [ ] backend 部署到 HTTPS（iOS release 預設擋 HTTP）
- [ ] Google API Key 設 application + API restrictions
- [ ] Google Cloud 設預算警示
- [ ] 替換 splash icon
- [ ] 寫隱私政策 URL（iOS/Google Play 強制要）
- [ ] 後端加 rate limiter（保護 Groq API）

---

## 授權與技術棧致謝

- React Native + Expo SDK 54
- FastAPI · PostgreSQL · PostGIS · Redis
- Groq / Llama 3.3（行程生成）
- Google Maps Platform
- OpenWeatherMap
- TDX 運輸資料流通服務（公車資訊）
- 思源黑體 Noto Sans TC（Google Fonts SIL OFL）
