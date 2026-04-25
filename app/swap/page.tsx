'use client';

import { useEffect, useState } from 'react';
import SwapWidget from '@/components/SwapWidget';
import Navbar from '@/components/Navbar';

export default function SwapPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Crypto Swap</h1>
          <p className="text-gray-400">Get the best price across multiple DEX aggregators</p>
        </div>

        <div className="mt-8">
          <SwapWidget />
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Best Price Routing</h3>
            <p className="text-gray-400 text-sm">
              Our system automatically finds the best exchange rate across multiple DEXs and aggregators.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Low Fees</h3>
            <p className="text-gray-400 text-sm">
              Only 0.3% platform fee. All gas fees estimated upfront. No hidden costs.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Fast Execution</h3>
            <p className="text-gray-400 text-sm">
              Quick quote refresh and efficient routing for optimal swap execution.
            </p>
          </div>
        </div>

        {/* Supported Coins */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">Supported Tokens</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT', 'LTC', 'TRX', 'BCH', 'LINK', 'UNI'].map((token) => (
              <span key={token} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300">
                {token}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto py-6 text-center text-gray-500 text-sm">
        <p>Secure crypto swap powered by 1inch aggregation protocol</p>
      </footer>
    </div>
  );
}
