'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * AdminRoute - Shows admin-only content, hides for non-admins
 *
 * This does NOT block access to the page.
 * It only conditionally renders admin-specific UI elements.
 *
 * Use this inside admin pages to wrap admin-only controls.
 */
export function AdminRoute({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, loading, hydrated } = useAuthStore();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!hydrated || loading) return;

    if (!user) {
      setShowAdmin(false);
      return;
    }

    if (user.role === 'admin') {
      setShowAdmin(true);
    } else {
      setShowAdmin(false);
    }
  }, [user, loading, hydrated]);

  if (!hydrated || loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  return <>{showAdmin ? children : fallback}</>;
}
