# VibeTrip — Flow Charts

> 用 mermaid 寫，在 GitHub / VS Code Mermaid Preview 都會自動渲染。

---

## 1. 主流程一張圖（核心黃金路徑）

> **VibeTrip 的核心體驗：選 vibe → 看行程 → AR 導覽**

```mermaid
flowchart LR
    A[🏠 主頁<br/>HomeScreen] -->|點動物選 vibe<br/>vibeKey=cafe| B[🗓 行程頁<br/>TripScreen]
    B -->|AI 即時生成 3 站行程| B
    B -->|搖一搖換一批<br/>排除舊 trip id| B
    B -->|點「開始導覽 →」<br/>傳 tripItems| C[📷 AR 導覽<br/>ArScreen 全螢幕]
    C -->|拍照 / 錄影<br/>存成個人足跡| D[🗺 地圖<br/>看自己今天去哪]

    style A fill:#E2E146,stroke:#000,stroke-width:2px
    style B fill:#FF6FA8,stroke:#000,stroke-width:2px,color:#fff
    style C fill:#2E45B0,stroke:#000,stroke-width:2px,color:#fff
    style D fill:#FBF6F0,stroke:#000,stroke-width:2px
```

---

## 2. 整體導覽結構（Navigation Tree）

> 反映實際 Navigator 嵌套關係。AR 在頂層 Stack（全螢幕），其他 4 個都在 TabNavigator 裡。

```mermaid
graph TD
    Root["App.jsx<br/>(Providers: Auth + Dim)"] --> Nav["AppNavigator<br/>Native Stack"]

    Nav --> Tabs["MainTabs<br/>Bottom Tab Navigator"]
    Nav -.全螢幕模態.-> AR["📷 AR (ArScreen)<br/>fullScreenModal"]

    Tabs --> Home["🏠 Home<br/>HomeScreen"]
    Tabs --> TripTab["🗓 Trip<br/>TripScreen Stack"]
    Tabs --> Explore["🌏 Explore<br/>ExploreScreen"]
    Tabs --> ProfileTab["👤 Profile<br/>ProfileScreen Stack"]

    TripTab --> TripMain["TripMain<br/>(內含 EmptyState/Loading/Error 三種狀態)"]

    Explore -->|內部切換 tab state| ExpMap["MapScreen 子畫面"]
    Explore -->|內部切換 tab state| ExpCom["Community Feed"]

    ProfileTab --> ProfileMain["ProfileMain"]
    ProfileTab --> Login["LoginScreen"]
    ProfileTab --> Register["RegisterScreen"]
    ProfileTab --> Weather["WeatherScreen"]
    ProfileTab --> Capsules["MyCapsulesScreen"]
    ProfileTab --> Saved["SavedSpotsScreen"]

    style Root fill:#FF6FA8,color:#fff
    style AR fill:#2E45B0,color:#fff
    style Home fill:#E2E146
    style TripTab fill:#FF6FA8,color:#fff
    style Explore fill:#E2E146
    style ProfileTab fill:#E2E146
```

---

## 3. 使用者主要旅程（時序圖）

```mermaid
sequenceDiagram
    actor User as 旅人
    participant Home as 🏠 主頁
    participant Trip as 🗓 行程頁
    participant API as 後端 (FastAPI)
    participant AI as Groq Llama 3.3
    participant AR as 📷 AR 導覽
    participant Map as 🗺 地圖

    User->>Home: 開啟 App
    Note over Home: 13 隻 vibe 動物<br/>左右滑動

    User->>Home: 摸動物（觸覺回饋 + 噴愛心）
    User->>Home: 點咖啡浣熊（選 vibe）
    Home->>Trip: navigate('Trip', { vibeKey: 'cafe' })

    Trip->>Trip: 顯示海浪 loading
    Trip->>API: POST /trips/recommend<br/>{vibe_key, lat, lon}
    API->>API: Google Places 搜尋附近店家
    API->>AI: 給候選店家 + vibe 規則
    AI-->>API: 行程 JSON（3 站）
    API-->>Trip: 完整行程

    Trip->>User: 行程膠囊 stagger 進場<br/>（彩色 + 虛線連接）

    opt 不滿意
        User->>Trip: 點「換一批」
        Trip->>API: POST 加 exclude_trip_ids=[舊 id]
        API-->>Trip: 完全不同的 3 站
    end

    User->>Trip: 點「開始導覽 →」CTA
    Trip->>AR: navigate('AR', { tripItems })

    AR->>User: 相機畫面 + 指南針
    Note over AR: 逐站引導<br/>箭頭指向下一站

    User->>AR: 抵達拍照
    AR->>API: POST /uploads/image (multipart)
    API-->>AR: https 圖片 URL
    AR->>API: POST /spots/personal { lat, lon, image_url }

    User->>Map: 切到探索 tab 看地圖
    Map->>User: 顯示今天的足跡 pin
```

---

## 4. 行程頁三狀態切換（狀態機）

> 同一個 TripMain 元件根據 state 渲染不同畫面 — 沒選 vibe / 載入中 / 載入失敗 / 行程展示

```mermaid
stateDiagram-v2
    [*] --> CheckCache: TripMain 掛載

    CheckCache --> EmptyTripState: 從 Tab 直接進入<br/>+ 無 _tripCache
    CheckCache --> ShowTrip: 從 Tab 進入<br/>+ 有 _tripCache
    CheckCache --> Loading: 從 HomeScreen 帶 vibeKey 進入

    EmptyTripState --> [*]: 點「回主頁選 Vibe」<br/>navigate('Home')

    Loading --> CallAPI: 顯示海浪動畫
    CallAPI --> ApplyTimes: POST /trips/recommend
    ApplyTimes --> ShowTrip: 套用當下時間 + 寫 _tripCache
    CallAPI --> ShowError: 25 秒 timeout

    ShowError --> Loading: 點「重新探索」

    ShowTrip --> ShakeReshape: 點「換一批」
    ShakeReshape --> Loading: 把當前 trip id 加 exclude

    ShowTrip --> NavAR: 點「開始導覽 →」
    NavAR --> [*]: navigate('AR', tripItems)

    note right of CheckCache
        _tripCache 是 module-level let
        跨 Tab 切換存活
        App 重啟才清空
    end note
```

---

## 5. 登入 / 註冊流程

```mermaid
graph LR
    Start([App 啟動]) --> Check{SecureStore<br/>有 token?}
    Check -->|有| Validate["GET /users/me<br/>驗 token"]
    Check -->|無| Guest[訪客模式<br/>可瀏覽不可上傳]

    Validate -->|200 OK| LoggedIn["✅ 已登入<br/>(AuthContext.user)"]
    Validate -->|401| ClearToken[清空 token]
    ClearToken --> Guest

    Guest --> NavLogin["Profile Tab → 點登入"]
    NavLogin --> LoginScreen["LoginScreen<br/>(輸入帳密)"]

    LoginScreen --> Submit{送出}
    Submit -->|成功| StoreToken[SecureStore.set]
    Submit -->|失敗| ShowErr["顯示「帳號或密碼錯誤」"]
    ShowErr --> LoginScreen

    LoginScreen -->|點立即註冊| RegScreen["RegisterScreen<br/>(暱稱/Email/帳號/密碼)"]
    RegScreen --> SubmitReg{送出}
    SubmitReg -->|409 Conflict| AlreadyUsed[此帳號或 Email 已被使用]
    SubmitReg -->|422 Validation| BadFormat[格式不正確]
    SubmitReg -->|成功| StoreToken
    AlreadyUsed --> RegScreen
    BadFormat --> RegScreen

    StoreToken --> LoggedIn

    style LoggedIn fill:#AAC9CE,color:#000
    style Guest fill:#E5C1CD
    style ShowErr fill:#FF6FA8,color:#fff
```

---

## 6. AR 導覽流程

```mermaid
graph TD
    Enter[從 TripScreen 點開始導覽] --> CheckPerm{權限檢查}
    CheckPerm -->|無相機權限| AskCam[請求 Camera permission]
    CheckPerm -->|無位置權限| AskLoc[請求 Location permission]
    AskCam --> CheckPerm
    AskLoc --> CheckPerm
    CheckPerm -->|全部允許| ShowCamera["📷 CameraView<br/>+ AR overlay 指南針"]

    ShowCamera --> Compass[指南針指向當前站]
    Compass --> Arrive{抵達目的?}
    Arrive -->|否| Compass
    Arrive -->|是| NextStop{還有下一站?}
    NextStop -->|是| Compass
    NextStop -->|否| Complete[🎉 行程完成]

    ShowCamera --> QuickTools[側邊快捷工具拉環]
    QuickTools --> Photo[📸 拍照]
    QuickTools --> Video[🎥 錄影]
    QuickTools --> Emergency[🚨 110 報案]

    Photo --> Upload["POST /uploads/image<br/>(multipart)"]
    Upload --> SaveSpot["POST /spots/personal<br/>(含 https image_url)"]
    SaveSpot --> Done[存進相簿 + 雲端足跡]

    style ShowCamera fill:#2E45B0,color:#fff
    style Complete fill:#AAC9CE
    style Emergency fill:#FF6FA8,color:#fff
```

---

## 7. 低明度模式切換（DimContext）

```mermaid
graph LR
    Boot[App 啟動] --> ReadStore["AsyncStorage<br/>讀 vt_dim_mode"]
    ReadStore --> InitDim{值 = '1'?}
    InitDim -->|是| DimOn["dim=true<br/>pal=PAL_DIM (莫蘭迪)"]
    InitDim -->|否| DimOff["dim=false<br/>pal=PAL_BRIGHT (鮮豔)"]

    DimOn --> Provider[DimContext.Provider]
    DimOff --> Provider

    Provider --> Screens[所有 Screen]
    Screens --> UsePAL["usePAL() hook<br/>讀 C = current palette"]

    UserToggle["Profile → 點「低明度模式」"] --> Toggle["toggleDim()"]
    Toggle --> WriteStore[AsyncStorage 寫入新值]
    Toggle --> ReRender[Context value 改變<br/>整 App re-render]
    ReRender --> Screens

    style DimOn fill:#AAC9CE
    style DimOff fill:#E2E146
```

---

## 8. 全域資料流（State / Persistence）

```mermaid
graph TB
    subgraph Module["📦 模組層快取（App 開啟期間）"]
        TripCache[_tripCache<br/>let module variable]
    end

    subgraph Persistent["💾 持久化儲存"]
        TokenStore["vt_token<br/>(SecureStore 加密)"]
        AvatarStore["vt_avatar_uri<br/>(AsyncStorage)"]
        DimStore["vt_dim_mode<br/>(AsyncStorage)"]
        SavedTrips["vt_saved_trips<br/>(AsyncStorage)"]
    end

    subgraph Context["🌐 全域 Context"]
        AuthCtx["AuthContext<br/>user, login, logout"]
        DimCtx["DimContext<br/>pal, toggleDim"]
    end

    subgraph Local["⚛️ 元件 useState"]
        TripState["TripScreen<br/>trip, loading, error"]
        HomeState["HomeScreen<br/>activeIdx, hearts"]
        ProfileState["ProfileScreen<br/>stats, avatarUri"]
    end

    TokenStore -.開機還原.-> AuthCtx
    DimStore -.開機還原.-> DimCtx
    AvatarStore -.開機還原.-> ProfileState
    AvatarStore -.開機還原.-> HomeState

    AuthCtx --> HomeState
    AuthCtx --> ProfileState
    DimCtx -->|usePAL| TripState
    DimCtx -->|usePAL| HomeState
    DimCtx -->|usePAL| ProfileState

    TripState <-.讀寫.-> TripCache
    SavedTrips -.讀寫.-> TripState

    style TokenStore fill:#FF6FA8,color:#fff
    style TripCache fill:#E5C1CD
    style AuthCtx fill:#AAC9CE
    style DimCtx fill:#AAC9CE
```

---

## 9. 後端 API 呼叫流程（以行程生成為例）

```mermaid
sequenceDiagram
    participant App as VibeTrip App
    participant Client as apiClient.js
    participant API as FastAPI :8000
    participant DB as PostgreSQL<br/>+ PostGIS
    participant Cache as Redis
    participant LLM as Groq Llama 3.3
    participant Google as Google Places

    App->>Client: apiPost('/trips/recommend', body)
    Client->>Client: 加 Bearer token
    Client->>API: POST /api/v1/trips/recommend

    API->>Cache: 查 vibe+location 快取
    alt Cache hit
        Cache-->>API: 直接回快取結果
    else Cache miss
        API->>Google: 搜尋附近店家
        Google-->>API: 候選列表
        API->>API: 過濾即將打烊的店
        API->>LLM: 給 vibe 規則 + 候選店家
        LLM-->>API: 行程 JSON（3 站）
        API->>API: validate_activities()<br/>驗證 schema
        API->>API: enrich_distances()<br/>補站間距離
        API->>Cache: 寫入快取 (TTL 30 分鐘)
    end

    API->>DB: 寫入 trips 紀錄（給 exclude 用）
    DB-->>API: trip.id
    API-->>Client: 200 { id, title, items }
    Client-->>App: 解析 JSON
    App->>App: applyCurrentTimes()<br/>套當下時間 + setTrip()
```

---

## 10. 圖片上傳兩階段流程

> 修過 bug 之後的正確流程：本機 file:// 先換成 https URL，再寫入 spot

```mermaid
sequenceDiagram
    actor User
    participant Picker as expo-image-picker
    participant App as VibeTrip App
    participant API as FastAPI

    User->>App: 點「上傳照片」
    App->>Picker: launchImageLibraryAsync()<br/>mediaTypes: ['images']
    Picker-->>App: file:///var/.../photo.jpg<br/>(本機 URI)
    App->>User: 顯示預覽

    User->>App: 寫備註 + 點儲存

    Note over App: ⚠️ file:// 後端拿不到<br/>必須先上傳

    App->>API: POST /api/v1/uploads/image<br/>(multipart, FormData)
    API->>API: 存進 /app/uploads/ volume
    API-->>App: { url: "https://...../xxx.jpg" }

    App->>API: POST /api/v1/spots/personal<br/>{ lat, lon, image_url: 上面拿到的 url }
    API-->>App: 201 Created { id, ... }

    App->>User: ✅ 顯示新足跡<br/>關閉 Modal
```

---

## 11. 全域旅程故事板

```mermaid
journey
    title 一個下午的 VibeTrip 體驗
    section 主頁
      開啟 App 看動物動畫: 5: 旅人
      左右滑找喜歡的 vibe: 5: 旅人
      摸了一下浣熊（好可愛）: 5: 旅人
    section 行程
      點咖啡浣熊: 5: 旅人
      看海浪 loading: 4: 旅人
      行程出現（3 站咖啡店）: 5: 旅人
      搖一搖換一份: 3: 旅人
    section 導覽
      按開始導覽 CTA: 5: 旅人
      AR 指南針帶路: 5: 旅人
      抵達第一站拍照: 5: 旅人
      自動存雲端足跡: 4: 旅人
    section 回家
      切到地圖看今天去哪: 5: 旅人
      到社群看別人去哪: 4: 旅人
      晚上切低明度模式護眼: 5: 旅人
```
