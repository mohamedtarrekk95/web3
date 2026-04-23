'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { AdminRoute } from '@/components/AdminRoute';

interface Wallet {
  _id: string;
  symbol: string;
  address: string;
  qrCodeImageUrl: string;
}

const DEFAULT_COIN_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzMzNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiI+PC90ZXh0Pjwvc3ZnPg==';
const QR_PLACEHOLDER = '/qr-placeholder.svg';

export default function AdminWallets() {
  const { user, isAuthenticated, loading } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [coins, setCoins] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    console.log('[AdminWallets] Fetching data...');
    try {
      const [walletsRes, coinsRes] = await Promise.all([
        fetch('/api/admin/wallets', { credentials: 'include' }),
        fetch('/api/coins'),
      ]);

      console.log('[AdminWallets] Wallets response status:', walletsRes.status);
      const walletsRaw = await walletsRes.json();
      console.log('[AdminWallets] Raw wallets response:', JSON.stringify(walletsRaw));

      // Validate response structure
      if (walletsRes.ok && walletsRaw?.success && Array.isArray(walletsRaw.wallets)) {
        console.log('[AdminWallets] Setting', walletsRaw.wallets.length, 'wallets');

        // Normalize wallets data - ensure all fields exist
        const normalizedWallets = walletsRaw.wallets.map((w: any) => ({
          _id: w._id || '',
          symbol: w.symbol || '',
          address: w.address || '',
          qrCodeImageUrl: w.qrCodeImageUrl || w.qrCodeUrl || '', // Support both field names
        }));

        console.log('[AdminWallets] Normalized wallets:', JSON.stringify(normalizedWallets));
        setWallets(normalizedWallets);
      } else {
        console.log('[AdminWallets] Wallet API error:', walletsRaw?.message || 'Unknown');
        setWallets([]);
      }

      if (coinsRes.ok) {
        const coinsData = await coinsRes.json();
        console.log('[AdminWallets] Coins count:', Array.isArray(coinsData) ? coinsData.length : 0);
        setCoins(Array.isArray(coinsData) ? coinsData : []);
      }
    } catch (err) {
      console.error('[AdminWallets] Fetch error:', err);
      setWallets([]);
      setCoins([]);
    } finally {
      setPageLoading(false);
    }
  };

  const getWallet = (symbol: string): Wallet | null => {
    if (!Array.isArray(wallets)) {
      console.log('[AdminWallets] wallets is not an array:', typeof wallets);
      return null;
    }
    const wallet = wallets.find((w) => w.symbol === symbol) || null;
    console.log('[AdminWallets] getWallet(', symbol, '):', wallet);
    return wallet;
  };

  const saveWallet = async (symbol: string, address: string, qrCodeImageUrl: string) => {
    console.log('[AdminWallets] Save request:', { symbol, address, qrCodeImageUrl });
    setSaving(true);
    try {
      const response = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ symbol, address, qrCodeImageUrl }),
      });

      const data = await response.json();
      console.log('[AdminWallets] Save response:', JSON.stringify(data));

      if (response.ok && data?.success && data?.wallet) {
        const updatedWallet = data.wallet;
        setWallets((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const exists = arr.find((w) => w.symbol === symbol);
          if (exists) {
            return arr.map((w) => (w.symbol === symbol ? updatedWallet : w));
          }
          return [...arr, updatedWallet];
        });
        setMessage({ type: 'success', text: `${symbol} wallet saved successfully` });
      } else {
        console.log('[AdminWallets] Save failed:', data?.message);
        setMessage({ type: 'error', text: data?.message || 'Failed to save wallet' });
      }
    } catch (err) {
      console.error('[AdminWallets] Save error:', err);
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
        <p className="text-gray-400">Please log in to manage wallets</p>
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
          <a
            href="/admin/orders"
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white hover:border-cyan-500 transition-colors"
          >
            Manage Orders
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

        <div className="grid gap-6">
          {Array.isArray(coins) && coins.map((coin) => {
            const wallet = getWallet(coin.symbol);
            return (
              <WalletForm
                key={coin.symbol}
                coin={coin}
                initialAddress={wallet?.address || ''}
                initialQrCodeUrl={wallet?.qrCodeImageUrl || ''}
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
  onSave: (symbol: string, address: string, qrCodeImageUrl: string) => void;
  saving: boolean;
}

function WalletForm({ coin, initialAddress, initialQrCodeUrl, onSave, saving }: WalletFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState(initialQrCodeUrl);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageError, setImageError] = useState(false);

  console.log('[WalletForm] Rendering for', coin.symbol);
  console.log('[WalletForm] qrCodeImageUrl:', qrCodeImageUrl);
  console.log('[WalletForm] imageError:', imageError);

  useEffect(() => {
    setAddress(initialAddress);
    setQrCodeImageUrl(initialQrCodeUrl);
    setImageError(false);
  }, [initialAddress, initialQrCodeUrl, coin.symbol]);

  useEffect(() => {
    setHasChanges(address !== initialAddress || qrCodeImageUrl !== initialQrCodeUrl);
  }, [address, qrCodeImageUrl, initialAddress, initialQrCodeUrl]);

  const handleSave = () => {
    onSave(coin.symbol, address, qrCodeImageUrl);
    setHasChanges(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('[WalletForm] Image failed to load for', coin.symbol);
    console.log('[WalletForm] Failed src:', qrCodeImageUrl);
    setImageError(true);
    // Prevent infinite loop by clearing onerror
    e.currentTarget.onerror = null;
    e.currentTarget.src = QR_PLACEHOLDER;
  };

  // Determine which image URL to show
  const displayQrUrl = !imageError && qrCodeImageUrl ? qrCodeImageUrl : (imageError ? QR_PLACEHOLDER : '');

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <img
          src={coin.icon}
          alt={coin.symbol}
          className="w-12 h-12 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_COIN_ICON;
          }}
        />
        <div>
          <h3 className="text-lg font-semibold text-white">{coin.symbol}</h3>
          <p className="text-sm text-gray-400">{coin.name}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Wallet Address / Label / Note</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter receiving address, label, or note"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">QR Code Image URL</label>
          <input
            type="text"
            value={qrCodeImageUrl}
            onChange={(e) => {
              setQrCodeImageUrl(e.target.value);
              setImageError(false); // Reset error when URL changes
            }}
            placeholder="Paste QR code image URL"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* QR Code Preview Section */}
      <div className="mt-4">
        <p className="text-sm text-gray-400 mb-2">QR Code Preview</p>
        <div className="w-32 h-32 bg-white p-2 rounded-xl">
          {displayQrUrl ? (
            <img
              src={displayQrUrl}
              alt="QR Code Preview"
              className="w-full h-full object-contain"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center">
              No QR Code
            </div>
          )}
        </div>
        {qrCodeImageUrl && imageError && (
          <p className="text-xs text-red-400 mt-1">Failed to load image. Using placeholder.</p>
        )}
        {qrCodeImageUrl && !imageError && (
          <p className="text-xs text-gray-500 mt-1">Image URL: {qrCodeImageUrl}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <AdminRoute fallback={
          <span className="text-gray-500 text-sm">Admin access required to edit</span>
        }>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Wallet'}
          </button>
        </AdminRoute>
      </div>
    </div>
  );
}