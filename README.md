# 🚀 VibeTrip - 探索你的專屬時光膠囊

VibeTrip 是一款結合**直覺盲盒**與**AR 實境導航**的全新旅遊體驗 App。不需要繁瑣的行前規劃，只要選擇當下的心情（Vibe），搖一搖手機，VibeTrip 就會為你生成專屬的驚喜行程，並透過 AR 箭頭帶你探索城市角落。

---

## ✨ 核心功能 (Features)

* **🎁 直覺盲盒 (BlindBox)**：結合手機搖晃感測器 (Accelerometer)，根據當下心情隨機抽取行程，並支援 Haptics 震動回饋。
* **🧭 AR 實境導航 (AR Navigation)**：結合相機與陀螺儀，在現實畫面中疊加導航飛機。內建 Google Maps 與 TDX (大眾運輸/YouBike) 最佳路線計算。
* **🗺️ 記憶足跡地圖 (Map)**：切換「個人紀錄」與「探索社群」雙模式。長按即可在本機建立專屬打卡點。
* **⛅ 氣象預報 (Weather)**：串接 OpenWeather API，精算未來 5 日的最高/最低溫與降雨機率，並整合即時風向與日出落時間。

---

## 📂 專案架構 (Feature-based Architecture)

本專案採用高度模組化的 Feature-based 架構，將邏輯與畫面完美分離：

```text
vibetrip/
├── .env                        # 環境變數
├── app.config.js               # Expo 設定檔
├── App.jsx                     # App 根元件
├── index.js                    # 註冊入口
├── package.json
└── src/
    ├── assets/                 # 靜態資源與自訂字體
    ├── constants/              # 全域常數與主題配色
    ├── hooks/                  # 全域自訂鉤子
    ├── navigation/             # 獨立的路由設定
    └── screens/                # 依據功能劃分的畫面模組
        ├── Home/               # 首頁模組
        │   ├── components/     # 首頁專屬元件
        │   ├── hooks/          # 首頁專屬邏輯
        │   └── HomeScreen.jsx
        ├── Map/                # 足跡地圖模組
        ├── AR/                 # AR 導航模組
        ├── BlindBox/           # 盲盒抽取模組
        └── Weather/            # 天氣詳情模組
```

*(註：每個複雜畫面皆已將 API 請求、硬體感測與計算邏輯抽離至專屬的 `hooks/` 與 `utils/` 中，確保 UI 元件的極致純淨。)*

---

## 🛠️ 環境變數設定 (.env)

在專案根目錄建立 `.env` 檔案，並填入以下 API Keys 才能正常啟用所有功能：

```env
EXPO_PUBLIC_GOOGLE_API_KEY=你的_Google_Maps_API_Key
EXPO_PUBLIC_OPENWEATHER_API_KEY=你的_OpenWeather_API_Key
EXPO_PUBLIC_TDX_CLIENT_ID=你的_TDX_Client_ID
EXPO_PUBLIC_TDX_CLIENT_SECRET=你的_TDX_Client_Secret
```

---

## 🚀 快速啟動 (Quick Start)

本專案推薦使用 `pnpm` 進行套件管理，以獲得最快的安裝速度與最乾淨的依賴環境。

### 1. 安裝 pnpm (若尚未安裝)
```bash
npm install -g pnpm
```

### 2. 安裝專案依賴套件
```bash
pnpm install
```

### 3. 啟動 Expo 開發伺服器
```bash
pnpm start
```

### 💡 重要開發提示
當伺服器啟動並出現終端機選單後，請在終端機按下 **`s`** 鍵，以**切換到 Expo 開發模式 (Development Build / Expo Go)**。
接著你可以使用手機掃描 QRCode，或按下 `i` 開啟 iOS 模擬器、`a` 開啟 Android 模擬器進行測試。

---

## 📦 技術棧 (Tech Stack)
* **Framework**: React Native (Expo)
* **Navigation**: React Navigation
* **Maps**: `react-native-maps`, Google Places API
* **Hardware Sensors**: `expo-camera`, `expo-location`, `expo-sensors`, `expo-haptics`
* **Network**: `axios`, `fetch` (with abort controllers)