# VibeTrip (P人漫遊)

這是一款專為「不愛做功課、說走就走」的 P 型旅人打造的盲盒行程 App。
透過 AI 與 AR 技術，一鍵生成接下來 3 小時的完美路線。

## 團隊
* 企劃 / 程式邏輯：BEE (負責 API 串接、Firebase、手機硬體呼叫、Navigation)
* 美術 / UI/UX：Lin (負責版面刻劃、Lottie 動畫、視覺設計)

## 技術棧
* 框架：React Native (Expo)
* 套件管理： `pnpm` (本專案嚴格限制使用 pnpm，請勿使用 npm)
* 導覽列： React Navigation (Material Top Tabs)

## 資料夾結構 (後續會建立)
```text
vibetrip/
├── App.js               # App 進入點與導覽列設定
├── src/
│   ├── screens/         # 四個主要畫面
│   │   ├── HomeScreen.js
│   │   ├── ResultScreen.js
│   │   ├── ArScreen.js
│   │   └── MapScreen.js
│   ├── components/      # 共用的 UI 元件 (如按鈕、卡片)
│   └── assets/          # 圖片與動畫檔
├── package.json
└── README.md
