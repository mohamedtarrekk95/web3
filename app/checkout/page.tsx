'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExchangeStore } from '@/store/exchangeStore';

interface WalletInfo {
  symbol: string;
  address: string;
  qrCodeImageUrl: string;
}

const DEFAULT_COIN_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiI+PC90ZXh0Pjwvc3ZnPg==';
const QR_PLACEHOLDER = '/qr-placeholder.svg';

export default function CheckoutPage() {
  const router = useRouter();
  const { checkoutData, fromCoin, toCoin, amount, total, price, clearCheckoutData } = useExchangeStore();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);

  console.log('[Checkout] checkoutData:', checkoutData);
  console.log('[Checkout] walletInfo:', walletInfo);

  useEffect(() => {
    // If no checkout data, redirect to home
    if (!checkoutData || !checkoutData.fromCoin || !checkoutData.toCoin) {
      console.log('[Checkout] No checkout data, redirecting to home');
      router.push('/');
      return;
    }

    fetchWalletInfo(checkoutData.fromCoin.symbol);
  }, [checkoutData]);

  const fetchWalletInfo = async (symbol: string) => {
    console.log('[Checkout] Fetching wallet for:', symbol);
    try {
      const res = await fetch(`/api/wallet?symbol=${symbol}`);
      const data = await res.json();
      console.log('[Checkout] Wallet response:', JSON.stringify(data));

      if (res.ok && data?.success && data?.wallet) {
        // Normalize wallet data - support both field names
        const normalizedWallet: WalletInfo = {
          symbol: data.wallet.symbol || '',
          address: data.wallet.address || '',
          qrCodeImageUrl: data.wallet.qrCodeImageUrl || data.wallet.qrCodeUrl || '',
        };
        console.log('[Checkout] Normalized wallet:', normalizedWallet);
        setWalletInfo(normalizedWallet);
        setQrImageError(false);
      } else {
        console.log('[Checkout] No wallet found for:', symbol);
        setWalletInfo(null);
      }
    } catch (err) {
      console.error('[Checkout] Fetch wallet error:', err);
      setWalletInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!checkoutData || !userAddress.trim()) return;

    setPlacingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'exchange',
          fromCoin: checkoutData.fromCoin?.symbol,
          toCoin: checkoutData.toCoin?.symbol,
          amountSent: parseFloat(checkoutData.amount),
          amountReceived: checkoutData.total,
          receivingAddress: userAddress.trim(),
        }),
      });

      const order = await res.json();
      console.log('[Checkout] Order response:', JSON.stringify(order));

      if (res.ok && order.orderId) {
        clearCheckoutData();
        router.push(`/invoice/${order.orderId}`);
      } else {
        setError(order.message || 'Failed to place order');
      }
    } catch (err) {
      console.error('[Checkout] Place order error:', err);
      setError('Network error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleQrImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('[Checkout] QR image failed to load');
    console.log('[Checkout] Failed src:', walletInfo?.qrCodeImageUrl);
    setQrImageError(true);
    e.currentTarget.onerror = null;
    e.currentTarget.src = QR_PLACEHOLDER;
  };

  const formatNumber = (num: number, decimals = 8): string => {
    if (!Number.isFinite(num) || num === 0) return '0';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayFromCoin = checkoutData?.fromCoin;
  const displayToCoin = checkoutData?.toCoin;
  const displayAmount = checkoutData?.amount || amount || '0';
  const displayTotal = checkoutData?.total || total || 0;

  // Determine QR image to display
  const qrImageSrc = !qrImageError && walletInfo?.qrCodeImageUrl
    ? walletInfo.qrCodeImageUrl
    : (qrImageError ? QR_PLACEHOLDER : '');

  console.log('[Checkout] QR image src to display:', qrImageSrc);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exchange
          </a>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={displayFromCoin?.icon || DEFAULT_COIN_ICON}
                  alt={displayFromCoin?.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COIN_ICON; }}
                />
                <div>
                  <div className="text-sm text-gray-400">You Send</div>
                  <div className="font-semibold text-white">{displayFromCoin?.symbol}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-white">
                {formatNumber(parseFloat(displayAmount))} {displayFromCoin?.symbol}
              </div>
            </div>

            <div className="flex justify-center">
              <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={displayToCoin?.icon || DEFAULT_COIN_ICON}
                  alt={displayToCoin?.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COIN_ICON; }}
                />
                <div>
                  <div className="text-sm text-gray-400">You Get</div>
                  <div className="font-semibold text-white">{displayToCoin?.symbol}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-cyan-400">
                {formatNumber(displayTotal)} {displayToCoin?.symbol}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Rate</span>
              <span className="text-gray-300">
                1 {displayFromCoin?.symbol} = {formatNumber(price)} {displayToCoin?.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Info & QR Code */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Send {displayAmount} {displayFromCoin?.symbol} to
          </h2>

          {walletInfo ? (
            <div className="space-y-4">
              {/* QR Code Image */}
              {qrImageSrc ? (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <img
                      src={qrImageSrc}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain"
                      onError={handleQrImageError}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="bg-gray-800 p-8 rounded-xl text-center text-gray-500">
                    No QR code available
                  </div>
                </div>
              )}

              {/* Address Display */}
              {walletInfo.address && (
                <div className="bg-gray-800/50 p-4 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1">Receiving Address</div>
                  <div className="text-sm text-white font-mono break-all">{walletInfo.address}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800/50 p-8 rounded-xl text-center text-gray-500">
              No wallet configured for {displayFromCoin?.symbol}
            </div>
          )}
        </div>

        {/* User Address Input */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Receiving Info</h2>
          <p className="text-sm text-gray-400 mb-4">
            Enter your receiving address, label, or note for this order. This is free-form text.
          </p>
          <textarea
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="Enter your receiving address, wallet label, or note"
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          />
        </div>

        {/* Confirm Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={!userAddress.trim() || !walletInfo || placingOrder}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {placingOrder ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Placing Order...
            </span>
          ) : !walletInfo ? (
            'Wallet Not Configured'
          ) : !userAddress.trim() ? (
            'Enter Your Receiving Info'
          ) : (
            'Confirm & Place Order'
          )}
        </button>
      </div>
    </div>
  );
}