import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens } from '../api/types';
import { apiClient, setAccessToken, setStoredRefreshToken, getStoredRefreshToken, refreshAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (tokens: AuthTokens, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const data = await apiClient<User>('/users/me');
      setUser(data);
    } catch {
      setUser(null);
      setAccessToken(null);
      setStoredRefreshToken(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const stored = getStoredRefreshToken();
      if (stored) {
        const token = await refreshAccessToken();
        if (token) {
          await fetchCurrentUser();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (tokens: AuthTokens, preloadedUser?: User) => {
    setAccessToken(tokens.access_token);
    setStoredRefreshToken(tokens.refresh_token);
    if (preloadedUser) {
      setUser(preloadedUser);
    } else {
      await fetchCurrentUser();
    }
  };

  const logout = async () => {
    const currentRefreshToken = getStoredRefreshToken();
    const isAdmin = user?.role === 'ADMIN' || window.location.pathname.startsWith('/admin');
    try {
      if (currentRefreshToken) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });
      }
    } catch {
      // ignore network errors on logout
    } finally {
      setAccessToken(null);
      setStoredRefreshToken(null);
      setUser(null);
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
