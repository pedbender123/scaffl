import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  themeMode: 'light' | 'dark';
  accentColor: 'blue' | 'purple' | 'yellow' | 'white' | 'green' | 'red' | 'pink';
  tokensProfessor: number;
  lastResetProfessor: string;
  tokensTutor: number;
  lastResetTutor: string;
  tokensColega: number;
  lastResetColega: string;
  creditsMonthly: number;
  institutions: string[];
}

interface AuthContextType {
  user: { id: string; email: string; role: string; isAdmin: boolean } | null;
  userData: UserData | null;
  loading: boolean;
  register: (name: string, email: string, password: string, inviteCode?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; role: string; isAdmin: boolean } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = React.useCallback(async () => {
    const token = localStorage.getItem('tutorai_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ id: data.id, email: data.email, role: data.role, isAdmin: !!data.isAdmin });
        setUserData(data);
      } else {
        localStorage.removeItem('tutorai_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const register = async (name: string, email: string, password: string, inviteCode?: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, inviteCode })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to register');
    }

    const { user: newUser, token } = await res.json();
    localStorage.setItem('tutorai_token', token);
    setUser({ id: newUser.id, email: newUser.email, role: newUser.role, isAdmin: !!newUser.isAdmin });
    setUserData(newUser);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to login');
    }

    const { user: loggedInUser, token } = await res.json();
    localStorage.setItem('tutorai_token', token);
    setUser({ id: loggedInUser.id, email: loggedInUser.email, role: loggedInUser.role, isAdmin: !!loggedInUser.isAdmin });
    setUserData(loggedInUser);
  };

  const logout = async () => {
    localStorage.removeItem('tutorai_token');
    setUser(null);
    setUserData(null);
  };

  const updateUserData = async (data: Partial<UserData>) => {
    const token = localStorage.getItem('tutorai_token');
    if (!token) return;

    const res = await fetch(`${API_URL}/api/auth/user`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      const updatedUser = await res.json();
      setUserData(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, register, login, logout, updateUserData, refreshUserData: checkAuth }}>
      {!loading && children}
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
