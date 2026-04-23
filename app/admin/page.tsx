'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [initialized, loading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-1">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <AdminCard
            href="/admin/orders"
            title="Manage Orders"
            description="View and manage all exchange orders"
            icon={
              <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <AdminCard
            href="/admin/wallets"
            title="Manage Wallets"
            description="Configure deposit addresses and QR codes"
            icon={
              <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
        </div>

        {user?.role === 'admin' && (
          <div className="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">Admin Features</h2>
            <p className="text-gray-400 text-sm">
              You have full admin access. All administrative controls are visible.
            </p>
          </div>
        )}

        {user?.role !== 'admin' && (
          <div className="mt-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-400 mb-2">View Only Access</h2>
            <p className="text-gray-500 text-sm">
              Some admin features are hidden. Contact an administrator for full access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </a>
  );
}
