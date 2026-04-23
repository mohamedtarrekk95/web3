'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface PaymentMethod {
  id: string;
  name: string;
  instructions: string;
}

interface Currency {
  id: string;
  name: string;
  code: string;
  buyPrice: string;
  sellPrice: string;
  paymentMethods: PaymentMethod[];
}

interface Settings {
  p2pBuyPrice?: string;
  p2pSellPrice?: string;
  p2pPaymentInstructions?: string;
  p2pEnabled?: string;
  p2pCurrencies?: string;
}

export default function P2PPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, authLoading]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.p2pCurrencies) {
          try {
            const parsed = JSON.parse(data.p2pCurrencies);
            setCurrencies(parsed);
            if (parsed.length > 0) {
              setSelectedCurrency(parsed[0]);
            }
          } catch {
            setCurrencies([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const calculateUSDT = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !selectedCurrency) return '0';

    const price = mode === 'buy'
      ? parseFloat(selectedCurrency.buyPrice || '0')
      : parseFloat(selectedCurrency.sellPrice || '0');

    if (price <= 0) return '0';
    return (numAmount / price).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCurrency || !selectedPaymentMethod) {
      setError('Please fill in all required fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (mode === 'buy' && !walletAddress.trim()) {
      setError('Please enter your USDT wallet address');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const usdtAmount = calculateUSDT();

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode === 'buy' ? 'p2p_buy' : 'p2p_sell',
          fromCoin: selectedCurrency.code,
          toCoin: 'USDT',
          amountSent: numAmount,
          amountReceived: parseFloat(usdtAmount),
          receivingAddress: walletAddress.trim(),
          paymentMethod: selectedPaymentMethod,
          telegramUsername: telegramUsername.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.orderId) {
        router.push(`/orders/${data.orderId}`);
      } else {
        setError(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const usdtAmount = calculateUSDT();
  const price = mode === 'buy'
    ? parseFloat(selectedCurrency?.buyPrice || '0')
    : parseFloat(selectedCurrency?.sellPrice || '0');

  const showDisabled = settings.p2pEnabled === 'false';

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exchange
          </a>
          <h1 className="text-3xl font-bold text-white">P2P Exchange</h1>
          <p className="text-gray-400 mt-2">Buy or sell USDT with local payment methods</p>
        </header>

        {pageLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showDisabled ? (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 text-center">
            <div className="text-2xl font-bold text-red-400 mb-4">P2P Exchange is Currently Disabled</div>
            <p className="text-gray-400">Please check back later or contact support.</p>
            <a
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Exchange
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
                {error}
              </div>
            )}

            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Mode</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('buy')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === 'buy'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">Buy</div>
                  <div className="text-sm opacity-75">Get USDT</div>
                </button>
                <button
                  onClick={() => setMode('sell')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === 'sell'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">Sell</div>
                  <div className="text-sm opacity-75">Get Local Currency</div>
                </button>
              </div>
            </div>

            {currencies.length > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Current Rate</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                    <div className="text-sm text-gray-400 mb-1">Buy USDT</div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {selectedCurrency?.buyPrice || '---'} {selectedCurrency?.code || ''}
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                    <div className="text-sm text-gray-400 mb-1">Sell USDT</div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedCurrency?.sellPrice || '---'} {selectedCurrency?.code || ''}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Amount</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Currency</label>
                  <select
                    value={selectedCurrency?.id || ''}
                    onChange={(e) => {
                      const currency = currencies.find(c => c.id === e.target.value);
                      setSelectedCurrency(currency || null);
                      setSelectedPaymentMethod('');
                    }}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {currencies.length === 0 ? (
                      <option value="">No currencies available</option>
                    ) : (
                      currencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount in {selectedCurrency?.code || 'currency'}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {amount && parseFloat(amount) > 0 && price > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">You will {mode === 'buy' ? 'receive' : 'send'}</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    {usdtAmount} USDT
                  </span>
                </div>
              </div>
            )}

            {selectedCurrency && selectedCurrency.paymentMethods.length > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Payment Method</h2>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="">Select payment method</option>
                  {selectedCurrency.paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
                {selectedPaymentMethod && (() => {
                  const method = selectedCurrency.paymentMethods.find(p => p.name === selectedPaymentMethod);
                  if (method?.instructions) {
                    return (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-xl">
                        <p className="text-gray-400 text-sm">{method.instructions}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {mode === 'buy' && (
              <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Your USDT Wallet Address</h2>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your TRC20 USDT wallet address"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}

            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Contact Info</h2>
              <input
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="Telegram username (optional, for faster contact)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !amount || !selectedCurrency || !selectedPaymentMethod || (mode === 'buy' && !walletAddress)}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Submit ${mode === 'buy' ? 'Buy' : 'Sell'} Order`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}