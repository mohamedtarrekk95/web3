'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExchangeStore } from '@/store/exchangeStore';
import CoinSelector from './CoinSelector';

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
    priceValidUntil,
    error,
    setCoins,
    setFromCoin,
    setToCoin,
    setAmount,
    setPrice,
    setLoading,
    setError,
    swapCoins,
  } = useExchangeStore();

  const [timeLeft, setTimeLeft] = useState(60);
  const [isSwapping, setIsSwapping] = useState(false);

  const fetchPrice = useCallback(async () => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
      setPrice(0, 0, 0, 0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/price?from=${fromCoin.symbol}&to=${toCoin.symbol}&amount=${amount}`
      );
      const data = await response.json();

      if (response.ok) {
        setPrice(data.rate, data.marketRate, data.total, data.validUntil);
        setTimeLeft(60);
      } else {
        setError(data.error || 'Failed to fetch price');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fromCoin, toCoin, amount, setLoading, setError, setPrice]);

  useEffect(() => {
    fetch('/api/coins')
      .then((res) => res.json())
      .then((data) => {
        setCoins(data);
        if (data.length >= 2) {
          setFromCoin(data[0]);
          setToCoin(data[1]);
        }
      })
      .catch(console.error);
  }, [setCoins, setFromCoin, setToCoin]);

  useEffect(() => {
    if (fromCoin && toCoin) {
      fetchPrice();
    }
  }, [fromCoin, toCoin, fetchPrice]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (priceValidUntil) {
        const remaining = Math.max(0, Math.floor((priceValidUntil - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          fetchPrice();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [priceValidUntil, fetchPrice]);

  useEffect(() => {
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const handleSwap = async () => {
    if (isSwapping) return;
    setIsSwapping(true);
    swapCoins();
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsSwapping(false);
  };

  const handleExchange = async () => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) return;

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
      setError('Failed to create order');
    }
  };

  const formatNumber = (num: number, decimals: number = 8) => {
    if (num === 0) return '0';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Exchange</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              {loading ? 'Updating...' : 'Live rates'}
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
            <div className="mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/30 border border-gray-700/50 rounded-xl text-cyan-400">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Calculating...</span>
                </div>
              ) : (
                formatNumber(total)
              )}
            </div>
          </div>

          {price > 0 && (
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

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>All fees included</span>
            <span className="text-xs">Rate valid for {timeLeft}s</span>
          </div>

          <button
            onClick={handleExchange}
            disabled={!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0 || loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              'Exchange Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
