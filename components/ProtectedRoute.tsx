'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  redirectTo?: string;
}

/**
 * ProtectedRoute - Server-safe auth guard for protected pages
 *
 * Waits for auth to load before making redirect decisions.
 * Prevents redirect loops and flickering.
 */
export function ProtectedRoute({
  children,
  requiredRole = 'user',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    // Wait for auth to load before any redirect decision
    if (loading) return;

    // No user = redirect to login (with return URL)
    if (!user) {
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('returnUrl', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    // Admin route requires admin role
    if (requiredRole === 'admin' && user.role !== 'admin') {
      router.replace('/');
      return;
    }

    // Regular user route just needs authentication
  }, [loading, user, requiredRole, redirectTo, pathname, router]);

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user || (requiredRole === 'admin' && user.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
