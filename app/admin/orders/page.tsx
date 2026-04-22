'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Unauthorized');
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      if (err instanceof Error && err.message === 'Unauthorized') {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    setUpdating(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setOrders(orders.map((o) => (o.orderId === orderId ? { ...o, status } : o)));
      }
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const formatNumber = (num: number) => {
    return num.toFixed(8).replace(/\.?0+$/, '');
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders Management</h1>
            <p className="text-gray-400 mt-1">Manage and confirm orders</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <a
              href="/admin/wallets"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
            >
              Manage Wallets
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
              }}
              className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Order ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">From</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">To</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Amount Sent</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Amount Received</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-white font-mono">
                      {order.orderId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{order.fromCoin}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-cyan-400 font-medium">{order.toCoin}</span>
                    </td>
                    <td className="px-6 py-4 text-white">{formatNumber(order.amountSent)}</td>
                    <td className="px-6 py-4 text-cyan-400">{formatNumber(order.amountReceived)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order.orderId, 'completed')}
                          disabled={updating === order.orderId}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                        >
                          {updating === order.orderId ? 'Updating...' : 'Complete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No orders found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
