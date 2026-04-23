'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

// Fallback icon placeholder
const FALLBACK_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiI+PC90ZXh0Pjwvc3ZnPg==';

interface Coin {
  symbol: string;
  name: string;
  icon: string;
}

interface Order {
  orderId: string;
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

// Fallback QR placeholder (inline SVG data URI)
const FALLBACK_QR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmZmZmZmYiLz48dGV4dCB4PSI1MCUiIHk9IjUxJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2NjY2Ij5Vc2VyIERhdGE8L3RleHQ+PC9zdmc+';

export default function InvoicePage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orderRes, coinsRes] = await Promise.all([
          fetch(`/api/orders/${params.orderId}`),
          fetch('/api/coins'),
        ]);

        if (!orderRes.ok) {
          throw new Error('Order not found');
        }

        const orderData = await orderRes.json();
        const coinsData = await coinsRes.json();

        setOrder(orderData);
        setCoins(coinsData);

        if (orderData.walletAddress && orderData.walletAddress !== 'Pending') {
          const url = await QRCode.toDataURL(orderData.walletAddress, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrCodeUrl(url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.orderId]);

  const getCoinInfo = (symbol: string) => {
    return coins.find((c) => c.symbol === symbol) || { symbol, name: symbol, icon: '' };
  };

  const formatNumber = (num: number, decimals: number = 8) => {
    if (num === 0) return '0';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-semibold text-red-400">{error || 'Order not found'}</div>
        <a href="/" className="px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 transition-colors">
          Go to Exchange
        </a>
      </div>
    );
  }

  const fromCoinInfo = getCoinInfo(order.fromCoin);
  const toCoinInfo = getCoinInfo(order.toCoin);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      <header className="w-full max-w-2xl mx-auto py-6 flex items-center justify-between relative z-10">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exchange
        </a>
      </header>

      <div className="relative z-10 w-full max-w-xl">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Order Invoice</h1>
            <div className="text-gray-400 text-sm">Order #{order.orderId.slice(0, 8)}</div>
          </div>

          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-8 ${
            order.status === 'completed'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              order.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
            }`} />
            {order.status === 'completed' ? 'Completed' : 'Pending'}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <img
                  src={fromCoinInfo.icon}
                  alt={fromCoinInfo.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_ICON;
                  }}
                />
                <div>
                  <div className="text-sm text-gray-400">You Send</div>
                  <div className="font-semibold text-white">{fromCoinInfo.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">{formatNumber(order.amountSent)}</div>
                <div className="text-sm text-gray-400">{fromCoinInfo.name}</div>
              </div>
            </div>

            <div className="flex justify-center">
              <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <img
                  src={toCoinInfo.icon}
                  alt={toCoinInfo.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_ICON;
                  }}
                />
                <div>
                  <div className="text-sm text-gray-400">You Get</div>
                  <div className="font-semibold text-white">{toCoinInfo.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-cyan-400">{formatNumber(order.amountReceived)}</div>
                <div className="text-sm text-gray-400">{toCoinInfo.name}</div>
              </div>
            </div>
          </div>

          {order.walletAddress && order.walletAddress !== 'Pending' && (
            <div className="mt-8 p-6 bg-gray-800/30 border border-gray-700 rounded-xl">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400 mb-2">Send {order.amountSent} {order.fromCoin} to this address</div>
                {qrCodeUrl ? (
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img
                      src={qrCodeUrl}
                      alt="Payment QR Code"
                      className="w-40 h-40"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_QR;
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img
                      src={FALLBACK_QR}
                      alt="Payment QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                )}
              </div>
              <div className="bg-gray-900 p-4 rounded-lg break-all">
                <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
                <div className="text-sm text-white font-mono">{order.walletAddress}</div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Created At</div>
            <div className="text-sm text-white">{formatDate(order.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
