// Thin wrapper around the VibeTrip backend API
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const isConfigured = () => !!BASE;

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
  const res = await fetch(url.toString(), { headers: makeHeaders() });
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

export async function apiPost(path, body = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

export async function apiPatch(path, body = {}) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, path);
  return res.json();
}

export async function apiDelete(path) {
  if (!isConfigured()) throw new Error('API_NOT_CONFIGURED');
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: makeHeaders(),
  });
  if (!res.ok) await throwApiError(res, path);
}
