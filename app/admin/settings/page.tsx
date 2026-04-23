'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { AdminRoute } from '@/components/AdminRoute';

const SETTINGS_KEYS = [
  { key: 'usdtWalletAddress', label: 'USDT Wallet Address (TRC20)', placeholder: 'Enter USDT wallet address' },
  { key: 'usdtQrCodeImageUrl', label: 'USDT QR Code Image URL', placeholder: 'https://example.com/qr.png' },
  { key: 'p2pNetwork', label: 'Network', placeholder: 'TRC20' },
  { key: 'p2pBuyPrice', label: 'Buy USDT Price (per USDT)', placeholder: '50' },
  { key: 'p2pSellPrice', label: 'Sell USDT Price (per USDT)', placeholder: '48' },
  { key: 'p2pPaymentInstructions', label: 'Payment Instructions (P2P Buy)', placeholder: 'Contact us on Telegram for payment instructions...' },
];

export default function AdminSettings() {
  const { isAuthenticated, loading } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, [key]: data.setting.value }));
        setMessage({ type: 'success', text: 'Setting saved successfully' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    saveSetting(key, settings[key] || '');
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Please log in to manage settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">P2P Settings</h1>
            <p className="text-gray-400 mt-1">Configure P2P exchange settings</p>
          </div>
          <a
            href="/admin/orders"
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
          >
            Back to Orders
          </a>
        </header>

        {message && (
          <div className={`p-4 rounded-xl mb-6 ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* USDT Wallet Settings */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">USDT Wallet Configuration</h2>
            <div className="space-y-4">
              {SETTINGS_KEYS.filter(k => ['usdtWalletAddress', 'usdtQrCodeImageUrl', 'p2pNetwork'].includes(k.key)).map((setting) => (
                <div key={setting.key}>
                  <label className="block text-sm text-gray-400 mb-2">{setting.label}</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={settings[setting.key] || ''}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      placeholder={setting.placeholder}
                      className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                    <AdminRoute fallback={
                      <span className="text-gray-500 text-sm">Admin access required</span>
                    }>
                      <button
                        onClick={() => handleSave(setting.key)}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </AdminRoute>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Settings */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">P2P Price Configuration</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {SETTINGS_KEYS.filter(k => ['p2pBuyPrice', 'p2pSellPrice'].includes(k.key)).map((setting) => (
                <div key={setting.key}>
                  <label className="block text-sm text-gray-400 mb-2">{setting.label}</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={settings[setting.key] || ''}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      placeholder={setting.placeholder}
                      className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                    <AdminRoute fallback={
                      <span className="text-gray-500 text-sm">Admin</span>
                    }>
                      <button
                        onClick={() => handleSave(setting.key)}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                    </AdminRoute>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Payment Instructions (P2P Buy)</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{SETTINGS_KEYS.find(k => k.key === 'p2pPaymentInstructions')?.label}</label>
              <div className="space-y-3">
                <textarea
                  value={settings['p2pPaymentInstructions'] || ''}
                  onChange={(e) => handleChange('p2pPaymentInstructions', e.target.value)}
                  placeholder={SETTINGS_KEYS.find(k => k.key === 'p2pPaymentInstructions')?.placeholder}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
                <div className="flex justify-end">
                  <AdminRoute fallback={
                    <span className="text-gray-500 text-sm">Admin access required</span>
                  }>
                    <button
                      onClick={() => handleSave('p2pPaymentInstructions')}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </AdminRoute>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}