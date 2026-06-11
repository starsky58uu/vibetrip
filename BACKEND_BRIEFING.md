# VibeTrip Backend 技術懶人包

> 給期末報告用 — 30 秒看懂後端在做什麼

---

## 1️⃣ 一頁總覽

```
[手機 App] ──HTTPS──> [Cloudflare Tunnel] ──> [FastAPI :8000]
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                       PostgreSQL 15        Redis 7              第三方 API
                       + PostGIS 3.3        (快取)               Google Maps
                       (靜態+空間)                                 OpenWeather
                                                                  TDX 交通部
                                                                  Groq LLM
```

**部署**：Docker Compose 4 個容器（api / db / redis / cloudflared）打包，一鍵啟動。
**對外**：用 Cloudflare Tunnel 不暴露機器 IP，免費拿 HTTPS。

---

## 2️⃣ 技術棧

| 類別 | 技術 | 用途 |
|---|---|---|
| **Web 框架** | FastAPI 0.100+ | async/await 全非同步、自動產生 OpenAPI |
| **ORM** | SQLAlchemy 2.0 + asyncpg | type-safe ORM，非同步資料庫驅動 |
| **資料庫** | PostgreSQL 15 + **PostGIS 3.3** | 關聯式 + 空間查詢（距離一行 SQL 解決） |
| **快取** | Redis 7 | 多 worker 共用、固定視窗 rate limit |
| **認證** | JWT (python-jose) + **bcrypt** | Access + Refresh token |
| **驗證** | Pydantic 2.0 | Request/Response schema、自動型別檢查 |
| **AI** | Groq AsyncGroq SDK | Llama 3.3 行程生成 |
| **Schema migration** | Alembic | 資料庫版本控制 |
| **測試** | pytest + asyncio-mode | 100% coverage（fail_under = 100） |

---

## 3️⃣ 分層架構（最重要的設計觀念）

```
┌─────────────────────────────────────────────────┐
│ endpoint  (app/api/v1/endpoints/)               │
│   ↑ 只做：參數驗證 + Depends + 呼叫 service     │
│   ↑ 不寫 SQL、不直呼外部 API                    │
├─────────────────────────────────────────────────┤
│ service   (app/services/)                       │
│   ↑ 流程編排 + 快取策略 + 拋 HTTPException      │
│   ↑ 不碰 Request/Response                       │
├─────────────────────────────────────────────────┤
│ external  (app/services/external/)              │
│   ↑ 第三方 HTTP 薄包裝（Google / OWM / TDX）    │
│ db        (app/db/models/)                      │
│   ↑ 純 ORM 定義，不寫業務邏輯                   │
│ redis     (app/core/redis_client.py)            │
│   ↑ cache_get_json / cache_set_json + namespace │
└─────────────────────────────────────────────────┘
```

**資料流公式**：`endpoint → service → (db | redis | external)`

---

## 4️⃣ 資料分層 — 誰存哪裡？

### PostgreSQL + PostGIS（靜態、關聯式、空間查詢）

| Table | 用途 |
|---|---|
| `users` | 帳號、bcrypt 雜湊密碼、display_name、avatar_url |
| `personal_spots` | 個人足跡（PostGIS `GEOGRAPHY` 座標 + note + image_url + is_public） |
| `community_spots` | 公開社群地標（含 likes_count、saves_count 計數欄） |
| `spot_likes` / `spot_saves` | 互動關聯表（user_id ↔ spot_id） |
| `trip_templates` + `trip_items` | 盲盒行程模板（AI 失敗時的 fallback） |
| `bus_stops` / `mrt_stations` / `youbike_stations` | TDX 靜態站點清單 |

**為什麼用 PostGIS？** 算距離一行 SQL：
```sql
ST_DWithin(location, ST_MakePoint(:lon, :lat)::geography, 500)
```
不在 Python 層算地球曲率。

### Redis 7（動態、秒級變動、短命）

| Key 模式 | TTL | 內容 |
|---|---|---|
| `vibetrip:bus:eta:*` | 15 秒 | 公車即時到站 |
| `vibetrip:mrt:eta:*` | 15 秒 | 捷運即時到站 |
| `vibetrip:youbike:*` | 30 秒 | YouBike 可借/可還 |
| `vibetrip:weather:current:*` | 10 分鐘 | OpenWeatherMap 當前天氣 |
| `vibetrip:weather:forecast:*` | 30 分鐘 | 5 日預報 |
| `vibetrip:places:nearby:*` | 30-60 分鐘 | Google Places 結果 |
| `vibetrip:tdx:access_token` | 23 小時 | TDX OAuth2 token |
| `vibetrip:ratelimit:*` | 滾動 | 固定視窗計數器 |

**好處**：第三方 API 呼叫降到原本 1/10，省錢又快。

---

## 5️⃣ 核心功能模組

### 🔐 認證（`endpoints/auth.py`）

```
POST /auth/register   註冊（bcrypt 雜湊密碼）
POST /auth/login      登入 → 回 access + refresh token
POST /auth/refresh    用 refresh token 換新 access token
POST /auth/logout     登出（撤銷 token）
```

- JWT HS256，access token 60 分鐘，refresh token 30 天
- 密碼用 bcrypt 直接呼叫（不透過已棄用的 passlib bcrypt backend）

### 🤖 AI 盲盒行程生成（`services/ai/`）

```
POST /trips/recommend
  body: { vibe_key, latitude, longitude, exclude_trip_ids? }
```

**生成流程**：

```
1. Google Places 搜尋附近店家
2. 過濾即將打烊的（fetch_closing_times）
3. Groq Llama 3.3 排組合 + 生文案
4. validate_activities 驗證 AI 回答合法性
5. enrich_distances 補站間距離
6. 結果快取 Redis（不含 user 個資）
```

**降級策略**：
- AI 失敗 → 從 DB `trip_templates` 隨機挑一筆
- 下雨天 → `walk` / `photo` vibe 自動降級成「躲室內」

### 🚌 大眾運輸（`endpoints/transit.py`）

```
GET /transit/bus/eta    公車即時到站
GET /transit/mrt/eta    捷運即時到站
GET /transit/bikes      YouBike 可借/可還
```

- TDX OAuth2 client_credentials flow
- TDX access token 快取 23 小時（TDX 給 1 天，留 1 小時 buffer）

### 🌤️ 天氣（`endpoints/weather.py`）

```
GET /weather/current     當前天氣（10 分鐘快取）
GET /weather/forecast    5 日預報（30 分鐘快取）
```

- OpenWeatherMap API
- 天氣資料還會餵給 AI 影響推薦（雨天降級到室內 vibe）

### 📍 足跡與社群（`endpoints/spots.py`）

```
POST   /spots/personal           新增個人足跡（含 PostGIS 座標）
GET    /spots/personal           列出我的足跡
PATCH  /spots/personal/{id}      更新
DELETE /spots/personal/{id}      刪除
GET    /spots/saved              我收藏的地標
GET    /spots/community          公開社群 feed（分頁）
POST   /spots/community/{id}/like   點讚（自動同步 likes_count）
POST   /spots/community/{id}/save   收藏（自動同步 saves_count）
```

- `is_public=true` 時自動同步建立 `community_spots`
- 用 PostGIS 做 `nearby` 查詢

### 📸 圖片上傳（`endpoints/uploads.py`）

```
POST /uploads/image  (multipart/form-data, field=file)
  支援：JPEG / PNG / WebP / HEIC
  上限：10MB
  回傳：可公開存取的 https 圖片網址
```

- 圖片存到容器 volume `/app/uploads`
- FastAPI `StaticFiles` 掛在 `/static/uploads/` 對外提供

### 🧠 AI 口味分析（`endpoints/taste.py`）

```
GET /taste/profile   依使用者過去足跡分析「漫遊人格」
```

### 👤 使用者（`endpoints/users.py`）

```
GET   /users/me         我的基本資料
GET   /users/me/stats   我的足跡 / 收藏統計
PATCH /users/me         更新 display_name / avatar_url
```

### 🗺️ 地點 + 路線（`endpoints/places.py`、`directions.py`）

```
GET  /places/nearby           Google Places nearby
GET  /places/search           Google Places text search
GET  /directions/raw          原始 Google Directions（給 AR 逐步導航）
POST /directions/calculate    多模式比較（走路/公車/騎車）
```

---

## 6️⃣ 安全性與防護

| 項目 | 實作 |
|---|---|
| **JWT secret 檢查** | 非 DEBUG 模式啟動時若還是預設值會 raise |
| **bcrypt 密碼雜湊** | cost factor 12，登入時 verify_password |
| **Rate Limit（Redis）** | `/trips/recommend` 15 次/分/IP、`/uploads/image` 30 次/小時/user |
| **CORS** | 從 `CORS_ORIGINS` 環境變數讀，prod 限白名單 |
| **Production 隱藏 docs** | `/docs`、`/redoc`、`/openapi.json` 僅 DEBUG 開啟 |
| **健康檢查** | `/healthz` 同時驗 DB + Redis，degraded 回 503 |
| **Reverse proxy IP** | 解析 `X-Forwarded-For` 取真實 IP（給 rate limiter 用） |

---

## 7️⃣ 開發品質

| 項目 | 數字 |
|---|---|
| 測試檔 | `tests/api/` 8 個 + `tests/integration/` 5 個 |
| **Coverage 門檻** | **`fail_under = 100`**（100% 覆蓋率才能 pass） |
| Lint | Ruff（line-length: 100、target py3.11） |
| Schema 變更 | Alembic migrations 控管 |
| Pre-commit hooks | `.pre-commit-config.yaml`（lint + format） |
| CI/CD | `.github/` 內有 workflows |

---

## 8️⃣ 一句話總結（給教授/評審聽）

> 「VibeTrip 後端是一個用 **FastAPI 全非同步** 寫的微服務，
> 把第三方 API（Google、OWM、TDX）的金鑰集中管理 + Redis 快取，
> 用 **PostgreSQL + PostGIS** 做空間查詢、**Groq LLM** 做盲盒行程生成，
> 部署用 **Docker Compose + Cloudflare Tunnel**，
> **測試覆蓋率 100%**，開發遵循嚴格的分層架構（endpoint → service → external/db）。」

---

## 9️⃣ 報告現場常被問的問題

| Q | A |
|---|---|
| 為什麼用 FastAPI 不用 Django？ | 全非同步、自動產 OpenAPI、上手快、適合純 API 場景 |
| 為什麼用 PostGIS？ | 「附近 500 公尺」這種查詢一行 SQL 解決，比 Python 算距離快上百倍 |
| 為什麼要 Redis？ | TDX 即時到站每 15 秒會變，但同一秒可能 100 個人在查，Redis 把第三方 API 呼叫降到 1/100 |
| 為什麼用 Groq 不用 OpenAI？ | Llama 3.3 推論速度快 10 倍、成本低 5 倍，回傳 JSON 結構穩定 |
| 為什麼用 Cloudflare Tunnel？ | 不開公網 port、免費 HTTPS、自動 DDoS 防護 |
| 測試覆蓋率怎麼到 100%？ | 拆好分層 + Pydantic 替我們做型別檢查，剩下的邊界情境一條條補 |
| 怎麼防止 AI 亂講？ | 三層防護：給 vibe rule prompt、validate_activities 驗 schema、fetch_closing_times 驗店家還沒打烊 |

---

## 🔟 專案結構速查

```
vibetrip-backend/
├── app/
│   ├── main.py              # FastAPI 進入點 + lifespan
│   ├── api/v1/
│   │   ├── api_router.py    # 11 個 sub-router 集中掛載
│   │   └── endpoints/       # auth / trips / spots / weather / ...
│   ├── services/
│   │   ├── ai/              # AI 行程生成（Groq + Places + 驗證）
│   │   ├── external/        # Google / OWM / TDX 客戶端
│   │   └── *.py             # 各模組業務層
│   ├── db/
│   │   ├── models/          # SQLAlchemy ORM
│   │   ├── base.py          # Base + Mixin
│   │   └── init_db.py
│   ├── schemas/             # Pydantic Request/Response
│   └── core/
│       ├── config.py        # Settings (pydantic-settings)
│       ├── security.py      # JWT + bcrypt
│       ├── deps.py          # Depends 共用依賴
│       ├── redis_client.py  # Redis 連線 + cache helpers
│       └── rate_limit.py    # Redis 固定視窗
├── alembic/                 # DB migrations
├── docker-compose.yml       # 4 service：api + db + redis + cloudflared
├── docs/                    # API.md / CONVENTIONS.md / TESTING.md ...
└── tests/                   # api/ + integration/
```
