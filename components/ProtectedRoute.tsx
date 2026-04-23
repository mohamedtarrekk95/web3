'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * ProtectedRoute - Auth check only (NO role restrictions)
 *
 * - If NOT logged in → redirect to /login
 * - If logged in → allow access (any role)
 *
 * Role-based UI hiding is done via user?.role check in components,
 * NOT via route blocking.
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hydrated, setUser, setLoading, setHydrated } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
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

  useEffect(() => {
    setHydrated();
  }, [setHydrated]);

  useEffect(() => {
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    checkAuth();
  }, [hydrated]);

  useEffect(() => {
    if (!initialized || !hydrated || loading) return;

    // Only auth check: redirect if not logged in
    if (!user) {
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('returnUrl', pathname);
      router.replace(loginUrl.toString());
    }
    // NO role check here anymore - any logged-in user can access
  }, [initialized, hydrated, loading, user, redirectTo, pathname, router]);

  if (!initialized || !hydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
