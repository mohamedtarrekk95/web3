'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useExchangeStore, preloadPrices } from '@/store/exchangeStore';
import CoinSelector from './CoinSelector';

const POLLING_INTERVAL = 12000; // 12 seconds

export default function ExchangeWidget() {
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
    priceValidUntil,
    fallback,
    priceMessage,
    priceCache,
    setCoins,
    setFromCoin,
    setToCoin,
    setAmount,
    setPrice,
    setLoading,
    setIsUpdating,
    getCachedPrice,
    swapCoins,
  } = useExchangeStore();

  const [timeLeft, setTimeLeft] = useState(60);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const initialLoadRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch price with instant cache display
  const fetchPrice = useCallback(async (isBackground = false) => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
      if (!isBackground) {
        setLoading(false);
      }
      return;
    }

    // Same coin - instant 1:1 rate
    if (fromCoin.symbol === toCoin.symbol) {
      setPrice(1, 1, parseFloat(amount), Date.now() + 60000, false, 'Same coin');
      setLoading(false);
      return;
    }

    // Show shimmer on initial load only
    if (!isBackground && !initialLoadRef.current) {
      setShowShimmer(true);
    }

    if (!isBackground) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const response = await fetch(
        `/api/price?from=${fromCoin.symbol}&to=${toCoin.symbol}&amount=${amount}`
      );
      const data = await response.json();

      if (response.ok && data.rate > 0) {
        setPrice(data.rate, data.marketRate, data.total, data.validUntil, data.fallback, data.message);
        setTimeLeft(60);
        setShowShimmer(false);
        initialLoadRef.current = true;

        // Update cache for future instant display
        useExchangeStore.getState().setPriceCache(`${fromCoin.symbol}-${toCoin.symbol}`, {
          price: data.rate,
          marketRate: data.marketRate,
          total: data.total,
          timestamp: Date.now(),
          fallback: data.fallback || false,
        });
      } else if (data.rate === 0 && data.fallback) {
        // API failed but returning cached/fallback value
        setPrice(data.rate || 0, data.marketRate || 0, data.total || 0, Date.now() + 60000, true, data.message || 'Using last known price');
        setShowShimmer(false);
      }
    } catch (err) {
      console.warn('Price fetch error:', err);
    } finally {
      setLoading(false);
      setIsUpdating(false);
      setShowShimmer(false);
    }
  }, [fromCoin, toCoin, amount, setLoading, setIsUpdating, setPrice]);

  // Initial setup - load coins and preload prices
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/coins');
        const data = await res.json();
        setCoins(data);
        if (data.length >= 2) {
          setFromCoin(data[0]);
          setToCoin(data[1]);
        }
      } catch (error) {
        console.error('Failed to load coins:', error);
      }
    }
    init();

    // Preload popular prices in background
    preloadPrices();
  }, [setCoins, setFromCoin, setToCoin]);

  // Fetch price when coins change (instant if cache exists)
  useEffect(() => {
    if (fromCoin && toCoin) {
      // Show cached price immediately if available
      const cacheKey = `${fromCoin.symbol}-${toCoin.symbol}`;
      const cached = getCachedPrice(cacheKey);

      if (cached && Date.now() - cached.timestamp < 20000) {
        // Use cached price instantly
        setPrice(cached.price, cached.marketRate, cached.total, Date.now() + 60000, cached.fallback, cached.fallback ? 'Using last known price' : 'Cached');
        setShowShimmer(false);
      }

      // Then fetch fresh price in background
      fetchPrice(true);
    }
  }, [fromCoin, toCoin, fetchPrice, getCachedPrice, setPrice]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (priceValidUntil) {
        const remaining = Math.max(0, Math.floor((priceValidUntil - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          fetchPrice(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [priceValidUntil, fetchPrice]);

  // Polling interval (every 12 seconds)
  useEffect(() => {
    if (fromCoin && toCoin) {
      pollingRef.current = setInterval(() => {
        fetchPrice(true);
      }, POLLING_INTERVAL);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [fromCoin, toCoin, fetchPrice]);

  const handleSwap = async () => {
    if (isSwapping) return;
    setIsSwapping(true);
    swapCoins();
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsSwapping(false);
  };

  const handleExchange = async () => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || total <= 0) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCoin: fromCoin.symbol,
          toCoin: toCoin.symbol,
          amountSent: parseFloat(amount),
          amountReceived: total,
        }),
      });

      const order = await response.json();
      if (response.ok) {
        router.push(`/invoice/${order.orderId}`);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  const formatNumber = (num: number, decimals: number = 8) => {
    if (!Number.isFinite(num) || num === 0) return '—';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const displayTotal = () => {
    if (loading || showShimmer) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading...</span>
        </div>
      );
    }
    if (total <= 0 || !Number.isFinite(total)) {
      return <span className="text-gray-500">Enter amount</span>;
    }
    return formatNumber(total);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Exchange</h2>
            <div className="flex items-center gap-2 text-sm">
              {fallback ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-500">{priceMessage || 'Cached'}</span>
                </>
              ) : isUpdating ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-cyan-500">Updating...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-500">Live</span>
                </>
              )}
            </div>
          </div>

          <div className="relative">
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
              className="w-full mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

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

          <div>
            <CoinSelector
              coins={coins}
              selectedCoin={toCoin}
              onSelect={setToCoin}
              label="You Get"
            />
            <div className="mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/30 border border-gray-700/50 rounded-xl text-cyan-400 min-h-[60px] flex items-center">
              {displayTotal()}
            </div>
          </div>

          {price > 0 && Number.isFinite(price) && (
            <div className="space-y-2 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rate</span>
                <span className="text-gray-300">
                  1 {fromCoin?.symbol} = {formatNumber(price)} {toCoin?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Market Rate</span>
                <span className="text-gray-400">
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

          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>All fees included</span>
            <span className="text-xs">Updates every {POLLING_INTERVAL / 1000}s</span>
          </div>

          <button
            onClick={handleExchange}
            disabled={!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || total <= 0 || loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 ? (
              'Select coins to exchange'
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
