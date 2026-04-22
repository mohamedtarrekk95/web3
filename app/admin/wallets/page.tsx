'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Wallet {
  _id: string;
  coinSymbol: string;
  address: string;
  qrCodeUrl: string;
}

export default function AdminWallets() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const [walletsRes, coinsRes] = await Promise.all([
        fetch('/api/admin/wallets', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/coins'),
      ]);

      if (!walletsRes.ok) {
        throw new Error('Unauthorized');
      }

      const walletsData = await walletsRes.json();
      const coinsData = await coinsRes.json();

      setWallets(walletsData);
      setCoins(coinsData);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const getWallet = (symbol: string) => {
    return wallets.find((w) => w.coinSymbol === symbol) || { address: '', qrCodeUrl: '' };
  };

  const saveWallet = async (symbol: string, address: string, qrCodeUrl: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coinSymbol: symbol, address, qrCodeUrl }),
      });

      if (response.ok) {
        const updatedWallet = await response.json();
        setWallets((prev) => {
          const exists = prev.find((w) => w.coinSymbol === symbol);
          if (exists) {
            return prev.map((w) => (w.coinSymbol === symbol ? updatedWallet : w));
          }
          return [...prev, updatedWallet];
        });
        setMessage({ type: 'success', text: `${symbol} wallet saved successfully` });
      } else {
        setMessage({ type: 'error', text: 'Failed to save wallet' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
            <h1 className="text-2xl font-bold text-white">Wallet Management</h1>
            <p className="text-gray-400 mt-1">Configure deposit addresses for each coin</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/orders"
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
            >
              Manage Orders
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

        {message && (
          <div className={`p-4 rounded-xl mb-6 ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6">
          {coins.map((coin) => {
            const wallet = getWallet(coin.symbol);
            return (
              <WalletForm
                key={coin.symbol}
                coin={coin}
                initialAddress={wallet.address}
                initialQrCodeUrl={wallet.qrCodeUrl}
                onSave={saveWallet}
                saving={saving}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface WalletFormProps {
  coin: any;
  initialAddress: string;
  initialQrCodeUrl: string;
  onSave: (symbol: string, address: string, qrCodeUrl: string) => void;
  saving: boolean;
}

function WalletForm({ coin, initialAddress, initialQrCodeUrl, onSave, saving }: WalletFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [qrCodeUrl, setQrCodeUrl] = useState(initialQrCodeUrl);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(address !== initialAddress || qrCodeUrl !== initialQrCodeUrl);
  }, [address, qrCodeUrl, initialAddress, initialQrCodeUrl]);

  const handleSave = () => {
    onSave(coin.symbol, address, qrCodeUrl);
    setHasChanges(false);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={coin.icon}
          alt={coin.symbol}
          className="w-12 h-12 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://via.placeholder.com/48?text=${coin.symbol}`;
          }}
        />
        <div>
          <h3 className="text-lg font-semibold text-white">{coin.symbol}</h3>
          <p className="text-sm text-gray-400">{coin.name}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={`Enter ${coin.symbol} wallet address`}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">QR Code Image URL</label>
          <input
            type="text"
            value={qrCodeUrl}
            onChange={(e) => setQrCodeUrl(e.target.value)}
            placeholder="Paste QR code image URL"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {qrCodeUrl && (
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">QR Code Preview</p>
          <div className="w-32 h-32 bg-white p-2 rounded-xl">
            <img
              src={qrCodeUrl}
              alt="QR Code Preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Wallet'}
        </button>
      </div>
    </div>
  );
}
