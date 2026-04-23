'use client';

import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to access admin features</p>
          <Link href="/login" className="text-cyan-500 hover:text-cyan-400">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Show admin panel to all authenticated users
  // But admin features inside are role-gated
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Welcome, {user?.name}</p>
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

        {/* Role-specific admin content - only visible to admins */}
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
    <Link
      href={href}
      className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </Link>
  );
}
