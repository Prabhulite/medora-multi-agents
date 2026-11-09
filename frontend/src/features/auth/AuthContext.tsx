import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getErrorMessage } from '../../lib/api';
import type { ApiResponse, AuthUser, LoginPayload } from '../../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('medora_token'),
  );
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const stored = localStorage.getItem('medora_token');
    if (!stored) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me');
      setUser(data.data);
      setToken(stored);
    } catch {
      localStorage.removeItem('medora_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const { data } = await api.post<
        ApiResponse<{ token: string; user: AuthUser }>
      >('/auth/login', payload);

      localStorage.setItem('medora_token', data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('medora_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshProfile,
    }),
    [user, token, loading, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
