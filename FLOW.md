# VibeTrip — Flow Charts

> 用 mermaid 寫，在 GitHub / VS Code Mermaid Preview 都會自動渲染。

---

## 1. 整體導覽結構（Navigation Tree）

```mermaid
graph TD
    Root[App.jsx] --> Nav[AppNavigator]
    Nav --> Tabs[MainTabs]
    Nav --> AR[AR 全螢幕 Stack]

    Tabs --> Home[🏠 主頁]
    Tabs --> Trip[🗓 行程]
    Tabs --> Explore[🌏 探索]
    Tabs --> Profile[👤 個人]

    Trip --> TripMain[TripMain]
    Trip --> EmptyState[EmptyTripState<br/>未選 vibe 時]

    Profile --> ProfileMain[個人主頁]
    Profile --> Login[登入]
    Profile --> Register[註冊]
    Profile --> Weather[天氣]
    Profile --> Capsules[我的膠囊]
    Profile --> Saved[收藏地標]

    Explore --> Map[地圖]
    Explore --> Community[社群]

    style Root fill:#FF6FA8,color:#fff
    style AR fill:#2E45B0,color:#fff
    style Home fill:#E2E146
    style Trip fill:#E2E146
    style Explore fill:#E2E146
    style Profile fill:#E2E146
```

---

## 2. 使用者主要旅程（User Journey）

```mermaid
sequenceDiagram
    actor User as 旅人
    participant Home as 主頁
    participant Trip as 行程頁
    participant API as 後端 AI
    participant AR as AR 導覽

    User->>Home: 開啟 App
    Note over Home: 看到 vibe 動物動畫<br/>左右滑動瀏覽
    User->>Home: 點某隻動物（例：咖啡）
    Home->>Trip: navigate(vibeKey='cafe')

    Trip->>Trip: 顯示 LoadingWaves
    Trip->>API: POST /trips/recommend<br/>{vibe, lat, lon}
    Note over API: Groq Llama 3.3<br/>+ Google Places
    API-->>Trip: 行程資料（3-4 站）
    Trip->>User: 顯示彩色膠囊列<br/>StaggerPill 進場

    alt 不滿意行程
        User->>Trip: 點「換一批」
        Trip->>API: POST 加 exclude_trip_ids
        API-->>Trip: 新行程
    end

    User->>Trip: 點「開始導覽」CTA
    Trip->>AR: navigate('AR', tripItems)

    Note over AR: 相機 + AR overlay<br/>指南針 + 距離
    AR-->>User: 逐站導引

    alt 拍照記錄
        User->>AR: 按拍照
        AR->>AR: saveModal（足跡存雲端）
    end
```

---

## 3. 登入 / 註冊流程

```mermaid
graph LR
    Start([開始]) --> Check{有無 token<br/>SecureStore}
    Check -->|有| ValidateToken[呼叫 /users/me]
    Check -->|無| Guest[訪客模式]

    ValidateToken -->|200| LoggedIn[✅ 已登入]
    ValidateToken -->|401| ClearToken[清空 token]
    ClearToken --> Guest

    Guest --> ClickLogin[點選 Profile → 登入]
    ClickLogin --> LoginScreen[LoginScreen]

    LoginScreen --> InputLogin[輸入帳號/密碼]
    InputLogin --> Submit{送出}
    Submit -->|成功| StoreToken[存 token 到 SecureStore]
    Submit -->|帳密錯| ErrorMsg[顯示錯誤]
    ErrorMsg --> InputLogin

    LoginScreen -->|點立即註冊| Register[RegisterScreen]
    Register --> InputReg[暱稱/Email/帳號/密碼]
    InputReg --> SubmitReg{送出}
    SubmitReg -->|成功| StoreToken
    SubmitReg -->|帳號已存在| ErrorReg[409 已被使用]
    ErrorReg --> InputReg

    StoreToken --> LoggedIn

    style LoggedIn fill:#AAC9CE,color:#000
    style Guest fill:#E5C1CD
    style ErrorMsg fill:#FF6FA8,color:#fff
    style ErrorReg fill:#FF6FA8,color:#fff
```

---

## 4. 行程生成內部流程

```mermaid
stateDiagram-v2
    [*] --> CheckCache: TripMain 掛載

    CheckCache --> RestoreCache: 有 _tripCache<br/>且無 vibeKey
    CheckCache --> ShowEmpty: 無快取且<br/>從 Tab 進入
    CheckCache --> FetchNew: 有 vibeKey<br/>或 refreshKey

    ShowEmpty --> EmptyTripState: 顯示動物+對話框<br/>「先去主頁選個行程吧」
    EmptyTripState --> [*]: 點「回主頁」

    RestoreCache --> ShowTrip
    FetchNew --> Loading: setLoading(true)
    Loading --> GetLocation: requestForegroundPermissions
    GetLocation --> CallAPI: POST /trips/recommend
    CallAPI --> ApplyTimes: applyCurrentTimes()<br/>套用現在時間
    ApplyTimes --> SaveCache: _tripCache = result
    SaveCache --> ShowTrip: 顯示彩色膠囊
    CallAPI --> ShowError: 25 秒 timeout

    ShowError --> RetryButton
    RetryButton --> Loading: 點重新探索

    ShowTrip --> ShakeAction: 點換一批
    ShakeAction --> AddExclude: excludeIds.push(currentId)
    AddExclude --> Loading

    ShowTrip --> NavAR: 點開始導覽
    NavAR --> [*]: navigate AR

    note right of ApplyTimes
        後端回傳的 time 是固定字串
        前端依當下時間重算每站時段
    end note
```

---

## 5. 低明度模式（Dim Mode）切換

```mermaid
graph LR
    Boot[App 啟動] --> ReadStorage[AsyncStorage<br/>讀 vt_dim_mode]
    ReadStorage --> InitDim{值 = '1'?}
    InitDim -->|是| DimOn[dim=true<br/>PAL=PAL_DIM]
    InitDim -->|否| DimOff[dim=false<br/>PAL=PAL_BRIGHT]

    DimOn --> Provider[DimContext.Provider]
    DimOff --> Provider

    Provider --> Screens[所有 Screen]
    Screens --> UsePAL[usePAL hook<br/>取當前 C]

    UserToggle[個人頁點「低明度模式」] --> Toggle{toggleDim}
    Toggle --> WriteStorage[AsyncStorage 寫入]
    Toggle --> ReRender[整個 App<br/>重新 render]
    ReRender --> Screens

    style DimOn fill:#AAC9CE
    style DimOff fill:#E2E146
```

---

## 6. AR 導覽動作流程

```mermaid
graph TD
    Enter[從行程點開始導覽] --> CheckPerm{權限檢查}
    CheckPerm -->|無相機權限| AskCam[請求 Camera]
    CheckPerm -->|無位置權限| AskLoc[請求 Location]
    AskCam --> CheckPerm
    AskLoc --> CheckPerm
    CheckPerm -->|全部允許| ShowCamera[CameraView<br/>+ AR overlay]

    ShowCamera --> StateA{視圖模式}

    StateA -->|NAV| Compass[指南針指向<br/>下一站]
    StateA -->|SEARCH| SearchBar[搜尋附近<br/>店家]
    StateA -->|LIST| TripList[行程列表<br/>逐站查看]

    Compass --> Arrive{到達當前站?}
    Arrive -->|否| Compass
    Arrive -->|是| NextStop[切下一站]
    NextStop --> Compass

    Compass --> TakePhoto[按拍照]
    TakePhoto --> Capture[expo-camera<br/>takePictureAsync]
    Capture --> SaveModal[儲存 Modal]

    SaveModal -->|寫備注 + 儲存| UploadSpot[POST /spots/personal]
    SaveModal -->|略過| ToLib[只存相簿]

    UploadSpot --> SaveLib[同時存相簿]
    SaveLib --> Done([完成])
    ToLib --> Done
```

---

## 7. 互動動畫總覽

```mermaid
graph TD
    Home[主頁]
    Trip[行程頁]
    Profile[個人頁]

    Home -->|摸動物| Pet[Haptic Light<br/>+ scale 1.12<br/>+ 噴 3 顆白愛心]
    Home -->|滑 vibe| Swipe[ScrollView snap<br/>+ Image opacity 切幀]

    Trip -->|進場| Stagger[StaggerPill<br/>每 90ms 一條<br/>translateY 24→0]
    Trip -->|點 CTA| PressScale[PressBtn<br/>spring 0.96→1]
    Trip -->|loading| Waves[海浪橫向 loop<br/>+ 視差兩層<br/>+ loading 圖切幀]

    Profile -->|進場| StaggerMenu[StaggerItem<br/>每 70ms 一條]
    Profile -->|頭像| ImagePicker[expo-image-picker<br/>+ AsyncStorage]

    TabBar[底部 TabBar] -->|切 tab| SlideIndicator[粉色橫線<br/>spring 滑動<br/>friction 8]
```

---

## 8. 資料流（State Management）

```mermaid
graph TB
    subgraph Module["模組層快取"]
        TripCache[_tripCache<br/>let module var]
    end

    subgraph Persistent["持久化 (AsyncStorage / SecureStore)"]
        TokenStore[vt_token<br/>SecureStore]
        AvatarStore[vt_avatar_uri<br/>AsyncStorage]
        DimStore[vt_dim_mode<br/>AsyncStorage]
        SavedTrips[vt_saved_trips<br/>AsyncStorage]
    end

    subgraph Context["全域 Context"]
        AuthCtx[AuthContext<br/>user + token]
        DimCtx[DimContext<br/>pal + dim flag]
    end

    subgraph Local["元件 useState"]
        TripState[TripScreen<br/>trip, loading, error]
        HomeState[HomeScreen<br/>activeIdx, hearts]
        ProfileState[ProfileScreen<br/>stats, avatarUri]
    end

    TokenStore -.恢復.-> AuthCtx
    DimStore -.恢復.-> DimCtx
    AvatarStore -.恢復.-> ProfileState
    AvatarStore -.恢復.-> HomeState

    AuthCtx --> HomeState
    AuthCtx --> ProfileState
    DimCtx -->|usePAL| TripState
    DimCtx -->|usePAL| HomeState
    DimCtx -->|usePAL| ProfileState

    TripState <-.快取.-> TripCache
    SavedTrips -.讀寫.-> TripState

    style TokenStore fill:#FF6FA8,color:#fff
    style TripCache fill:#E5C1CD
    style AuthCtx fill:#AAC9CE
    style DimCtx fill:#AAC9CE
```

---

## 9. 全域旅程（Happy Path Story）

```mermaid
journey
    title 一個下午的 VibeTrip 體驗
    section 開 App
      開啟並看動畫: 5: 旅人
      左右滑找喜歡的 vibe: 5: 旅人
      摸了一下浣熊（好可愛）: 5: 旅人, 浣熊
    section 選行程
      點咖啡浣熊: 5: 旅人
      看海浪載入動畫: 4: 旅人
      行程出現（3 站咖啡店）: 5: 旅人
      搖一搖換一份: 3: 旅人
    section 開始導覽
      按開始導覽: 5: 旅人
      AR 指南針帶路: 5: 旅人, AR
      抵達第一站拍照: 5: 旅人
      存到雲端足跡: 4: 旅人
    section 回家
      在地圖看自己今天去哪: 5: 旅人
      到社群看別人去哪: 4: 旅人
      晚上切低明度護眼: 5: 旅人
```

---

## 10. 後端 API 呼叫流程

```mermaid
sequenceDiagram
    participant App as VibeTrip App
    participant Client as apiClient.js
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Cache as Redis
    participant LLM as Groq Llama 3.3
    participant Google as Google Places

    App->>Client: apiPost('/trips/recommend', body)
    Client->>Client: 加 Bearer token
    Client->>API: POST /api/v1/trips/recommend

    API->>Cache: 查 vibe+location 快取
    alt Cache hit
        Cache-->>API: 返回快取行程
    else Cache miss
        API->>Google: 搜尋附近店家
        Google-->>API: 候選列表
        API->>LLM: 根據 vibe 推薦組合
        LLM-->>API: 行程 JSON
        API->>Cache: 寫入快取（含 trip id）
    end

    API->>DB: 寫入 trips 紀錄
    DB-->>API: trip.id
    API-->>Client: 200 { id, title, items }
    Client-->>App: 解析 JSON
    App->>App: applyCurrentTimes + setTrip
```
