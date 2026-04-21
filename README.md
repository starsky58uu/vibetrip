# VibeTrip — P 人漫遊

> 「接下來三小時，你想要什麼樣的漫遊？」
>
> 根據當下心情、所在位置與天氣，用 AI 即時生成一份三小時步行行程。

---

## 功能特色

| 功能 | 說明 |
|---|---|
| **AI 盲盒行程** | 選一個 Vibe，Groq LLaMA 3.3 結合 Google Places 真實店家生成三小時步行計畫 |
| **真實距離 + 大眾運輸** | Google Directions 計算步行時間；超過 10 分鐘自動查捷運 / 公車班次 |
| **即時天氣** | OpenWeatherMap 提供當前氣象與 7 日預報，氣象標籤隨時段動態變化 |
| **AR 導航** | 使用裝置相機 + 感測器疊加方位、距離、ETA 資訊 |
| **足跡地圖** | 記錄走過的地點，公開社群地圖與個人膠囊 |
| **主題換色** | 暖米白 / 櫻花粉 / 抹茶綠 / 暮色藍，Vibe 按鈕三種樣式（卡片 / 圓形 / 印章） |

---

## 技術棧

### 前端 `vibetrip/`

| 層級 | 技術 |
|---|---|
| 框架 | React Native 0.81 + Expo SDK 54 |
| 導覽 | React Navigation v7（bottom-tabs + native-stack） |
| 感測器 | expo-location · expo-sensors · expo-camera · expo-haptics |
| 地圖 | react-native-maps |
| 字型 | ZenOldMincho · Fraunces · InstrumentSerif · JetBrainsMono |
| API 層 | 自訂 `apiClient`（fetch + timeout + Bearer token） |

### 後端 `vibetrip-backend/`

| 層級 | 技術 |
|---|---|
| 框架 | FastAPI + Uvicorn |
| 資料庫 | PostgreSQL 15 + PostGIS（地理空間索引） |
| 快取 | Redis 7（外部 API 快取，TTL 30 分鐘） |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| AI | Groq API — `llama-3.3-70b-versatile` |
| 地圖 | Google Maps Platform（Places API + Directions API） |
| 天氣 | OpenWeatherMap API |
| 認證 | JWT（python-jose） + bcrypt（passlib） |
| 容器 | Docker + docker-compose |

---

## 目錄結構

```
vibetrip/                              前端（React Native）
├── App.jsx                            根元件：字型載入 + ThemeProvider
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.jsx           根路由（Tabs + AR 全螢幕 Modal）
│   │   └── TabNavigator.jsx           底部四分頁（主頁 / 行程 / 探索 / 我的）
│   ├── context/
│   │   └── ThemeContext.jsx           主題系統：4 色調 × 3 Vibe 按鈕樣式
│   ├── screens/
│   │   ├── Home/HomeScreen.jsx        Vibe 選擇器（card / circle / stamp）+ 天氣晶片
│   │   ├── Trip/
│   │   │   ├── TripScreen.jsx         AI 行程時間軸 + 換一批
│   │   │   └── ShakeScreen.jsx        搖一搖重新生成
│   │   ├── AR/ArScreen.jsx            相機 + 感測器 + ETA 疊圖
│   │   ├── Explore/ExploreScreen.jsx  社群地圖 + 足跡 Feed
│   │   ├── Map/MapScreen.jsx          足跡地圖（react-native-maps）
│   │   └── Profile/ProfileScreen.jsx  旅人手帖：天氣、登入、外觀設定
│   ├── components/
│   │   ├── Masthead.jsx               雜誌風頁首列（VibeTrip NO.247 + 日期）
│   │   ├── VibeIcon.jsx               心情圖示（SVG）
│   │   └── WeatherIcon.jsx            天氣圖示（SVG）
│   ├── hooks/
│   │   ├── useWeather.js              GPS + 天氣 API；owmIconToKind / vibeTag
│   │   └── useFontsLoaded.js          Google Fonts 載入守門員
│   ├── services/
│   │   └── apiClient.js               fetch wrapper（apiGet / apiPost + token）
│   ├── data/
│   │   └── vibeData.js                VIBES 清單 + fallback TRIP_DATA
│   └── constants/
│       └── theme.js                   設計 Token（T 色盤 + Fonts 字型名）

vibetrip-backend/                      後端（FastAPI）
├── docker-compose.yml                 api + db（PostGIS）+ redis
├── .env                               API Keys（不入 git）
├── app/
│   ├── main.py                        FastAPI 根、CORS、路由掛載
│   ├── core/
│   │   ├── config.py                  Settings（pydantic-settings 讀 .env）
│   │   ├── database.py                SQLAlchemy async engine
│   │   └── redis_client.py            get_redis / cache_get_json / cache_set_json
│   ├── api/v1/endpoints/
│   │   ├── auth.py                    POST /auth/login, /auth/register
│   │   ├── users.py                   GET/PATCH /users/me
│   │   ├── trips.py                   POST /trips/recommend, GET /trips/{id}
│   │   ├── weather.py                 GET /weather/current, /weather/forecast
│   │   ├── places.py                  GET /places/nearby, /places/search
│   │   ├── directions.py              GET /directions
│   │   ├── transit.py                 GET /transit/bus, /transit/mrt
│   │   └── spots.py                   CRUD /spots（足跡膠囊）
│   └── services/
│       ├── ai_service.py              三步驟行程生成（Places → Groq → Directions）
│       ├── trip_service.py            recommend 主流程
│       └── external/
│           └── google_client.py       GoogleMapsClient（text_search / directions）
```

---

## 快速開始

### 需要先申請的 API Keys

| 服務 | 用途 | 免費額度 |
|---|---|---|
| [Groq](https://console.groq.com) | AI 行程生成（LLaMA 3.3） | 14,400 req/day |
| [Google Maps Platform](https://console.cloud.google.com) | Places + Directions API | $200/月免費額度 |
| [OpenWeatherMap](https://openweathermap.org/api) | 天氣 | 1,000 req/day |

### 後端啟動

```bash
cd vibetrip-backend

# 1. 複製環境變數範本並填入 Keys
cp .env.example .env
# 編輯 .env，填入以下三個 Key：
#   GROQ_API_KEY
#   GOOGLE_MAPS_API_KEY
#   OPENWEATHER_API_KEY

# 2. 啟動（需先開啟 Docker Desktop）
docker compose up --build

# API 跑在   → http://localhost:8000
# 互動文件   → http://localhost:8000/docs
```

### 前端啟動

```bash
cd vibetrip

# 安裝相依套件（專案鎖定 pnpm）
pnpm install

# 啟動開發伺服器
pnpm start

# 用 Expo Go app 掃 QR Code 在手機預覽
# 或按 a 跑 Android 模擬器
```

> **設定後端位址**：開啟 `src/services/apiClient.js`，把 `BASE_URL` 改成後端電腦的 IP（同一 Wi-Fi），例如：
> ```js
> const BASE_URL = 'http://10.56.60.215:8000';
> ```

---

## 主要 API 端點

```
# 行程
POST /api/v1/trips/recommend
  Body: { vibe_key, latitude, longitude, exclude_trip_ids? }
  回傳: { title, subtitle, items[] }

# 天氣
GET  /api/v1/weather/current?lat=25.03&lon=121.56
GET  /api/v1/weather/forecast?lat=25.03&lon=121.56

# 認證
POST /api/v1/auth/register   Body: { username, email, password }
POST /api/v1/auth/login      Body: { username, password }

# 地點 / 足跡
GET  /api/v1/places/nearby?lat=&lon=&type=cafe
GET  /api/v1/spots/personal      個人足跡
GET  /api/v1/spots/community     社群足跡（公開）
```

---

## AI 行程生成流程

```
使用者選 Vibe + GPS 定位
         │
         ▼
① Google Places text_search
   查 1.5 km 內真實店家（評分 ≥ 3.5），最多取 10 筆
         │
         ▼
② Groq LLaMA 3.3（Grounded Generation）
   把真實清單餵入 Prompt，AI 只能從清單選地點
   生成：標題 / 描述 / 時間 / tag / emoji
         │
         ▼
③ Google Directions（平行查詢）
   計算真實步行時間與距離
   步行 > 10 min → 查大眾運輸
     條件：走去站 ≤ 10 min，等車 ≤ 30 min
         │
         ▼
④ Redis 快取（TTL 30 分鐘）
   Key 帶入 vibe / 座標 / hour÷2，避免舊快取回傳錯誤時間
```

---

## 設計系統

主題 Token 定義在 `src/constants/theme.js`，主題切換由 `src/context/ThemeContext.jsx` 管理，進入「我的」→「外觀設定」即可切換。

### 色盤

| Token | 說明 |
|---|---|
| `paper` / `paper2` / `card` | 背景層級（和紙質感由深到淺） |
| `ink` / `ink2` / `ink3` / `ink4` | 文字深淺四階 |
| `accent` | 主強調色（各主題不同） |
| `stamp` | 印章紅（badge、選取標記） |
| `tea` | 茶棕色（副標、義大利體文字） |

### 主題對照

| 主題 | 底色 | Accent |
|---|---|---|
| 暖米白（default） | `#F5EFE3` | 柿橘 `#C85A3B` |
| 櫻花粉（sakura）  | `#FDF0F4` | 玫瑰 `#C6487A` |
| 抹茶綠（matcha）  | `#EFF5E7` | 苔綠 `#5C8040` |
| 暮色藍（dusk）    | `#EEF2F8` | 藍墨 `#4A78B0` |

### Vibe 按鈕樣式

| 樣式 | 說明 |
|---|---|
| 卡片（card）   | 2 欄矩形磁磚，icon + 中英文名稱（預設） |
| 圓形（circle） | 4 欄圓形 icon，點選時放大 + 彩色投影 |
| 印章（stamp）  | 3 欄虛線框，微旋轉，選取後出現印章 badge |

---

## 開發注意事項

- **Docker 時區**：容器預設 UTC，所有時間計算已改用 `TW_TZ = timezone(timedelta(hours=8))`，確保生成時間顯示台灣時間。
- **AI 防幻覺**：先用 Google Places 撈真實店家再餵給 AI，AI 不能自行發明不存在的地點。
- **Haversine 距離過濾**：Google Places `radius` 僅是搜尋偏好而非硬性限制，後端加上 Haversine 公式過濾 > 5 km 的異常結果（防止搜到香港同名店）。
- **快取 key 設計**：`trip:ai:{vibe}:{lat:.2f}:{lon:.2f}:{hour//2}`，lat/lon 精確到小數點兩位（約 1.1 km），每 2 小時換一個時段桶。
- **API Key 安全**：Google Maps API Key 只在後端使用，不暴露給前端 App，避免被盜刷產生費用。
