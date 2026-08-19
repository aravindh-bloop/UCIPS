import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { User } from '../api/types';
import { clearToken, loadToken, saveToken } from './tokenStorage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  registerStart: (payload: authApi.RegisterStartPayload) => Promise<authApi.RegisterStartResult>;
  registerVerify: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await authApi.me(stored.access_token);
        setToken(stored.access_token);
        setUser(freshUser);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearToken();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  }, []);

  // Any authenticated request that comes back 401 means the stored token is dead (expired, or
  // pointing at an account that no longer exists -- e.g. after the backend switched databases).
  // Without this, the app stays "logged in" against a token the server rejects and every screen
  // just errors in a loop with no way back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await authApi.login(identifier, password);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const registerStart = useCallback(
    (payload: authApi.RegisterStartPayload) => authApi.registerStart(payload),
    [],
  );

  const registerVerify = useCallback(async (phone: string, otp: string) => {
    const result = await authApi.registerVerify(phone, otp);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  // Memoized for the same reason as ToastProvider's value: screens depend on these in
  // useCallback/useFocusEffect dependency arrays, so an unstable identity causes re-fetch loops.
  const value = useMemo(
    () => ({ user, token, loading, login, registerStart, registerVerify, logout }),
    [user, token, loading, login, registerStart, registerVerify, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
