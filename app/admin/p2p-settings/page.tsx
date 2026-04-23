'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';

export default function AdminP2PSettings() {
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

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    await saveSetting(key, newValue);
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

  const isP2PEnabled = settings.p2pEnabled === 'true';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">P2P Settings</h1>
            <p className="text-gray-400 mt-1">Configure P2P exchange settings and enable/disable the feature</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/orders"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors text-sm"
            >
              Back to Orders
            </a>
            <a
              href="/admin/settings"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors text-sm"
            >
              All Settings
            </a>
          </div>
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
          {/* Enable/Disable P2P */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">P2P Exchange</h2>
                <p className="text-sm text-gray-400 mt-1">Enable or disable P2P exchange feature for all users</p>
              </div>
              <button
                onClick={() => handleToggle('p2pEnabled', settings.p2pEnabled || 'false')}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  isP2PEnabled ? 'bg-green-500' : 'bg-gray-600'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isP2PEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-4 text-sm">
              Status: <span className={isP2PEnabled ? 'text-green-400' : 'text-red-400'}>
                {isP2PEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Price Settings */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Price Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Buy Price (per USDT)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={settings.p2pBuyPrice || ''}
                    onChange={(e) => handleChange('p2pBuyPrice', e.target.value)}
                    placeholder="50"
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    onClick={() => saveSetting('p2pBuyPrice', settings.p2pBuyPrice || '')}
                    disabled={saving}
                    className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sell Price (per USDT)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={settings.p2pSellPrice || ''}
                    onChange={(e) => handleChange('p2pSellPrice', e.target.value)}
                    placeholder="48"
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    onClick={() => saveSetting('p2pSellPrice', settings.p2pSellPrice || '')}
                    disabled={saving}
                    className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Payment Instructions</h2>
            <div className="space-y-3">
              <textarea
                value={settings.p2pPaymentInstructions || ''}
                onChange={(e) => handleChange('p2pPaymentInstructions', e.target.value)}
                placeholder="Contact us on Telegram for payment instructions. This will be shown to users buying USDT."
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => saveSetting('p2pPaymentInstructions', settings.p2pPaymentInstructions || '')}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Instructions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}