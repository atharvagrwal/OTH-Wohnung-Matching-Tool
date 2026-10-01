import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  gender: 'male' | 'female' | 'diverse';
  dateOfBirth: string;
  role: 'student' | 'worker';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  ssoEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeSsoLogin: (code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      setUser({
        id: String(response.userId),
        email: response.email,
        name: response.name,
        gender: 'diverse',
        dateOfBirth: '',
        role: response.role === 'STUDENT' ? 'student' : 'worker',
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const config = await apiService.getAuthConfig();
        setSsoEnabled(config.ssoEnabled);
      } catch {
        setSsoEnabled(false);
      }
      await refreshUser();
    };

    void bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085'}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error('Invalid OTH Portal credentials. Please check your email or password.');
    }
    const payload = await response.json();
    setUser({
      id: String(payload.userId),
      email: payload.email,
      name: payload.name,
      gender: 'diverse',
      dateOfBirth: '',
      role: payload.role === 'STUDENT' ? 'student' : 'worker',
    });
  };

  const completeSsoLogin = async (_code: string) => {
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
    }
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            loading,
            ssoEnabled,
            login,
            completeSsoLogin,
            refreshUser,
            logout,
            isAuthenticated: !!user,
          }}
      >
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}