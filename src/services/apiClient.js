// Thin wrapper around the VibeTrip backend API
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const isConfigured = () => !!BASE;

// ── Timeout helper ────────────────────────────────────────────────────────────
const TIMEOUT_MS = 8000; // 8 秒沒回應就放棄（預設）

// timeoutMs 可由呼叫端覆蓋（AI 生成類慢端點用 25 秒）
function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

// ── Token management ─────────────────────────────────────────────────────────
let _token = null;
export const setAuthToken  = (t) => { _token = t; };
export const clearAuthToken = ()  => { _token = null; };
export const getAuthToken   = ()  => _token;

function makeHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

// ── Request helpers ───────────────────────────────────────────────────────────
// 把後端錯誤 body 帶進 Error 物件，方便上層解析
async function throwApiError(res, path) {
  let detail = null;
  try { detail = await res.json(); } catch { /* ignore */ }
  const err = new Error(`API ${res.status}: ${path}`);
  err.status = res.status;
  err.detail = detail;
  throw err;
}

export async function apiGet(path, params = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(String(k), String(v));
  });
  const res = await fetchWithTimeout(url.toString(), { headers: makeHeaders() });
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

// opts.timeoutMs — 覆蓋預設 8 秒（適用 AI 生成等慢端點）
export async function apiPost(path, body = {}, opts = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  }, opts.timeoutMs ?? TIMEOUT_MS);
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

export async function apiPatch(path, body = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: 'PATCH',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

export async function apiDelete(path) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: 'DELETE',
    headers: makeHeaders(),
  });
  if (!res.ok) await throwApiError(res, path);
}

// ── Multipart 上傳（圖片）────────────────────────────────────────────────────
// ⚠️ 不能手動設 Content-Type：FormData 需要 fetch 自動加 multipart boundary
// 預設 timeout 提升到 30 秒（上傳幾 MB 的圖在慢網很可能 > 8 秒）
const UPLOAD_TIMEOUT_MS = 30000;
export async function apiUpload(path, formData, opts = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const headers = {};
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetchWithTimeout(
    `${BASE}${path}`,
    { method: 'POST', headers, body: formData },
    opts.timeoutMs ?? UPLOAD_TIMEOUT_MS,
  );
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}
