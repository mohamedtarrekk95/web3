'use client';

import { useEffect, useCallback, useRef, memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExchangeStore } from '@/store/exchangeStore';
import { usePriceStream } from '@/lib/usePriceStream';
import CoinSelector from './CoinSelector';

const MARGIN = 0.018;

function ExchangeWidgetComponent() {
  const router = useRouter();
  const {
    coins,
    fromCoin,
    toCoin,
    amount,
    price,
    total,
    marketRate,
    loading,
    fallback,
    priceMessage,
    wsConnected,
    wsReconnecting,
    setCoins,
    setFromCoin,
    setToCoin,
    setAmount,
    setPrice,
    setLoading,
    setCheckoutData,
    swapCoins,
  } = useExchangeStore();

  const { isConnected } = usePriceStream();

  const [timeLeft, setTimeLeft] = useState(60);
  const [isSwapping, setIsSwapping] = useState(false);
  const mountedRef = useRef(true);
  const lastAmountRef = useRef(amount);

  // Initialize - load coins on mount
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        const res = await fetch('/api/coins');
        const data = await res.json();
        if (!mountedRef.current) return;

        setCoins(data);
        if (data.length >= 2) {
          setFromCoin(data[0]);
          setToCoin(data[1]);
        }
      } catch (error) {
        console.error('Init error:', error);
      }
    }

    init();

    return () => {
      mountedRef.current = false;
    };
  }, [setCoins, setFromCoin, setToCoin]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Swap handler
  const handleSwap = useCallback(() => {
    if (isSwapping) return;
    setIsSwapping(true);
    swapCoins();
    setTimeout(() => setIsSwapping(false), 300);
  }, [isSwapping, swapCoins]);

  // Proceed to checkout handler
  const handleProceedToCheckout = useCallback(async () => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || total <= 0 || loading) return;

    console.log('[ExchangeWidget] Proceeding to checkout...');
    console.log('[ExchangeWidget] From:', fromCoin.symbol, 'To:', toCoin.symbol);
    console.log('[ExchangeWidget] Amount:', amount, 'Total:', total);

    // Store checkout data in store
    setCheckoutData({
      fromCoin,
      toCoin,
      amount,
      total,
      price,
      walletInfo: null,
    });

    // Navigate to checkout
    router.push('/checkout');
  }, [fromCoin, toCoin, amount, total, loading, price, setCheckoutData, router]);

  // Format numbers safely
  const formatNumber = useCallback((num: number, decimals = 8): string => {
    if (!Number.isFinite(num) || num === 0) return '—';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  }, []);

  // What to display in price box
  const getDisplayContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Connecting...</span>
        </div>
      );
    }

    if (!Number.isFinite(total) || total <= 0) {
      return <span className="text-gray-500">Enter amount</span>;
    }

    return <span className="tabular-nums">{formatNumber(total)}</span>;
  };

  // Connection status indicator
  const getStatusIndicator = () => {
    if (wsReconnecting || (!wsConnected && !loading)) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-500">Reconnecting...</span>
        </>
      );
    }
    if (wsConnected && price > 0) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-500">Live</span>
        </>
      );
    }
    if (!wsConnected) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
          <span className="text-gray-500">Connecting...</span>
        </>
      );
    }
    if (fallback) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-500">{priceMessage || 'Cached'}</span>
        </>
      );
    }
    return (
      <>
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-green-500">Live</span>
      </>
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Exchange</h2>
            <div className="flex items-center gap-2 text-sm">
              {getStatusIndicator()}
            </div>
          </div>

          {/* From Section */}
          <div>
            <CoinSelector
              coins={coins}
              selectedCoin={fromCoin}
              onSelect={setFromCoin}
              label="You Send"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors tabular-nums"
            />
          </div>

          {/* Swap Button */}
          <div className="relative flex justify-center">
            <button
              onClick={handleSwap}
              disabled={isSwapping}
              className="p-3 bg-gray-800 border border-gray-700 rounded-full hover:border-cyan-500 hover:bg-gray-700/80 transition-all disabled:opacity-50"
            >
              <svg
                className={`w-5 h-5 text-cyan-500 transition-transform ${isSwapping ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Section */}
          <div>
            <CoinSelector
              coins={coins}
              selectedCoin={toCoin}
              onSelect={setToCoin}
              label="You Get"
            />
            <div className="mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/30 border border-gray-700/50 rounded-xl text-cyan-400 min-h-[60px] flex items-center">
              {getDisplayContent()}
            </div>
          </div>

          {/* Price Info */}
          {price > 0 && Number.isFinite(price) && (
            <div className="space-y-2 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rate</span>
                <span className="text-gray-300 tabular-nums">
                  1 {fromCoin?.symbol} = {formatNumber(price)} {toCoin?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Market Rate</span>
                <span className="text-gray-400 tabular-nums">
                  1 {fromCoin?.symbol} = {formatNumber(marketRate)} {toCoin?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Margin</span>
                <span className="text-gray-400">1.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Timer</span>
                <span className={timeLeft <= 10 ? 'text-red-400' : 'text-gray-400'}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>All fees included</span>
            <span className="text-xs">Real-time via WebSocket</span>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleProceedToCheckout}
            disabled={!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || total <= 0 || loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {!fromCoin || !toCoin ? (
              'Select coins to exchange'
            ) : !amount || parseFloat(amount) <= 0 ? (
              'Enter amount'
            ) : loading ? (
              'Loading...'
            ) : total <= 0 ? (
              'Enter valid amount'
            ) : (
              'Proceed to Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ExchangeWidgetComponent);