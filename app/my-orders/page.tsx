'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Order {
  orderId: string;
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

function OrdersContent() {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
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
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Pair</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Rate</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-4 text-sm text-cyan-500 font-mono">{order.orderId}</td>
                    <td className="px-4 py-4 text-sm text-white">{order.fromCoin}/{order.toCoin}</td>
                    <td className="px-4 py-4 text-sm text-white text-right tabular-nums">
                      {formatNumber(order.amountSent)} {order.fromCoin}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300 text-right tabular-nums">
                      {formatNumber(order.amountReceived)} {order.toCoin}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <ProtectedRoute requiredRole="user" redirectTo="/login">
      <OrdersContent />
    </ProtectedRoute>
  );
}
