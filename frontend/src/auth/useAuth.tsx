import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type Role = 'ADMIN' | 'OPERADOR';

export type AuthUser = { id: string; email: string; role: Role };

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  bootstrapped: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        if (!token) {
          setUser(null);
          setBootstrapped(true);
          return;
        }
        const me = await api.me(token);
        if (!cancelled) setUser(me);
      } catch {
        localStorage.removeItem('token');
        if (!cancelled) setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      bootstrapped,
      login: async (email, password) => {
        const result = await api.login({ email, password });
        localStorage.setItem('token', result.token);
        setToken(result.token);
        setUser(result.user);
      },
      logout: () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      },
    }),
    [token, user, bootstrapped]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
