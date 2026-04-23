'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { AdminRoute } from '@/components/AdminRoute';

export default function AdminOrders() {
  const { user, isAuthenticated, loading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    console.log('[AdminOrders] Fetching orders...');
    try {
      const response = await fetch('/api/admin/orders', {
        credentials: 'include',
      });

      console.log('[AdminOrders] Response status:', response.status);
      const data = await response.json();
      console.log('[AdminOrders] Raw response:', JSON.stringify(data));
      console.log('[AdminOrders] Response type:', typeof data);
      console.log('[AdminOrders] Is array:', Array.isArray(data));
      console.log('[AdminOrders] Has orders:', data?.orders);

      if (response.ok && data?.success && Array.isArray(data.orders)) {
        console.log('[AdminOrders] Setting', data.orders.length, 'orders');
        setOrders(data.orders);
        setError(null);
      } else {
        console.log('[AdminOrders] API error:', data?.message || 'Unknown error');
        setOrders([]);
        setError(data?.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('[AdminOrders] Catch error:', err);
      setOrders([]);
      setError('Failed to fetch orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AdminOrders] Update response:', JSON.stringify(data));
        if (data?.success && data?.order) {
          setOrders((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((o) => (o.orderId === orderId ? { ...o, status } : o));
          });
        }
      } else {
        console.error('[AdminOrders] Update failed, status:', response.status);
      }
    } catch (err) {
      console.error('[AdminOrders] Update catch error:', err);
    } finally {
      setUpdating(null);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Please log in to view orders</p>
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm text-white font-mono">
                        {order.orderId?.slice(0, 8) || 'N/A'}...
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{order.fromCoin}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-cyan-400 font-medium">{order.toCoin}</span>
                      </td>
                      <td className="px-6 py-4 text-white">{formatNumber(order.amountSent || 0)}</td>
                      <td className="px-6 py-4 text-cyan-400">{formatNumber(order.amountReceived || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {order.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(order.createdAt || Date.now().toString())}</td>
                      <td className="px-6 py-4">
                        <AdminRoute
                          fallback={<span className="text-gray-500 text-sm">No action</span>}
                        >
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.orderId, 'completed')}
                              disabled={updating === order.orderId}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                            >
                              {updating === order.orderId ? 'Updating...' : 'Complete'}
                            </button>
                          )}
                        </AdminRoute>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}