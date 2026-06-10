import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** @type {'development' | 'preview' | 'production'} */
export const APP_VARIANT = extra.appVariant ?? 'production';

export const API_BASE_URL = String(
  extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
).trim();

const PROD_API_HOST = 'vibetrip.codingraccoon.com';

export function isApiConfigured() {
  return API_BASE_URL.length > 0;
}

/** 本機 dev backend（LAN IP 或 :8001），非 EAS 發佈版 */
export function isLocalDevApi() {
  if (!API_BASE_URL) return false;
  try {
    const { hostname, port } = new URL(API_BASE_URL);
    if (port === '8001') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) return true;
    return false;
  } catch {
    return false;
  }
}

export function isProdApi() {
  try {
    return new URL(API_BASE_URL).hostname === PROD_API_HOST;
  } catch {
    return false;
  }
}

/** 畫面頂部環境提示（preview / 本機 dev） */
export function shouldShowEnvBanner() {
  return APP_VARIANT !== 'production' || isLocalDevApi();
}

export function envBannerLabel() {
  if (isLocalDevApi()) return `DEV API · ${API_BASE_URL}`;
  if (APP_VARIANT === 'preview') return 'PREVIEW';
  if (APP_VARIANT === 'development') return 'DEV BUILD';
  return APP_VARIANT.toUpperCase();
}
