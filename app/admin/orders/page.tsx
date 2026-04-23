'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { AdminRoute } from '@/components/AdminRoute';

interface OrderData {
  orderId: string;
  type: 'exchange' | 'p2p_buy' | 'p2p_sell';
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  receivingAddress: string;
  status: string;
  adminNote: string;
  paymentMethod: string;
  telegramUsername: string;
  txid: string;
  createdAt: string;
}

export default function AdminOrders() {
  const { isAuthenticated, loading } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'exchange' | 'p2p_buy' | 'p2p_sell'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [editingNoteOriginal, setEditingNoteOriginal] = useState('');

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

      if (response.ok && data?.success && Array.isArray(data.orders)) {
        console.log('[AdminOrders] Setting', data.orders.length, 'orders');
        setOrders(data.orders);
        setError(null);

        const notes: Record<string, string> = {};
        data.orders.forEach((o: OrderData) => {
          if (o.adminNote) notes[o.orderId] = o.adminNote;
        });
        setAdminNotes(notes);
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
        body: JSON.stringify({
          status,
          adminNote: adminNotes[orderId] || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AdminOrders] Update response:', JSON.stringify(data));
        if (data?.success && data?.order) {
          setOrders((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((o) => (o.orderId === orderId ? data.order : o));
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

  const handleNoteChange = (orderId: string, note: string) => {
    setAdminNotes((prev) => ({ ...prev, [orderId]: note }));
  };

  const handleEditNote = (orderId: string) => {
    const note = adminNotes[orderId] || '';
    setEditingNoteOriginal(note);
    setEditingNoteValue(note);
    setEditingNoteOrderId(orderId);
  };

  const handleCancelNote = () => {
    setEditingNoteOrderId(null);
    setEditingNoteValue('');
    setEditingNoteOriginal('');
  };

  const handleSaveNote = async () => {
    if (!editingNoteOrderId) return;
    setUpdating(editingNoteOrderId);
    try {
      const response = await fetch(`/api/admin/orders/${editingNoteOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          adminNote: editingNoteValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success && data?.order) {
          setOrders((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((o) => (o.orderId === editingNoteOrderId ? data.order : o));
          });
          setAdminNotes((prev) => ({ ...prev, [editingNoteOrderId]: editingNoteValue }));
        }
      }
    } finally {
      setUpdating(null);
      setEditingNoteOrderId(null);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    if (filter !== 'all' && order.status !== filter) return false;
    if (typeFilter !== 'all' && order.type !== typeFilter) return false;
    return true;
  });

  const formatNumber = (num: number) => {
    return num.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
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
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders Management</h1>
            <p className="text-gray-400 mt-1">Manage and confirm orders</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="exchange">Exchange</option>
              <option value="p2p_buy">P2P Buy</option>
              <option value="p2p_sell">P2P Sell</option>
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            <a
              href="/admin/wallets"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
            >
              Manage Wallets
            </a>
            <a
              href="/admin/settings"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
            >
              P2P Settings
            </a>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
              No orders found
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Order ID</div>
                      <div className="text-white font-mono">{order.orderId}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Type</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadge(order.type)}`}>
                        {getTypeLabel(order.type)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                    {order.status || 'pending'}
                  </span>
                </div>

                {/* Order Details Grid */}
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">From</div>
                    <div className="text-white font-medium">{order.fromCoin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">To</div>
                    <div className="text-cyan-400 font-medium">{order.toCoin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Amount Sent</div>
                    <div className="text-white font-medium">{formatNumber(order.amountSent || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Amount Received</div>
                    <div className="text-cyan-400 font-medium">{formatNumber(order.amountReceived || 0)}</div>
                  </div>
                </div>

                {/* P2P Specific Fields */}
                {order.type !== 'exchange' && (
                  <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-800/50 rounded-xl">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Payment Method</div>
                      <div className="text-white font-medium">{getPaymentMethodLabel(order.paymentMethod)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Telegram</div>
                      <div className="text-white font-medium">@{order.telegramUsername || 'N/A'}</div>
                    </div>
                    {order.type === 'p2p_sell' && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">TXID</div>
                        <div className="text-green-400 font-mono text-sm break-all">{order.txid || 'Not submitted'}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Address Section */}
                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-800/50 rounded-xl">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">System Wallet (Send TO)</div>
                    <div className="text-white font-mono text-sm break-all">{order.walletAddress || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">User Receiving Address</div>
                    <div className="text-green-400 font-mono text-sm break-all">{order.receivingAddress || 'N/A'}</div>
                  </div>
                </div>

                {/* Admin Note */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-gray-400">Admin Note</label>
                    {editingNoteOrderId !== order.orderId && (
                      <button
                        onClick={() => handleEditNote(order.orderId)}
                        className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg transition-colors"
                      >
                        Edit Note
                      </button>
                    )}
                  </div>
                  {editingNoteOrderId === order.orderId ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingNoteValue}
                        onChange={(e) => setEditingNoteValue(e.target.value)}
                        placeholder="Enter admin note..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNote}
                          disabled={updating === order.orderId}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                        >
                          {updating === order.orderId ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelNote}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 p-3 rounded-xl min-h-[60px]">
                      {adminNotes[order.orderId] ? (
                        <p className="text-white text-sm whitespace-pre-wrap">{adminNotes[order.orderId]}</p>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No note added</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    Created: {formatDate(order.createdAt || Date.now().toString())}
                  </div>
                  <AdminRoute
                    fallback={<span className="text-gray-500 text-sm">Admin access required</span>}
                  >
                    {order.status === 'pending' && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateOrderStatus(order.orderId, 'rejected')}
                          disabled={updating === order.orderId}
                          className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                        >
                          {updating === order.orderId ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.orderId, 'accepted')}
                          disabled={updating === order.orderId}
                          className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                        >
                          {updating === order.orderId ? 'Processing...' : 'Accept'}
                        </button>
                      </div>
                    )}
                    {(order.status === 'accepted' || order.status === 'rejected') && (
                      <button
                        onClick={() => updateOrderStatus(order.orderId, 'completed')}
                        disabled={updating === order.orderId}
                        className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 text-sm"
                      >
                        {updating === order.orderId ? 'Processing...' : 'Mark Completed'}
                      </button>
                    )}
                  </AdminRoute>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}