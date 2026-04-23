'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface Order {
  orderId: string;
  type: 'exchange' | 'p2p_buy' | 'p2p_sell';
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  receivingAddress: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  adminNote: string;
  paymentMethod: string;
  telegramUsername: string;
  txid: string;
  createdAt: string;
}

interface Settings {
  usdtWalletAddress?: string;
  usdtQrCodeImageUrl?: string;
  p2pPaymentInstructions?: string;
}

const DEFAULT_COIN_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiI+PC90ZXh0Pjwvc3ZnPg==';
const QR_PLACEHOLDER = '/qr-placeholder.svg';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txidInput, setTxidInput] = useState('');
  const [qrImageError, setQrImageError] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const [lastAdminNote, setLastAdminNote] = useState('');

  useEffect(() => {
    fetchOrder();
    fetchSettings();

    // Poll for updates every 5 seconds for live admin note
    const pollInterval = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [resolvedParams.id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found');
        } else {
          setError('Failed to fetch order');
        }
        return;
      }
      const data = await res.json();
      setOrder(data);
      setTxidInput(data.txid || '');

      // Check if admin note changed
      if (data.adminNote !== lastAdminNote && lastAdminNote !== '') {
        // Optionally show a notification that admin note was updated
      }
      setLastAdminNote(data.adminNote || '');
    } catch (err) {
      console.error('Fetch order error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  const handleSubmitTxid = async () => {
    if (!txidInput.trim() || !order) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.orderId}/txid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid: txidInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrder({ ...order, txid: txidInput.trim(), status: 'pending' });
      } else {
        setError(data.error || 'Failed to submit TXID');
      }
    } catch (err) {
      console.error('Submit TXID error:', err);
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQrImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setQrImageError(true);
    e.currentTarget.onerror = null;
    e.currentTarget.src = QR_PLACEHOLDER;
  };

  const handleCopyWallet = () => {
    if (settings.usdtWalletAddress) {
      navigator.clipboard.writeText(settings.usdtWalletAddress);
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 2000);
    }
  };

  const formatNumber = (num: number, decimals = 8): string => {
    if (!Number.isFinite(num) || num === 0) return '0';
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'accepted': return 'text-cyan-400';
      case 'completed': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'p2p_buy': return 'P2P Buy';
      case 'p2p_sell': return 'P2P Sell';
      case 'exchange': return 'Exchange';
      default: return type;
    }
  };

  const getPaymentMethodLabel = (code: string) => {
    const methods: Record<string, string> = {
      vodafone_cash: 'Vodafone Cash',
      fawry: 'Fawry',
      bank_transfer: 'Bank Transfer',
      instapay: 'Instapay',
      cash: 'Cash',
    };
    return methods[code] || code;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Order not found'}</div>
          <button
            onClick={() => router.push('/my-orders')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl"
          >
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  const isP2PSell = order.type === 'p2p_sell';
  const isP2PBuy = order.type === 'p2p_buy';
  const showTxidInput = isP2PSell && !order.txid;
  const showTxidDisplay = isP2PSell && order.txid;
  const qrImageSrc = !qrImageError && settings.usdtQrCodeImageUrl
    ? settings.usdtQrCodeImageUrl
    : (qrImageError ? QR_PLACEHOLDER : '');

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => router.push('/my-orders')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Orders
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Order Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              order.type === 'p2p_buy' ? 'bg-cyan-500/20 text-cyan-400' :
              order.type === 'p2p_sell' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-700 text-gray-300'
            }`}>
              {getTypeLabel(order.type)}
            </span>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Order Info */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-400">Order ID</span>
            <span className="text-white font-mono text-sm">{order.orderId}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status</span>
              <span className={`font-semibold ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">You Send</span>
              <span className="text-white font-semibold">
                {formatNumber(order.amountSent)} {order.fromCoin}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">You Get</span>
              <span className="text-cyan-400 font-semibold">
                {formatNumber(order.amountReceived)} {order.toCoin}
              </span>
            </div>

            {(isP2PSell || isP2PBuy) && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Payment Method</span>
                <span className="text-white">{getPaymentMethodLabel(order.paymentMethod)}</span>
              </div>
            )}

            {order.telegramUsername && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Telegram</span>
                <span className="text-white">@{order.telegramUsername}</span>
              </div>
            )}

            {order.receivingAddress && (
              <div className="flex items-start justify-between">
                <span className="text-gray-400">Receiving Address</span>
                <span className="text-white text-right text-sm font-mono max-w-xs break-all">
                  {order.receivingAddress}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Created</span>
              <span className="text-gray-300 text-sm">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Note - Live Section */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400 font-medium">Admin Note</h3>
            {(isP2PSell || isP2PBuy) && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          {order.adminNote ? (
            <p className="text-white">{order.adminNote}</p>
          ) : (
            <p className="text-gray-500 italic">No admin note yet</p>
          )}
        </div>

        {/* P2P Sell: USDT Payment QR Code & Wallet */}
        {isP2PSell && (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">USDT Payment QR Code (TRC20)</h2>

            {qrImageSrc ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl mb-4">
                  <img
                    src={qrImageSrc}
                    alt="USDT Payment QR Code"
                    className="w-48 h-48 md:w-56 md:h-56 object-contain max-w-full"
                    onError={handleQrImageError}
                  />
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Scan this QR code to send USDT via TRC20 network
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center mb-4">
                <div className="bg-gray-800 p-8 rounded-xl text-center text-gray-500 mb-4">
                  No QR code available
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Admin has not configured a QR code yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* P2P Sell: USDT Wallet Address */}
        {isP2PSell && settings.usdtWalletAddress && (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">USDT Wallet Address (TRC20)</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={settings.usdtWalletAddress}
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white font-mono text-sm break-all"
              />
              <button
                onClick={handleCopyWallet}
                className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-xl transition-colors whitespace-nowrap"
              >
                {walletCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* P2P Sell: TXID Input/Display */}
        {isP2PSell && (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Transaction Details</h2>

            {showTxidDisplay && (
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <div className="text-xs text-gray-400 mb-1">Transaction ID (TXID)</div>
                <div className="text-sm text-green-400 font-mono break-all">{order.txid}</div>
              </div>
            )}

            {showTxidInput && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Transaction ID (TXID)</label>
                  <input
                    type="text"
                    value={txidInput}
                    onChange={(e) => setTxidInput(e.target.value)}
                    placeholder="Enter the TXID from your transfer"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSubmitTxid}
                  disabled={submitting || !txidInput.trim()}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit TXID'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* P2P Buy: Payment Instructions */}
        {isP2PBuy && (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Payment Instructions</h2>
            <div className="bg-gray-800/50 p-4 rounded-xl">
              <p className="text-gray-300 whitespace-pre-wrap">
                {settings.p2pPaymentInstructions || 'Please contact us on Telegram to get payment instructions.'}
              </p>
            </div>
            <div className="mt-6 text-center">
              <a
                href="https://t.me/Hosssam95"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.455-4.917c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
                Contact on Telegram
              </a>
            </div>
          </div>
        )}

        {/* Telegram Contact (shown for all P2P) */}
        {(isP2PSell || isP2PBuy) && (
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Need Help?</h2>
            <p className="text-gray-400 mb-4">
              Contact us on Telegram for faster support with your order.
            </p>
            <a
              href="https://t.me/Hosssam95"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.455-4.917c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              @Hosssam95
            </a>
          </div>
        )}
      </div>
    </div>
  );
}