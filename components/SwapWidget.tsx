'use client';

import { useEffect, useCallback, useRef, memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSwapStore, Coin } from '@/store/swapStore';
import CoinSelector from './CoinSelector';

// Format numbers helper
const fmt = (num: number, decimals = 8): string => {
  if (!Number.isFinite(num) || num === 0) return '—';
  if (num < 0.00001) return num.toExponential(4);
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};

const PLATFORM_WALLET = '0xe88E1F6D128f09584cF9E9147512DA6f116b365A';

function SwapWidgetComponent() {
  const router = useRouter();
  const {
    coins,
    fromCoin,
    toCoin,
    amount,
    quote,
    loading,
    error,
    isSwappingCoins,
    executionStatus,
    walletConnected,
    walletAddress,
    setCoins,
    setFromCoin,
    setToCoin,
    setAmount,
    setQuote,
    setLoading,
    setError,
    swapCoins,
    setExecutionStatus,
    setTxHash,
    setWalletState,
  } = useSwapStore();

  const [timeLeft, setTimeLeft] = useState(30);
  const [walletLoading, setWalletLoading] = useState(false);
  const mountedRef = useRef(true);
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check wallet connection status
  const checkWalletConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_accounts',
      })) as string[];

      if (accounts && accounts.length > 0) {
        const chainId = (await window.ethereum.request({
          method: 'eth_chainId',
        })) as string;
        setWalletState(true, accounts[0].toLowerCase());
      } else {
        setWalletState(false, null);
      }
    } catch (err) {
      console.warn('Wallet check failed:', err);
    }
  }, [setWalletState]);

  // Initialize - load coins and check wallet on mount
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
      } catch (err) {
        console.error('Init error:', err);
      }
    }

    init();
    checkWalletConnection();

    return () => {
      mountedRef.current = false;
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    };
  }, [setCoins, setFromCoin, setToCoin, checkWalletConnection]);

  // Listen for wallet changes
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        setWalletState(false, null);
      } else {
        setWalletState(true, accs[0].toLowerCase());
      }
    };

    if (eth.on) eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [setWalletState]);

  // Fetch quote when parameters change
  useEffect(() => {
    if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

      quoteTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        if (fromCoin.symbol === toCoin.symbol) return;
        if (parseFloat(amount) <= 0) return;

        setLoading(true);
        setError(null);

        try {
          const res = await fetch(
            `/api/swap/quote?from=${fromCoin.symbol}&to=${toCoin.symbol}&amount=${amount}`
          );
          const data = await res.json();

          if (!mountedRef.current) return;

          if (res.ok && data.toAmount) {
            setQuote(data);
            setTimeLeft(30);
          } else {
            setError(data.error || 'Failed to get quote');
            setQuote(null);
          }
        } catch (err) {
          if (!mountedRef.current) return;
          setError('Network error. Please try again.');
          setQuote(null);
        }
      }, 500);
    };

    fetchQuote();

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [fromCoin, toCoin, amount, setQuote, setLoading, setError]);

  // Countdown timer
  useEffect(() => {
    if (!quote) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quote]);

  // Auto-refresh quote when timer expires
  useEffect(() => {
    if (timeLeft === 0 && fromCoin && toCoin && amount && parseFloat(amount) > 0) {
      setTimeLeft(30);
    }
  }, [timeLeft, fromCoin, toCoin, amount]);

  // Swap handler
  const handleSwap = useCallback(() => {
    swapCoins();
    setTimeLeft(30);
  }, [swapCoins]);

  // Execute swap with wallet signature
  const handleSwapExecute = useCallback(async () => {
    if (!quote || !fromCoin || !toCoin || executionStatus === 'processing') return;
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setExecutionStatus('processing');
    setTxHash(null);
    setWalletLoading(true);

    try {
      // For actual on-chain swap, we would use viem to:
      // 1. Build the transaction using aggregator API data
      // 2. Sign with user's wallet
      // 3. Send to network

      // For demo, we create a backend order record
      // Real implementation would integrate with 1inch Swap API
      const res = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCoin: fromCoin.symbol,
          toCoin: toCoin.symbol,
          fromAmount: amount,
          toAmount: quote.toAmount,
          receivingAddress: walletAddress,
          aggregator: quote.aggregator,
          platformFeeWallet: PLATFORM_WALLET,
        }),
      });

      const data = await res.json();

      if (res.ok && data.orderId) {
        setExecutionStatus('success');
        setTxHash(data.txHash || null);
        router.push(`/invoice/${data.orderId}`);
      } else {
        setExecutionStatus('error');
        setError(data.error || 'Swap failed');
      }
    } catch (err) {
      setExecutionStatus('error');
      setError('Network error during swap');
    } finally {
      setWalletLoading(false);
    }
  }, [quote, fromCoin, toCoin, amount, walletConnected, walletAddress, executionStatus, setExecutionStatus, setTxHash, router, setError]);

  // Connect wallet handler
  const handleConnectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    setWalletLoading(true);
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts && accounts.length > 0) {
        const chainId = (await window.ethereum.request({
          method: 'eth_chainId',
        })) as string;
        setWalletState(true, accounts[0].toLowerCase());

        // Store in backend
        await fetch('/api/wallet/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: accounts[0], network: getNetworkName(chainId) }),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message.includes('User rejected') ? 'Connection rejected' : message);
    } finally {
      setWalletLoading(false);
    }
  }, [setWalletState, setError]);

  // Get display content for "You Get" field
  const getDisplayContent = () => {
    if (!walletConnected) {
      return <span className="text-orange-400 text-lg">Connect wallet to continue</span>;
    }

    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Getting best price...</span>
        </div>
      );
    }

    if (error) {
      return <span className="text-red-400 text-lg">{error}</span>;
    }

    if (!quote) {
      return <span className="text-gray-500">Enter amount</span>;
    }

    return (
      <span className="tabular-nums text-cyan-400">
        {fmt(parseFloat(quote.toAmount))} {toCoin?.symbol}
      </span>
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Swap</h2>
            <div className="flex items-center gap-2 text-sm">
              {walletConnected ? (
                <span className="text-green-400 text-xs px-2 py-1 bg-green-400/10 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Wallet Connected
                </span>
              ) : (
                <span className="text-orange-400 text-xs px-2 py-1 bg-orange-400/10 rounded-full">
                  Wallet Required
                </span>
              )}
            </div>
          </div>

          {/* Wallet Connect Prompt (if not connected) */}
          {!walletConnected && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <p className="text-orange-300 text-sm text-center mb-3">
                Connect your wallet to access the swap feature
              </p>
              <button
                onClick={handleConnectWallet}
                disabled={walletLoading}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all"
              >
                {walletLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </div>
          )}

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
              disabled={!walletConnected}
              className="w-full mt-2 px-4 py-4 text-2xl font-semibold bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors tabular-nums disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Swap Button */}
          <div className="relative flex justify-center">
            <button
              onClick={handleSwap}
              disabled={!walletConnected || isSwappingCoins}
              className="p-3 bg-gray-800 border border-gray-700 rounded-full hover:border-cyan-500 hover:bg-gray-700/80 transition-all disabled:opacity-50"
            >
              <svg
                className={`w-5 h-5 text-cyan-500 transition-transform ${isSwappingCoins ? 'rotate-180' : ''}`}
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

          {/* Quote Details */}
          {quote && walletConnected && (
            <div className="space-y-2 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rate</span>
                <span className="text-gray-300 tabular-nums">
                  1 {fromCoin?.symbol} = {fmt(quote.rate)} {toCoin?.symbol}
                </span>
              </div>

              {quote.priceImpact > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price Impact</span>
                  <span className={quote.priceImpact > 5 ? 'text-red-400' : 'text-gray-400'}>
                    {quote.priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}

              {quote.routes.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Route</span>
                  <span className="text-gray-300">
                    {quote.routes.map(r => r.name).join(', ') || 'Direct'}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platform Fee (0.3%)</span>
                <span className="text-gray-400">
                  {fmt(parseFloat(quote.toAmount) * 0.003)} {toCoin?.symbol}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Min. Received</span>
                <span className="text-gray-300 tabular-nums">
                  {fmt(parseFloat(quote.minimumReceived))} {toCoin?.symbol}
                </span>
              </div>

              {quote.gasUsd > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Est. Gas</span>
                  <span className="text-gray-400">${quote.gasUsd.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Quote Valid</span>
                <span className={timeLeft <= 10 ? 'text-red-400' : 'text-gray-400'}>
                  {timeLeft}s
                </span>
              </div>

              {/* Platform Fee Wallet */}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-700/50">
                <span className="text-gray-400">Fee Recipient</span>
                <span className="text-gray-300 text-xs font-mono">
                  {PLATFORM_WALLET.slice(0, 8)}...{PLATFORM_WALLET.slice(-6)}
                </span>
              </div>

              {/* Aggregator Info */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Powered by</span>
                <span className="text-cyan-400 capitalize">{quote.aggregator}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>All fees included</span>
            {quote && walletConnected && (
              <span className="text-xs text-green-400">Best rate across DEXs</span>
            )}
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapExecute}
            disabled={
              !walletConnected ||
              !fromCoin ||
              !toCoin ||
              !amount ||
              parseFloat(amount) <= 0 ||
              !quote ||
              loading ||
              executionStatus === 'processing'
            }
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
          >
            {executionStatus === 'processing' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Swap...
              </span>
            ) : !walletConnected ? (
              'Connect Wallet to Swap'
            ) : !fromCoin || !toCoin ? (
              'Select tokens'
            ) : !amount || parseFloat(amount) <= 0 ? (
              'Enter amount'
            ) : loading ? (
              'Getting quote...'
            ) : !quote ? (
              'Enter valid amount'
            ) : (
              'Swap Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function getNetworkName(chainId: string): string {
  const networks: Record<string, string> = {
    '0x1': 'ETH',
    '0x38': 'BSC',
    '0x89': 'MATIC',
    '0xa86a': 'AVAX',
  };
  return networks[chainId] || 'Unknown';
}

export default memo(SwapWidgetComponent);
