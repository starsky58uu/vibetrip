# VibeTrip — P 人漫遊 🎲

> 「接下來三小時，你想要什麼樣的漫遊？」
>
> 選一個心情（Vibe），VibeTrip 依你**當下的位置、時間與天氣**，用真實店家資料即時生成一份三小時步行行程——專為「沒計畫也想出門」的 P 型旅人打造。

---

## 目錄

- [專案簡介](#專案簡介)
- [功能特色](#功能特色)
- [系統架構](#系統架構)
- [技術棧](#技術棧)
- [專案結構](#專案結構)
- [前置需求](#前置需求)
- [快速開始](#快速開始)
- [環境變數](#環境變數)
- [API 端點總覽](#api-端點總覽)
- [行程生成流程](#行程生成流程)
- [資料儲存策略](#資料儲存策略)
- [設計系統](#設計系統)
- [開發指令](#開發指令)
- [疑難排解](#疑難排解)
- [安全性注意事項](#安全性注意事項)

---

## 專案簡介

VibeTrip 是一套全端行動應用：

- **前端** `vibetrip/`：React Native + Expo 開發的 iOS / Android App。
- **後端** `vibetrip-backend/`：FastAPI + PostgreSQL/PostGIS + Redis，以 Docker Compose 一鍵啟動。

核心價值是「**即時、真實、不用做功課**」——不像一般行程 App 要你自己查、自己排，VibeTrip 把 Google 真實店家、即時天氣、大眾運輸班次與生成式 AI 串在一起，讓你一鍵拿到一份「現在就能出發」的行程。

---

## 功能特色

| 功能 | 說明 |
|---|---|
| **AI 盲盒行程** | 選一個 Vibe，Groq LLaMA 3.3 結合 Google Places 真實店家，生成三小時步行計畫（標題、描述、停留時間、標籤） |
| **真實距離 + 大眾運輸** | Google Directions 計算步行時間；超過 10 分鐘自動查捷運／公車班次（TDX 即時資料） |
| **打烊時間驗證** | 傍晚（17:00 後）自動查各店家當日打烊時間，剔除「你到的時候已經關門」的站 |
| **搖一搖換行程** | 加速度感測器偵測搖晃，或手動換一個 Vibe，重新抽一份行程 |
| **即時天氣** | OpenWeatherMap 當前氣象 + 多日預報，氣象標籤隨時段動態變化 |
| **AR 即時導航** | 相機 + 羅盤感測器疊加方位箭頭、距離、ETA，支援步行與大眾運輸轉乘提示 |
| **足跡地圖** | 長按地圖記錄走過的地點（照片 + 備註），分公開社群地圖與個人膠囊 |
| **漫遊品味** | 依個人足跡，AI 解讀你的城市漫遊個性 |
| **帳號系統** | JWT 登入註冊，token 以加密方式存於裝置（expo-secure-store） |
| **主題換色** | 暖米白 / 櫻花粉 / 抹茶綠 / 暮色藍，Vibe 按鈕三種樣式（卡片 / 圓形 / 印章） |

---

## 系統架構

```
┌─────────────────────────────┐
│   VibeTrip App (Expo)        │
│   React Native 0.81 / RN19   │
│   - 4 分頁 + AR 全螢幕        │
│   - apiClient (fetch+JWT)    │
└──────────────┬──────────────┘
               │ HTTPS  /api/v1/*
               ▼
┌─────────────────────────────┐         ┌──────────────────────┐
│   FastAPI (Uvicorn) :8000    │────────▶│ Groq  (LLaMA 3.3-70b) │
│   - 業務邏輯 / 路由           │         │ Google Maps Platform  │
│   - JWT 認證                 │────────▶│ OpenWeatherMap        │
│                              │         │ TDX（公車/捷運/YouBike）│
└───────┬──────────────┬──────┘         └──────────────────────┘
        │              │
        ▼              ▼
┌───────────────┐  ┌──────────────────┐
│ PostgreSQL15  │  │ Redis 7          │
│ + PostGIS     │  │ 動態資料 / 快取    │
│ 靜態資料       │  │ - AI 行程 30 min  │
│ 帳號/足跡/站牌 │  │ - 打烊時間 24h     │
└───────────────┘  └──────────────────┘
```

---

## 技術棧

### 前端 `vibetrip/`

| 層級 | 技術 |
|---|---|
| 框架 | React Native 0.81.5 · React 19.1 · Expo SDK 54 |
| 套件管理 | **pnpm**（已用 `only-allow` 鎖定，請勿用 npm / yarn） |
| 建置 | expo-dev-client（**Development Build**，非 Expo Go）· expo-updates（OTA） |
| 導覽 | React Navigation v7（bottom-tabs · native-stack · material-top-tabs） |
| 地圖 | react-native-maps |
| 感測 / 裝置 | expo-location · expo-sensors · expo-camera · expo-haptics · expo-media-library · expo-image-picker |
| 安全儲存 | expo-secure-store（JWT token 加密儲存） |
| 繪圖 | react-native-svg |
| 字型 | Noto Serif TC（明朝）· Fraunces · Instrument Serif · JetBrains Mono |
| API 層 | 自訂 `apiClient`（fetch + AbortController timeout + Bearer token） |

### 後端 `vibetrip-backend/`

| 層級 | 技術 |
|---|---|
| 框架 | FastAPI + Uvicorn（async） |
| 資料庫 | PostgreSQL 15 + PostGIS（geoalchemy2 空間查詢） |
| 快取 | Redis 7（外部 API 快取 / 即時資料） |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| AI | Groq API — `llama-3.3-70b-versatile` |
| 地圖 | Google Maps Platform（Places · Place Details · Directions） |
| 天氣 | OpenWeatherMap API |
| 大眾運輸 | TDX 運輸資料流通服務（公車 / 捷運 / YouBike 即時） |
| 認證 | JWT（python-jose）+ bcrypt 密碼雜湊 |
| HTTP 客戶端 | httpx（async） |
| 容器 | Docker + Docker Compose（api / db / redis 三服務） |

---

## 專案結構

```
vibetrip/                              前端（React Native）
├── App.jsx                            根元件：字型載入 + Auth/Theme Provider
├── app.config.js                      Expo 設定（讀 .env，注入 Google Maps Key）
├── index.js                           進入點
├── .env / .env.example                EXPO_PUBLIC_* 環境變數
├── android/                           原生 Android 專案（dev build / prebuild）
├── assets/                            App icon / splash
└── src/
    ├── navigation/
    │   ├── AppNavigator.jsx           根路由（MainTabs + AR 全螢幕 Modal）
    │   └── TabNavigator.jsx           底部四分頁（主頁 / 行程 / 探索 / 我的）
    ├── context/
    │   ├── ThemeContext.jsx           主題系統：4 色調 × 3 Vibe 按鈕樣式
    │   └── AuthContext.jsx            登入狀態 + JWT（expo-secure-store）
    ├── screens/
    │   ├── Home/HomeScreen.jsx        Vibe 選擇器 + 天氣晶片
    │   ├── Trip/
    │   │   ├── TripScreen.jsx         AI 行程時間軸 + 收藏 + 開始導覽
    │   │   └── ShakeScreen.jsx        搖一搖 / 換 Vibe 重新生成
    │   ├── AR/
    │   │   ├── ArScreen.jsx           相機 + 感測器 + 逐步導航疊圖
    │   │   ├── hooks/useArLogic.js    定位、羅盤、路線、轉乘狀態機
    │   │   └── services/transportApi.js  TDX 即時到站查詢
    │   ├── Explore/ExploreScreen.jsx  上分頁：地圖 / 社群 Feed
    │   ├── Map/
    │   │   ├── MapScreen.jsx          足跡地圖（react-native-maps）
    │   │   └── hooks/useMapLogic.js   GPS、足跡 CRUD、社群互動
    │   ├── Profile/ProfileScreen.jsx  旅人手帖：統計 / 漫遊品味 / 登入 / 外觀
    │   └── Weather/                   天氣詳情
    ├── components/
    │   ├── Masthead.jsx               雜誌風頁首列
    │   ├── VibeIcon.jsx / WeatherIcon.jsx   SVG 圖示
    ├── hooks/
    │   ├── useWeather.js              GPS + 天氣 API
    │   └── useFontsLoaded.js          Google Fonts 載入守門員
    ├── services/apiClient.js          fetch wrapper（apiGet/Post/Patch/Delete/Upload）
    ├── data/vibeData.js               VIBES 清單 + fallback 行程
    └── constants/theme.js             設計 Token（T 色盤 + Fonts 字型名）

vibetrip-backend/                      後端（FastAPI）
├── docker-compose.yml                 api + db（PostGIS）+ redis
├── dockerfile                         API 映像
├── requirements.txt                   Python 相依
├── .env / .env.example                DB / JWT / API Keys
├── seed_spots.py                      足跡種子資料
└── app/
    ├── main.py                        FastAPI 根、CORS、靜態圖、生命週期
    ├── core/
    │   ├── config.py                  Settings（pydantic-settings 讀 .env）
    │   ├── database.py                SQLAlchemy async engine
    │   └── redis_client.py            get_redis / build_key / cache_get/set_json
    ├── api/v1/
    │   ├── api_router.py              掛載所有 sub-router
    │   └── endpoints/                 auth · users · trips · blindbox · weather
    │                                  places · transit · directions · spots
    │                                  uploads · taste
    ├── db/
    │   ├── init_db.py                 啟動時建表 + seed
    │   └── models/                    SQLAlchemy 模型
    ├── schemas/                       Pydantic 請求/回應模型
    └── services/
        ├── ai_service.py             三步驟行程生成（Places → Groq → Directions）
        ├── trip_service.py          recommend 主流程 + 快取
        └── external/
            └── google_client.py     GoogleMapsClient（text_search / place_details / directions）
```

---

## 前置需求

| 工具 | 版本 / 說明 |
|---|---|
| Node.js | 18 以上（建議 20+） |
| pnpm | 8 以上（`npm i -g pnpm`）— 本專案鎖定 pnpm |
| Docker Desktop | 啟動後端三服務 |
| Android Studio / Xcode | 建立 Development Build（跑模擬器或實機） |
| 實體手機（選用） | 測 GPS / 相機 / 感測器最準，需與後端同一 Wi-Fi |

### 需先申請的 API Keys

| 服務 | 用途 | 免費額度 |
|---|---|---|
| [Groq](https://console.groq.com) | AI 行程生成（LLaMA 3.3） | 約 14,400 req/day |
| [Google Maps Platform](https://console.cloud.google.com) | Places · Place Details · Directions API | 每月 $200 額度 |
| [OpenWeatherMap](https://openweathermap.org/api) | 天氣 | 1,000 req/day |
| [TDX](https://tdx.transportdata.tw) | 公車 / 捷運 / YouBike 即時 | 免費（需註冊 client id/secret） |

> Google Cloud 記得在「程式庫」啟用 **Places API**、**Directions API**、**Places API (New)** 後才能使用。

---

## 快速開始

### 步驟 1：啟動後端

```bash
cd vibetrip-backend

# 1. 複製環境變數範本
cp .env.example .env

# 2. 編輯 .env，至少填入：
#    GROQ_API_KEY            （AI 行程）
#    GOOGLE_MAPS_API_KEY     （店家 / 路線）
#    OPENWEATHER_API_KEY     （天氣）
#    TDX_CLIENT_ID / TDX_CLIENT_SECRET（大眾運輸，選填）
#    JWT_SECRET_KEY          （openssl rand -hex 32）

# 3. 啟動（需先開啟 Docker Desktop）
docker compose up --build
```

啟動後：

- API：<http://localhost:8000>
- 互動式 API 文件（Swagger）：<http://localhost:8000/docs>
- 健康檢查：<http://localhost:8000/healthz>

> ⚠️ `.env.example` 目前缺 `GROQ_API_KEY`，且 Google 變數名請用 **`GOOGLE_MAPS_API_KEY`**（`config.py` 以此為準）。請確認 `.env` 內含這兩項。

### 步驟 2：啟動前端

```bash
cd vibetrip

# 1. 安裝相依（務必用 pnpm；npm/yarn 會被擋下）
pnpm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，加入後端位址（手機需填電腦的區網 IP，非 localhost）：
#    EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
#    EXPO_PUBLIC_GOOGLE_API_KEY=...
#    EXPO_PUBLIC_OPENWEATHER_API_KEY=...
#    EXPO_PUBLIC_TDX_CLIENT_ID=...
#    EXPO_PUBLIC_TDX_CLIENT_SECRET=...

# 3a. 第一次：建立 Development Build（會編譯原生程式）
pnpm android        # 或 pnpm ios（需 macOS + Xcode）

# 3b. 之後：只啟動 Metro，App 內按 r 重載即可
pnpm start
```

> **為什麼不是 Expo Go？** 本專案使用 `expo-dev-client` 與原生模組（react-native-maps、expo-camera、感測器），需要 **Development Build**，無法用 Expo Go 直接掃描預覽。
>
> **找電腦 IP**：Windows `ipconfig`、macOS `ipconfig getifaddr en0`。手機與電腦要在同一個 Wi-Fi。

---

## 環境變數

### 前端（`vibetrip/.env`）— 必須以 `EXPO_PUBLIC_` 開頭才會被打包

| 變數 | 用途 |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | 後端 API 位址（例：`http://192.168.0.10:8000`） |
| `EXPO_PUBLIC_GOOGLE_API_KEY` | 地圖顯示 / AR 路線（前端直接用的部分） |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | 前端天氣查詢 |
| `EXPO_PUBLIC_TDX_CLIENT_ID` | AR 大眾運輸即時到站 |
| `EXPO_PUBLIC_TDX_CLIENT_SECRET` | 同上 |

### 後端（`vibetrip-backend/.env`）— 對應 `app/core/config.py`

| 變數 | 預設 / 說明 |
|---|---|
| `DEBUG` | `true`（開發） |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL 連線（`DB_HOST`/`DB_PORT` 由 compose 注入） |
| `JWT_SECRET_KEY` | JWT 簽章金鑰，正式環境務必換隨機字串 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access token 有效期（預設 60） |
| `REFRESH_TOKEN_EXPIRE_DAYS` | refresh token 有效期（預設 30） |
| `GROQ_API_KEY` | Groq AI 金鑰 |
| `GOOGLE_MAPS_API_KEY` | Google Places / Directions |
| `OPENWEATHER_API_KEY` | 天氣 |
| `TDX_CLIENT_ID` / `TDX_CLIENT_SECRET` | 大眾運輸 |
| `UPLOAD_DIR` | 圖片上傳目錄（容器內 `/app/uploads`） |

---

## API 端點總覽

所有端點皆帶 `/api/v1` 前綴；完整參數請見 <http://localhost:8000/docs>。

| 模組 | 方法 / 路徑 | 說明 |
|---|---|---|
| 認證 | `POST /auth/register` · `POST /auth/login` | 註冊 / 登入（回傳 JWT） |
| 使用者 | `GET /users/me` · `GET /users/me/stats` | 個人資料 / 足跡統計 |
| 盲盒行程 | `POST /trips/recommend` | 依 vibe/位置/天氣生成行程（搖一搖再打一次） |
| | `GET /trips/{trip_id}` | 取單一行程（分享 / 歷史） |
| | `DELETE /trips/cache` | 清除 AI 行程快取（開發用） |
| 天氣 | `GET /weather/current` · `GET /weather/forecast` | 當前 / 預報 |
| 地點 | `GET /places/...` | Google Places 搜尋 |
| 路線 | `GET /directions/...` | 步行 / 大眾運輸路線 |
| 大眾運輸 | `GET /transit/...` | TDX 公車 / 捷運即時 |
| 足跡 | `GET/POST /spots/personal` · `GET /spots/community` · `GET /spots/saved` | 個人 / 社群 / 收藏足跡 |
| | `POST /spots/community/{id}/like` · `/save` | 按讚 / 收藏 |
| 上傳 | `POST /uploads/image` | 足跡照片上傳（multipart） |
| 口味分析 | `GET /taste/profile` | AI 漫遊品味 |
| 系統 | `GET /` · `GET /healthz` | 歡迎 / 健康檢查 |

---

## 行程生成流程

`POST /api/v1/trips/recommend` 的內部三步驟（`app/services/ai_service.py`）：

```
使用者選 Vibe + GPS 定位
         │
         ▼
① Google Places text_search
   查 1.5 km 內真實店家（評分 ≥ 3.5），最多 10 筆
   以 Haversine 過濾 > 1.5 km 的異常結果
         │
         ├─（17:00 後）查 Place Details 打烊時間
         │   └─ 結果以 Redis 快取 24h，剔除快打烊的店
         ▼
② Groq LLaMA 3.3（Grounded Generation）
   把真實清單餵入 Prompt，AI「只能」從清單選地點
   提供各站預估到達時刻，確保不排到打烊後
   生成：標題 / 副標 / 每站時間 / 描述 / tag / emoji
         │
         ├─ 防幻覺：驗證 activity 都是清單內真實店名
         ├─ 後置驗證：逐站累加時間，剔除「到達時已打烊」的站
         ▼
③ Google Directions（各段並行查詢）
   計算真實步行時間與距離
   步行 > 10 min → 查大眾運輸
     條件：走去站 ≤ 10 min、等車 ≤ 30 min
         │
         ▼
④ Redis 快取（TTL 30 分鐘）
   Key：trip:ai:{vibe}:{lat:.2f}:{lon:.2f}:{時段桶}
   搖一搖（帶 exclude）會繞過快取拿新結果
```

---

## 資料儲存策略

| 類型 | 儲存於 | 內容 |
|---|---|---|
| 靜態資料 | PostgreSQL + PostGIS | 帳號、個人 / 社群足跡（含經緯度空間索引）、站牌 |
| 動態 / 快取 | Redis | AI 行程結果（30 min）、打烊時間（24h）、外部 API 即時資料 |
| 裝置端 | expo-secure-store / AsyncStorage | JWT token（加密）、未登入時的本機足跡與收藏行程 |
| 圖片 | 後端 `/app/uploads`（Docker volume） | 足跡照片，經 `/static/uploads/<file>` 提供 |

---

## 設計系統

設計 Token 定義在 `src/constants/theme.js`，主題切換由 `src/context/ThemeContext.jsx` 管理（「我的」→「外觀設定」）。

### 主題對照

| 主題 | 底色 | Accent |
|---|---|---|
| 暖米白（default） | `#F5EFE3` | 柿橘 `#C85A3B` |
| 櫻花粉（sakura） | `#FDF0F4` | 玫瑰 `#C6487A` |
| 抹茶綠（matcha） | `#EFF5E7` | 苔綠 `#5C8040` |
| 暮色藍（dusk） | `#EEF2F8` | 藍墨 `#4A78B0` |

### Vibe 按鈕樣式

| 樣式 | 說明 |
|---|---|
| 卡片（card） | 2 欄矩形磁磚，icon + 中英文名稱（預設） |
| 圓形（circle） | 4 欄圓形 icon，點選放大 + 彩色投影 |
| 印章（stamp） | 3 欄虛線框，微旋轉，選取後出現印章 badge |

### 字型角色

| 角色 | 字型 |
|---|---|
| 標題 / 內文（明朝） | Noto Serif TC |
| 強調 / 義式斜體 | Instrument Serif · Fraunces |
| 編號 / 日期 / 座標（等寬） | JetBrains Mono |

---

## 開發指令

### 前端

| 指令 | 說明 |
|---|---|
| `pnpm install` | 安裝相依 |
| `pnpm start` | 啟動 Metro（dev build 已安裝時用） |
| `pnpm android` | 建置 + 安裝 Android Development Build |
| `pnpm ios` | 建置 + 安裝 iOS Development Build（需 macOS） |
| `pnpm web` | 網頁預覽（部分原生功能不支援） |

### 後端

| 指令 | 說明 |
|---|---|
| `docker compose up --build` | 建置並啟動 api + db + redis |
| `docker compose up -d` | 背景執行 |
| `docker compose logs -f api` | 看 API 日誌 |
| `docker compose down` | 停止（加 `-v` 連資料卷一起清） |

---

## 疑難排解

| 問題 | 解法 |
|---|---|
| `pnpm install` 報錯叫你用 pnpm | 本專案鎖定 pnpm，請勿用 npm / yarn（`npm i -g pnpm` 後再裝） |
| 改了圖片 / 字型等資源卻沒生效 | 新資源需重啟並清快取：`Ctrl+C` → `npx expo start -c` |
| `docker compose` 說找不到設定檔 | 請先 `cd vibetrip-backend` 再執行（要在含 `docker-compose.yml` 的目錄） |
| 手機連不到後端 | `EXPO_PUBLIC_API_BASE_URL` 要填電腦**區網 IP**（非 `localhost`），且手機與電腦同一 Wi-Fi |
| 行程生成逾時 | AI + 多個 Google API 串接較慢，前端對該端點放寬到 25 秒；確認後端 Keys 正確 |
| 想清掉舊的 AI 行程快取 | `curl.exe -X DELETE http://localhost:8000/api/v1/trips/cache`（PowerShell 用 `curl.exe`，非 `curl` 別名） |
| 生成時間顯示成 UTC | 後端時間統一用 `TW_TZ`（UTC+8）；確認程式未被改回 `datetime.now()` |
| 地圖空白 / 無店家 | 確認 Google Cloud 已啟用 Places / Directions API，且金鑰未限制錯網域 |

---

## 安全性注意事項

- **後端 API Key 不外流**：Groq、Google（後端用）等金鑰只存在後端 `.env`，不打包進 App。
- **前端 `EXPO_PUBLIC_*` 會被打包**：這些金鑰會出現在 App bundle 內，請在供應商後台設定**用量與來源限制**（例如 Google Maps 限定 App 套件名 / Bundle ID）。
- **JWT 加密儲存**：登入 token 以 `expo-secure-store`（iOS Keychain / Android Keystore）保存，非明文。
- **正式環境**：務必更換 `JWT_SECRET_KEY`、收斂 CORS `allow_origins`（目前開發為 `*`）、改用 Alembic migration 取代啟動自動建表。
- **`.env` 不入版控**：兩端的 `.env` 都應在 `.gitignore` 內，只提交 `.env.example`。

---

<p align="center">VibeTrip · 為 P 型旅人打造的即時盲盒行程</p>
