# 環境與 EAS 發佈

三種前端環境，對應不同後端與發佈方式。

| 環境 | 怎麼跑 | API | 設定檔 |
|------|--------|-----|--------|
| **本機 dev** | `pnpm start` | 本機 `:8001`（同 WiFi） | `.env` + `.env.local` |
| **Preview** | `eas build/update -- … preview` | 正式 tunnel | `.env.preview` / `eas.json` |
| **Production** | `eas build/update -- … production` | 正式 tunnel | `.env.production` / `eas.json` |

## 第一次設定

```bash
cp .env.example .env
cp .env.local.example .env.local      # 本機 dev，改 LAN IP
cp .env.preview.example .env.preview
cp .env.production.example .env.production
# 填入 EXPO_PUBLIC_GOOGLE_API_KEY
```

## 本機開發（連 dev backend）

1. 後端：`docker compose … --profile dev up api-dev`（見 vibetrip-backend/docs/DEV_AND_PROD.md）
2. `.env.local` → `http://<LAN IP>:8001`
3. `pnpm start`

App 頂部會顯示 `DEV API · …` 標籤。

## EAS Preview（測試版 OTA）

```bash
# 首次：建 preview 原生包（只需偶爾重做）
pnpm build:preview

# 之後改 JS/UI 只推 OTA
pnpm update:preview -- "說明這次改了什麼"
```

Preview 安裝包訂閱 `preview` channel；仍打正式 API，頂部顯示 **PREVIEW** 標籤。

## EAS Production（正式版）

```bash
pnpm build:production
pnpm update:production -- "release notes"
```

Production 包訂閱 `production` channel，無環境標籤。

## 變數載入順序

`app.config.js` → `scripts/load-env.js`：

1. `.env`
2. EAS build 時 → `.env.<EAS_BUILD_PROFILE>`
3. `pnpm update:*` 時 → `APP_VARIANT` → `.env.preview` / `.env.production`
4. 本機 Metro（無 variant）→ `.env.local` 覆寫

`eas.json` 各 profile 的 `env` 在 **native build** 時注入；**OTA update** 以本機 `.env.*` + `APP_VARIANT` 為準。

## 指令速查

| 指令 | 用途 |
|------|------|
| `pnpm start` | 本機 Metro |
| `pnpm build:preview` | 建 preview APK/IPA |
| `pnpm build:production` | 建正式包 |
| `pnpm update:preview -- "msg"` | OTA → preview 使用者 |
| `pnpm update:production -- "msg"` | OTA → production 使用者 |
