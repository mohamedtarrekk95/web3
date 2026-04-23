'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';

interface PaymentMethod {
  id: string;
  name: string;
  instructions: string;
}

interface Currency {
  id: string;
  name: string;
  code: string;
  buyPrice: string;
  sellPrice: string;
  paymentMethods: PaymentMethod[];
}

export default function AdminP2PSettings() {
  const { isAuthenticated, loading } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<{ currencyId: string; methodId: string } | null>(null);

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
        if (data.p2pCurrencies) {
          try {
            setCurrencies(JSON.parse(data.p2pCurrencies));
          } catch {
            setCurrencies([]);
          }
        }
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
        showMessage('success', 'Setting saved successfully');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      showMessage('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    await saveSetting(key, newValue);
  };

  const saveCurrencies = async (updatedCurrencies: Currency[]) => {
    setCurrencies(updatedCurrencies);
    await saveSetting('p2pCurrencies', JSON.stringify(updatedCurrencies));
  };

  const addCurrency = () => {
    const newCurrency: Currency = {
      id: Date.now().toString(),
      name: '',
      code: '',
      buyPrice: '',
      sellPrice: '',
      paymentMethods: [],
    };
    setCurrencies([...currencies, newCurrency]);
    setEditingCurrency(newCurrency.id);
  };

  const updateCurrency = (id: string, updates: Partial<Currency>) => {
    setCurrencies(currencies.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCurrency = async (id: string) => {
    const updatedCurrencies = currencies.filter(c => c.id !== id);
    await saveCurrencies(updatedCurrencies);
  };

  const saveCurrency = async (currency: Currency) => {
    const updatedCurrencies = currencies.map(c => c.id === currency.id ? currency : c);
    await saveCurrencies(updatedCurrencies);
    setEditingCurrency(null);
  };

  const addPaymentMethod = (currencyId: string) => {
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: '',
      instructions: '',
    };
    const updatedCurrencies = currencies.map(c =>
      c.id === currencyId
        ? { ...c, paymentMethods: [...c.paymentMethods, newMethod] }
        : c
    );
    setCurrencies(updatedCurrencies);
    setEditingPaymentMethod({ currencyId, methodId: newMethod.id });
  };

  const updatePaymentMethod = (currencyId: string, methodId: string, updates: Partial<PaymentMethod>) => {
    setCurrencies(currencies.map(c =>
      c.id === currencyId
        ? {
            ...c,
            paymentMethods: c.paymentMethods.map(m =>
              m.id === methodId ? { ...m, ...updates } : m
            )
          }
        : c
    ));
  };

  const deletePaymentMethod = async (currencyId: string, methodId: string) => {
    const updatedCurrencies = currencies.map(c =>
      c.id === currencyId
        ? { ...c, paymentMethods: c.paymentMethods.filter(m => m.id !== methodId) }
        : c
    );
    await saveCurrencies(updatedCurrencies);
  };

  const savePaymentMethod = async (currencyId: string, method: PaymentMethod) => {
    const updatedCurrencies = currencies.map(c =>
      c.id === currencyId
        ? { ...c, paymentMethods: c.paymentMethods.map(m => m.id === method.id ? method : m) }
        : c
    );
    await saveCurrencies(updatedCurrencies);
    setEditingPaymentMethod(null);
  };

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
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">P2P Settings</h1>
            <p className="text-gray-400 mt-1">Configure currencies, payment methods, and order settings</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/orders"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors text-sm"
            >
              Back to Orders
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

          {/* USDT Wallet & QR Code */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">USDT Wallet Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">USDT Wallet Address (TRC20)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.usdtWalletAddress || ''}
                    onChange={(e) => setSettings({ ...settings, usdtWalletAddress: e.target.value })}
                    placeholder="Enter USDT wallet address"
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    onClick={() => saveSetting('usdtWalletAddress', settings.usdtWalletAddress || '')}
                    disabled={saving}
                    className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">QR Code Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.usdtQrCodeImageUrl || ''}
                    onChange={(e) => setSettings({ ...settings, usdtQrCodeImageUrl: e.target.value })}
                    placeholder="https://example.com/qr-code.png"
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    onClick={() => saveSetting('usdtQrCodeImageUrl', settings.usdtQrCodeImageUrl || '')}
                    disabled={saving}
                    className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fiat Currencies & Payment Methods */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Fiat Currencies & Payment Methods</h2>
                <p className="text-sm text-gray-400 mt-1">Manage currencies and their payment methods</p>
              </div>
              <button
                onClick={addCurrency}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-medium rounded-xl transition-colors text-sm"
              >
                + Add Currency
              </button>
            </div>

            {currencies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No currencies configured. Click "Add Currency" to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {currencies.map((currency) => (
                  <div key={currency.id} className="bg-gray-800/50 rounded-xl p-4">
                    {/* Currency Header */}
                    <div className="flex items-center justify-between mb-4">
                      {editingCurrency === currency.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={currency.name}
                            onChange={(e) => updateCurrency(currency.id, { name: e.target.value })}
                            placeholder="Currency Name"
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          />
                          <input
                            type="text"
                            value={currency.code}
                            onChange={(e) => updateCurrency(currency.id, { code: e.target.value.toUpperCase() })}
                            placeholder="Code"
                            className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 uppercase"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-white font-semibold">{currency.name || 'Unnamed'}</div>
                          <div className="text-gray-400 text-sm">{currency.code || '---'}</div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {editingCurrency === currency.id ? (
                          <>
                            <button
                              onClick={() => saveCurrency(currency)}
                              className="px-3 py-1 bg-green-500 hover:bg-green-400 text-white text-sm rounded-lg"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCurrency(null)}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingCurrency(currency.id)}
                              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteCurrency(currency.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white text-sm rounded-lg"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Currency Prices */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Buy Price (per USDT)</label>
                        {editingCurrency === currency.id ? (
                          <input
                            type="number"
                            value={currency.buyPrice}
                            onChange={(e) => updateCurrency(currency.id, { buyPrice: e.target.value })}
                            placeholder="50"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <div className="text-cyan-400 font-medium">{currency.buyPrice || '---'} {currency.code}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Sell Price (per USDT)</label>
                        {editingCurrency === currency.id ? (
                          <input
                            type="number"
                            value={currency.sellPrice}
                            onChange={(e) => updateCurrency(currency.id, { sellPrice: e.target.value })}
                            placeholder="48"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <div className="text-green-400 font-medium">{currency.sellPrice || '---'} {currency.code}</div>
                        )}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm text-gray-400 font-medium">Payment Methods</h4>
                        {editingCurrency !== currency.id && (
                          <button
                            onClick={() => addPaymentMethod(currency.id)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
                          >
                            + Add Method
                          </button>
                        )}
                      </div>
                      {currency.paymentMethods.length === 0 ? (
                        <div className="text-gray-500 text-sm py-2">No payment methods configured</div>
                      ) : (
                        <div className="space-y-2">
                          {currency.paymentMethods.map((method) => (
                            <div key={method.id} className="bg-gray-700/50 rounded-lg p-3">
                              {editingPaymentMethod?.currencyId === currency.id && editingPaymentMethod?.methodId === method.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={method.name}
                                    onChange={(e) => updatePaymentMethod(currency.id, method.id, { name: e.target.value })}
                                    placeholder="Method Name (e.g., Vodafone Cash)"
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 text-sm"
                                  />
                                  <textarea
                                    value={method.instructions}
                                    onChange={(e) => updatePaymentMethod(currency.id, method.id, { instructions: e.target.value })}
                                    placeholder="Instructions (optional)"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 text-sm resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => savePaymentMethod(currency.id, method)}
                                      className="px-3 py-1 bg-green-500 hover:bg-green-400 text-white text-xs rounded-lg"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingPaymentMethod(null)}
                                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-white text-sm font-medium">{method.name || 'Unnamed'}</div>
                                    {method.instructions && (
                                      <div className="text-gray-400 text-xs mt-1">{method.instructions}</div>
                                    )}
                                  </div>
                                  {editingCurrency !== currency.id && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingPaymentMethod({ currencyId: currency.id, methodId: method.id })}
                                        className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deletePaymentMethod(currency.id, method.id)}
                                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}