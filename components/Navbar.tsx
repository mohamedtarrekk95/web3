'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import WalletButton from './WalletButton';
import { useState, useEffect } from 'react';

// Google Translate types
declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: {
          InlineLayout: {
            SIMPLE: number;
          };
          new (config: {
            pageLanguage: string;
            includedLanguages: string;
            layout: number;
          }, elementId: string): void;
        };
      };
    };
    googleTranslateElementInit: () => void;
  }
}

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load Google Translate element
    if (!window.googleTranslateElementInit) {
      const addScript = document.createElement('script');
      addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(addScript);
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,ar,es,fr,de,zh-CN,ru,pt,ja,ko',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        }, 'google_translate_element');
      };
    }
  }, []);

  const handleLanguageChange = (lang: string) => {
    if (window.google && window.google.translate) {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = lang;
        select.dispatchEvent(new Event('change'));
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-white">
            CryptoExchange
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/swap"
                  className="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Swap
                </Link>
                <WalletButton />
                <Link
                  href="/p2p"
                  className="px-4 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  P2P
                </Link>
                {/* Google Translate */}
                {mounted && (
                  <div className="relative">
                    <div id="google_translate_element" className="translate-widget" />
                  </div>
                )}
                <Link
                  href="/my-orders"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  My Orders
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      href="/admin"
                      className="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Admin
                    </Link>
                    <Link
                      href="/admin/p2p-settings"
                      className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      P2P Settings
                    </Link>
                  </>
                )}
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
                  href="/p2p"
                  className="px-4 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  P2P
                </Link>
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-2">
              <Link
                href="/swap"
                className="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Swap
              </Link>
              <div className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>
                <WalletButton />
              </div>
              <Link
                href="/p2p"
                className="px-4 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                P2P
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/my-orders"
                    className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  {user?.role === 'admin' && (
                    <>
                      <Link
                        href="/admin"
                        className="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                      <Link
                        href="/admin/p2p-settings"
                        className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        P2P Settings
                      </Link>
                    </>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                    <span className="text-sm text-gray-400">{user?.name}</span>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors inline-block text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}