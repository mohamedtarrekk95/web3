'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * ProtectedRoute - Clean separation of auth vs role checks
 *
 * AUTH CHECK (all protected routes):
 * - If NOT logged in → redirect to /login
 * - If logged in → allow access
 *
 * ROLE CHECK (admin only):
 * - If requiredRole="admin" AND user.role !== "admin" → redirect to /
 * - If requiredRole="user" → no role restriction (any user can access)
 */
export function ProtectedRoute({
  children,
  requiredRole = 'user',
  redirectTo = '/login',
}: {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  redirectTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hydrated, setUser, setLoading, setHydrated } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  // Check auth by fetching user from /api/auth/me
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

  // Set hydrated on mount
  useEffect(() => {
    setHydrated();
  }, [setHydrated]);

  // Mark as initialized after mount
  useEffect(() => {
    setInitialized(true);
  }, []);

  // Check auth on mount after hydration
  useEffect(() => {
    if (!hydrated) return;
    checkAuth();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect logic - ONLY runs after auth is fully loaded
  useEffect(() => {
    // Don't run until:
    // 1. Component has mounted (initialized)
    // 2. Store is hydrated
    // 3. Auth check has completed (loading is false)
    if (!initialized || !hydrated || loading) return;

    // At this point: we know if user is logged in or not
    if (!user) {
      // User is NOT logged in → redirect to login
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('returnUrl', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    // User IS logged in
    if (requiredRole === 'admin' && user.role !== 'admin') {
      // Admin route but user is NOT admin → redirect to home
      router.replace('/');
      return;
    }

    // For requiredRole='user': no additional role check needed
    // User is logged in → allow access (render children)

  }, [initialized, hydrated, loading, user, requiredRole, redirectTo, pathname, router]);

  // Loading state: show spinner until auth is checked
  if (!initialized || !hydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth failed → don't render anything (redirect in progress)
  if (!user) {
    return null;
  }

  // Admin route but user is not admin → don't render (redirect in progress)
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return null;
  }

  // User is authorized → render protected content
  return <>{children}</>;
}
