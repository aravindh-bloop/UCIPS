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

  async function login(identifier: string, password: string) {
    const result = await authApi.login(identifier, password);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }

  async function registerStart(payload: authApi.RegisterStartPayload) {
    return authApi.registerStart(payload);
  }

  async function registerVerify(phone: string, otp: string) {
    const result = await authApi.registerVerify(phone, otp);
    await saveToken(result);
    setToken(result.access_token);
    setUser(result.user);
  }

  async function logout() {
    await clearToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, registerStart, registerVerify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
