/**
 * AuthContext — 登入 / 註冊 / 登出狀態管理
 *
 * 提供:
 *   user        — 目前登入的使用者物件 (null 表示未登入)
 *   isLoggedIn  — Boolean
 *   login(username, password)                      → Promise
 *   register(username, email, password, displayName) → Promise
 *   logout()
 *
 * token 同步寫入 apiClient 模組層級變數，所有後續 apiGet/apiPost 自動帶 Bearer。
 */
import React, { createContext, useContext, useState } from 'react';
import { apiPost, setAuthToken, clearAuthToken } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const res = await apiPost('/api/v1/auth/login', { username, password });
    setUser(res.user);
    setAuthToken(res.access_token);
    return res;
  };

  const register = async (username, email, password, displayName) => {
    const res = await apiPost('/api/v1/auth/register', {
      username,
      email,
      password,
      display_name: displayName || undefined,
    });
    setUser(res.user);
    setAuthToken(res.access_token);
    return res;
  };

  const logout = () => {
    setUser(null);
    clearAuthToken();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
