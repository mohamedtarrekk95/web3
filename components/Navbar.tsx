'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-white">
            CryptoExchange
          </Link>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/my-orders"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  My Orders
                </Link>
                <span className="text-sm text-gray-400">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
