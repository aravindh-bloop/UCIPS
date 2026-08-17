import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { User } from '../api/types';
import { clearToken, loadToken, saveToken } from './tokenStorage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
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

  async function login(identifier: string, password: string) {
    const result = await authApi.login(identifier, password);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }

  async function register(payload: authApi.RegisterPayload) {
    const result = await authApi.register(payload);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }

  async function logout() {
    await clearToken();
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
