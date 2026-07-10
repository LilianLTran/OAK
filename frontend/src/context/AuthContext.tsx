import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api';
import { Role, User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; firstName: string; lastName: string; phone?: string; role: Role }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      setUser(await api.get<User>('/auth/me'));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register: AuthState['register'] = async (input) => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', input);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    void api.post('/auth/logout').catch(() => undefined);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
