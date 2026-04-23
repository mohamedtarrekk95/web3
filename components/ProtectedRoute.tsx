'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  redirectTo?: string;
}

/**
 * ProtectedRoute - Auth guard that waits for hydration
 *
 * Key principles:
 * 1. NEVER redirect until hydration is complete
 * 2. NEVER redirect until auth check is complete
 * 3. Always pass loading state to prevent flicker
 */
export function ProtectedRoute({
  children,
  requiredRole = 'user',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Wait for both hydration AND auth check to complete
  useEffect(() => {
    if (!hydrated) return;
    if (loading) return;
    setIsReady(true);
  }, [hydrated, loading]);

  // Handle redirect AFTER ready state is determined
  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('returnUrl', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    if (requiredRole === 'admin' && user.role !== 'admin') {
      router.replace('/');
      return;
    }
  }, [isReady, user, requiredRole, redirectTo, pathname, router]);

  // Show loading spinner while NOT ready
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render anything if unauthorized (redirect is in progress)
  if (!user || (requiredRole === 'admin' && user.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
