'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, loading, hydrated, setUser, setLoading, setHydrated, logout: ZustandLogout } = useAuthStore();
  const [hydratedLoading, setHydratedLoading] = useState(true);
  const checkAuthRef = useRef<(() => Promise<void>) | null>(null);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
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

  // Handle hydration - wait for store to be ready
  useEffect(() => {
    // Mark as hydrated after mount
    setHydrated();
    setHydratedLoading(false);
  }, [setHydrated]);

  // Check auth on mount AFTER hydration
  useEffect(() => {
    if (!hydrated) return;
    if (checkAuthRef.current) {
      checkAuthRef.current();
    }
  }, [hydrated]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        credentials: 'include',
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      ZustandLogout();
    }
  }, [ZustandLogout]);

  // Combined loading state - true while hydrating OR checking auth
  const isLoading = hydratedLoading || loading;

  return {
    user,
    loading: isLoading,
    hydrated,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };
}
