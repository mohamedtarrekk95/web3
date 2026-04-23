'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout: ZustandLogout } = useAuthStore();
  const checkAuthRef = useRef<(() => Promise<void>) | null>(null);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser({
          userId: data.user.userId,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role || 'user',
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [setUser, setLoading]);

  checkAuthRef.current = checkAuth;

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({
          userId: data.userId,
          email: data.email,
          name: data.name,
          role: data.role || 'user',
        });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  }, [setUser]);

  // Register
  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Registration failed' };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      ZustandLogout();
    }
  }, [ZustandLogout]);

  // Check auth on mount - only once
  useEffect(() => {
    if (checkAuthRef.current) {
      checkAuthRef.current();
    }
  }, []);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };
}
