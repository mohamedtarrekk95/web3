'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [setUser, setLoading]);

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
        setUser({ userId: data.userId, email: data.email, name: data.name });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
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
  const performLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      logout();
    }
  }, [logout]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    login,
    register,
    logout: performLogout,
    isAuthenticated: !!user,
  };
}
