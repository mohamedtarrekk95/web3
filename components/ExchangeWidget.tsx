'use client';

import { useEffect, useCallback, useRef, memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExchangeStore, preloadPrices } from '@/store/exchangeStore';
import CoinSelector from './CoinSelector';

const POLLING_INTERVAL = 15000; // 15 seconds
const CACHE_FRESH_MS = 20000; // 20 seconds

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
    isUpdating,
    fallback,
    priceMessage,
    setCoins,
    setFromCoin,
    setToCoin,
    setAmount,
    setPrice,
    setLoading,
    setIsUpdating,
    getPriceCache,
    swapCoins,
  } = useExchangeStore();

  const [timeLeft, setTimeLeft] = useState(60);
  const [isSwapping, setIsSwapping] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const lastCacheKeyRef = useRef<string>('');

  // Check if cache exists and is fresh
  const hasFreshCache = useCallback((from: string, to: string): boolean => {
    const cacheKey = `${from}-${to}`;
    const cached = getPriceCache(cacheKey);
    return cached !== null && Date.now() - cached.timestamp < CACHE_FRESH_MS;
  }, [getPriceCache]);

  // Fetch price from API - properly handles loading state
  const fetchPrice = useCallback(async (forceRefresh = false) => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
      setLoading(false);
      return;
    }

    const cacheKey = `${fromCoin.symbol}-${toCoin.symbol}`;

    // Skip if cache is fresh (unless forced)
    if (!forceRefresh && hasFreshCache(fromCoin.symbol, toCoin.symbol)) {
      return;
    }

    // Abort any in-flight request
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    fetchControllerRef.current = new AbortController();

    // If we already have a price showing (cached), this is a background refresh
    const isBackgroundRefresh = price > 0 && Number.isFinite(price);
    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const res = await fetch(
        `/api/price?from=${fromCoin.symbol}&to=${toCoin.symbol}&amount=${amount}`,
        { signal: fetchControllerRef.current.signal }
      );

      if (!res.ok) throw new Error('API error');

      const data = await res.json();

      // Check if component is still mounted and we got valid data
      if (!mountedRef.current) return;

      if (data.rate > 0) {
        // SUCCESS: Update price and clear loading state
        setPrice(data.rate, data.marketRate, data.total, data.validUntil, data.fallback, data.message);
        setLoading(false);
        setIsUpdating(false);
        setTimeLeft(60);
        lastCacheKeyRef.current = cacheKey;
      } else {
        // API returned 0 rate - keep loading or show error
        setLoading(false);
        setIsUpdating(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled - that's fine, ignore
        return;
      }
      console.warn('Price fetch error:', error);
      setLoading(false);
      setIsUpdating(false);
    }
  }, [fromCoin, toCoin, amount, price, setPrice, setLoading, setIsUpdating, getPriceCache, hasFreshCache]);

  // Initial setup - runs once on mount
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
    preloadPrices();

    return () => {
      mountedRef.current = false;
    };
  }, [setCoins, setFromCoin, setToCoin]);

  // When coins change - show cached price instantly, then fetch fresh
  useEffect(() => {
    if (!fromCoin || !toCoin) return;

    const cacheKey = `${fromCoin.symbol}-${toCoin.symbol}`;
    const cached = getPriceCache(cacheKey);

    if (cached) {
      // CACHE HIT: Show cached price immediately, no loading
      setPrice(cached.price, cached.marketRate, cached.total, Date.now() + 60000, cached.fallback, 'Cached');
      setLoading(false); // <-- CRITICAL: loading is false when we have cache

      // Background refresh if cache is getting stale (>10s old)
      if (Date.now() - cached.timestamp > 10000) {
        fetchPrice(true);
      }
    } else {
      // CACHE MISS: Show loading while fetching
      setLoading(true);
      fetchPrice(false);
    }
  }, [fromCoin?.symbol, toCoin?.symbol]); // Only depend on symbol changes

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling - silent refresh every 15 seconds
  useEffect(() => {
    if (!fromCoin || !toCoin) return;

    pollingRef.current = setInterval(() => {
      fetchPrice(true);
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fromCoin?.symbol, toCoin?.symbol, fetchPrice]);

  // Swap handler
  const handleSwap = useCallback(() => {
    if (isSwapping) return;
    setIsSwapping(true);
    swapCoins();
    setTimeout(() => setIsSwapping(false), 300);
  }, [isSwapping, swapCoins]);

  // Exchange handler
  const handleExchange = useCallback(async () => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || total <= 0) return;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCoin: fromCoin.symbol,
          toCoin: toCoin.symbol,
          amountSent: parseFloat(amount),
          amountReceived: total,
        }),
      });

      const order = await res.json();
      if (res.ok) {
        router.push(`/invoice/${order.orderId}`);
      }
    } catch (error) {
      console.error('Order error:', error);
    }
  }, [fromCoin, toCoin, amount, total, router]);

  // Number formatting
  const formatNumber = useCallback((num: number, decimals = 8): string => {
    if (!Number.isFinite(num) || num === 0) return '—';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  }, []);

  // Display content for price box
  const getDisplayContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading...</span>
        </div>
      );
    }

    if (!Number.isFinite(total) || total <= 0) {
      return <span className="text-gray-500">Enter amount</span>;
    }

    return <span className="tabular-nums">{formatNumber(total)}</span>;
  };

  // Status indicator
  const getStatusIndicator = () => {
    if (loading) {
      return <span className="text-gray-400">Loading...</span>;
    }
    if (fallback) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-500">{priceMessage || 'Cached'}</span>
        </>
      );
    }
    if (isUpdating) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-cyan-500">Updating...</span>
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
            <span className="text-xs">Updates every {POLLING_INTERVAL / 1000}s</span>
          </div>

          {/* Exchange Button */}
          <button
            onClick={handleExchange}
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
              'Exchange Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ExchangeWidgetComponent);
