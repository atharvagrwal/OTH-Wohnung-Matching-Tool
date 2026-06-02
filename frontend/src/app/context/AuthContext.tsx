import { createContext, useContext, useState, ReactNode } from 'react';

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
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - simulates SSO from university portal
    // In production, this would authenticate through OTH portal and import user data
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock user data imported from university portal
    setUser({
      id: '1',
      email,
      name: 'Max Mustermann',
      gender: 'male',
      dateOfBirth: '2000-03-15',
      role: 'student',
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
