'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  createdAt: string;
}

function OrdersContent() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        } else {
          setError('Failed to load orders');
        }
      } catch {
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const formatNumber = (num: number, decimals = 6) => {
    if (num < 0.00001) return num.toExponential(4);
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'p2p_buy':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500';
      case 'p2p_sell':
        return 'bg-green-500/20 text-green-400 border-green-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <a
            href="/p2p"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            New P2P Order
          </a>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 mb-6">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No orders yet</p>
            <a href="/" className="text-cyan-500 hover:text-cyan-400">
              Make your first exchange
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => router.push(`/orders/${order.orderId}`)}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Order ID</div>
                      <div className="text-cyan-500 font-mono text-sm">{order.orderId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Type</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(order.type)}`}>
                        {getTypeLabel(order.type)}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Pair</div>
                      <div className="text-white font-medium">{order.fromCoin} → {order.toCoin}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Amount Details */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Amount Sent</div>
                    <div className="text-white font-medium">{formatNumber(order.amountSent)} {order.fromCoin}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Amount Received</div>
                    <div className="text-cyan-400 font-medium">{formatNumber(order.amountReceived)} {order.toCoin}</div>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Date</div>
                    <div className="text-gray-300 text-sm">{formatDate(order.createdAt)}</div>
                  </div>
                </div>

                {/* Payment Method (P2P orders) */}
                {order.type !== 'exchange' && order.paymentMethod && (
                  <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Payment Method</div>
                    <div className="text-white text-sm">{order.paymentMethod}</div>
                  </div>
                )}

                {/* Receiving Address */}
                {order.receivingAddress && (
                  <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Your Receiving Address</div>
                    <div className="text-green-400 font-mono text-sm break-all">{order.receivingAddress}</div>
                  </div>
                )}

                {/* Admin Note */}
                {order.adminNote && (
                  <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <div className="text-xs text-cyan-400 mb-1">Note from Admin</div>
                    <div className="text-white text-sm">{order.adminNote}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}