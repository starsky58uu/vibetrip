/**
 * 載入 .env 檔（app.config.js 用）。
 *
 * 優先順序：
 *   1. .env（共用預設）
 *   2. EAS build → .env.<EAS_BUILD_PROFILE>（preview / production / development）
 *   3. eas update / 本機 script → APP_VARIANT 同上
 *   4. 本機 Metro（無 variant）→ .env.local 覆寫
 *
 * 已存在於 process.env 的變數不覆寫（保留 EAS 注入）。
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

function loadFile(filename, override) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  config({ path: filePath, override });
}

export function loadEnvFiles() {
  loadFile('.env', false);

  const profile =
    process.env.EAS_BUILD_PROFILE?.trim() ||
    process.env.APP_VARIANT?.trim();

  if (profile) {
    loadFile(`.env.${profile}`, true);
  } else {
    loadFile('.env.local', true);
  }
}

export function getAppVariant() {
  return (
    process.env.EXPO_PUBLIC_APP_VARIANT?.trim() ||
    process.env.APP_VARIANT?.trim() ||
    'production'
  );
}
