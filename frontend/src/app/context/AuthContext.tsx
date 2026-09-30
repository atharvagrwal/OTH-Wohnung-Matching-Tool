import { createContext, useContext, useState, ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<void>;
  completeSsoLogin: (code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - simulates SSO from university portal
    await new Promise(resolve => setTimeout(resolve, 800));

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail === 'max.mustermann@stud.oth-regensburg.de' && password === 'password123') {
      setUser({
        id: '1',
        email: trimmedEmail,
        name: 'Max Mustermann',
        gender: 'male',
        dateOfBirth: '2000-03-15',
        role: 'student',
      });
    } else if (trimmedEmail === 'anna.schmidt@stud.oth-regensburg.de' && password === 'secure456') {
      setUser({
        id: '2',
        email: trimmedEmail,
        name: 'Anna Schmidt',
        gender: 'female',
        dateOfBirth: '2001-07-22',
        role: 'student',
      });
    } else {
      throw new Error('Invalid OTH Portal credentials. Please check your email or password.');
    }
  };

  const completeSsoLogin = async (code: string) => {
    const response = await apiService.exchangeSsoCode(code);
    setUser({
      id: String(response.userId),
      email: response.email,
      name: response.name,
      gender: 'diverse',
      dateOfBirth: '',
      role: response.role === 'STUDENT' ? 'student' : 'worker',
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            login,
            completeSsoLogin,
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