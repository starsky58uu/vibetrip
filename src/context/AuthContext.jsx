/**
 * AuthContext — 登入 / 註冊 / 登出狀態管理
 *
 * 提供:
 *   user        — 目前登入的使用者物件 (null 表示未登入)
 *   isLoggedIn  — Boolean
 *   loading     — 初始化中（從 SecureStore 恢復 token）
 *   login(username, password)                      → Promise
 *   register(username, email, password, displayName) → Promise
 *   logout()
 *
 * token 持久化：
 *   - access_token  存 SecureStore "vt_access"
 *   - refresh_token 存 SecureStore "vt_refresh"
 *   - app 啟動時自動讀取，恢復登入狀態，不用每次重新登入
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiPost, apiGet, setAuthToken, clearAuthToken } from '../services/apiClient';

const AuthContext = createContext(null);

const KEY_ACCESS  = 'vt_access';
const KEY_REFRESH = 'vt_refresh';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // 初始化讀 token 期間

  // ── app 啟動：從 SecureStore 恢復登入狀態 ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const access  = await SecureStore.getItemAsync(KEY_ACCESS);
        const refresh = await SecureStore.getItemAsync(KEY_REFRESH);

        if (access) {
          setAuthToken(access);
          // 拿目前使用者資料（確認 token 還有效）
          try {
            const me = await apiGet('/api/v1/users/me');
            setUser(me);
          } catch (e) {
            if (e.status === 401) {
              // access token 過期 → 試用 refresh token 換新的
              if (refresh) {
                try {
                  const res = await apiPost('/api/v1/auth/refresh', { refresh_token: refresh });
                  setAuthToken(res.access_token);
                  await SecureStore.setItemAsync(KEY_ACCESS, res.access_token);
                  const me = await apiGet('/api/v1/users/me');
                  setUser(me);
                } catch {
                  // refresh 也過期 → 清掉，讓使用者重新登入
                  await _clearStore();
                }
              } else {
                await _clearStore();
              }
            }
            // 其他錯誤（網路超時、後端未啟動）：保留 token 等下次連線
            // setUser 維持 null → UI 顯示未登入，但 token 還在 SecureStore
          }
        }
      } catch (e) {
        console.warn('[AuthContext] 恢復登入失敗:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── 登入 ─────────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const res = await apiPost('/api/v1/auth/login', { username, password });
    setUser(res.user);
    setAuthToken(res.access_token);
    await SecureStore.setItemAsync(KEY_ACCESS,  res.access_token);
    await SecureStore.setItemAsync(KEY_REFRESH, res.refresh_token);
    return res;
  };

  // ── 註冊 ─────────────────────────────────────────────────────────────────────
  const register = async (username, email, password, displayName) => {
    const res = await apiPost('/api/v1/auth/register', {
      username,
      email,
      password,
      display_name: displayName || undefined,
    });
    setUser(res.user);
    setAuthToken(res.access_token);
    await SecureStore.setItemAsync(KEY_ACCESS,  res.access_token);
    await SecureStore.setItemAsync(KEY_REFRESH, res.refresh_token);
    return res;
  };

  // ── 登出 ─────────────────────────────────────────────────────────────────────
  const logout = async () => {
    setUser(null);
    clearAuthToken();
    await _clearStore();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

async function _clearStore() {
  clearAuthToken();
  await SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => {});
  await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {});
}

export const useAuth = () => useContext(AuthContext);
