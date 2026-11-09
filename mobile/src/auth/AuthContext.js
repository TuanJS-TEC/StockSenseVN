import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearCache, request, setToken, setUnauthorizedHandler } from '../api/client';
import { tokenStore } from './tokenStore';

const AuthContext = createContext(null);
const EXPIRED = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

// status: 'loading' (reading the saved token) | 'signedIn' | 'signedOut' | 'offline' (token kept, server unreachable)
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, message: '' });
  const restoring = useRef(false);

  const forget = useCallback(async (message = '') => {
    setToken(null);
    clearCache();
    try { await tokenStore.clear(); } catch { /* nothing to clear */ }
    setState({ status: 'signedOut', user: null, message });
  }, []);

  const restore = useCallback(async () => {
    if (restoring.current) return;
    restoring.current = true;
    setState({ status: 'loading', user: null, message: '' });
    try {
      let saved = null;
      try { saved = JSON.parse((await tokenStore.get()) ?? 'null'); } catch { saved = null; }
      // Sessions last 24 h and there is no refresh token yet (SDD 8.3): an expired token means logging in again.
      if (!saved?.token || !(saved.expiresAt > Date.now())) {
        await forget(saved?.token ? EXPIRED : '');
        return;
      }
      setToken(saved.token);
      try {
        const { user } = await request('/me');
        setState({ status: 'signedIn', user, message: '' });
      } catch (error) {
        if (error.status === 401) await forget(EXPIRED);
        else setState({ status: 'offline', user: null, message: error.message });
      }
    } finally {
      restoring.current = false;
    }
  }, [forget]);

  useEffect(() => {
    setUnauthorizedHandler(() => { forget('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.'); });
    restore();
  }, [forget, restore]);

  const login = useCallback(async (email, password) => {
    const data = await request('/auth/login', { method: 'POST', body: { email, password, client: 'mobile' } });
    setToken(data.token);
    if (data.user.must_change_password) {
      // A temporary password must be changed first; that screen exists on the web only for now.
      try { await request('/auth/logout', { method: 'POST' }); } catch { /* the session expires anyway */ }
      setToken(null);
      throw new Error('Tài khoản cần đổi mật khẩu tạm trước khi dùng. Hãy đăng nhập trên web để đổi, rồi quay lại app.');
    }
    await tokenStore.set(JSON.stringify({ token: data.token, expiresAt: Date.now() + data.expires_in * 1000 }));
    clearCache();
    setState({ status: 'signedIn', user: data.user, message: '' });
  }, []);

  // FR-M0-02: revoke the session on the server first, then delete the local token even if the server is unreachable.
  const logout = useCallback(async () => {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* still forget the token locally */ }
    await forget();
  }, [forget]);

  const value = useMemo(() => ({ ...state, login, logout, retry: restore }), [state, login, logout, restore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
