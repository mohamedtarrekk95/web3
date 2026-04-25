'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface WalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
  loading: boolean;
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

const STORAGE_KEY = 'wallet_connected';

function getNetworkName(chainId: string): string {
  const networks: Record<string, string> = {
    '0x1': 'ETH',
    '0x38': 'BSC',
    '0x89': 'MATIC',
    '0xa86a': 'AVAX',
    '0xfa': 'FTM',
    '0x19': 'CRONOS',
    '0x2b6653dc': 'TRON',
  };
  return networks[chainId] || 'Unknown';
}

function shortenAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletButton() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const mountedRef = useRef(true);

  const isMetaMaskAvailable = useCallback(() => {
    return typeof window !== 'undefined' && window.ethereum?.isMetaMask === true;
  }, []);

  // Fetch stored wallets from API
  const fetchStoredWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/connect');
      if (res.ok) {
        const data = await res.json();
        if (data.wallets && data.wallets.length > 0) {
          const latestWallet = data.wallets[data.wallets.length - 1];
          if (mountedRef.current) {
            setConnected(true);
            setAddress(latestWallet.address);
            setNetwork(latestWallet.network);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stored wallets:', err);
    }
  }, []);

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (!isMetaMaskAvailable()) {
      setError('MetaMask not installed');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = (await window.ethereum!.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const address = accounts[0];

      const chainId = (await window.ethereum!.request({
        method: 'eth_chainId',
      })) as string;

      const networkName = getNetworkName(chainId);

      if (mountedRef.current) {
        setConnected(true);
        setAddress(address.toLowerCase());
        setNetwork(networkName);
        setLoading(false);
      }

      await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, network: networkName }),
      });

      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      if (mountedRef.current) {
        setError(message.includes('User rejected') ? 'Connection rejected' : message);
        setLoading(false);
      }
    }
  }, [isMetaMaskAvailable]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!address) return;

    setLoading(true);

    try {
      await fetch(`/api/wallet/connect?address=${address}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Failed to remove wallet from backend:', err);
    }

    if (mountedRef.current) {
      setConnected(false);
      setAddress(null);
      setNetwork(null);
      setLoading(false);
    }

    sessionStorage.removeItem(STORAGE_KEY);
  }, [address]);

  // Setup event listeners
  useEffect(() => {
    mountedRef.current = true;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (mountedRef.current && accs[0].toLowerCase() !== address) {
        setAddress(accs[0].toLowerCase());
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const eth = window.ethereum;
    if (eth && eth.on) {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (eth && eth.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address, disconnect]);

  // Check for existing connection on mount
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) {
      fetchStoredWallets();
    }
  }, [fetchStoredWallets]);

  if (loading) {
    return (
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400">
        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Connecting...</span>
      </button>
    );
  }

  if (connected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-sm text-green-400 font-mono">{shortenAddress(address)}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-gray-800">
              <div className="text-xs text-gray-400">Network</div>
              <div className="text-sm text-white">{network || 'Unknown'}</div>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors rounded-b-lg"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={!isMetaMaskAvailable()}
      className={`flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded-lg transition-colors ${!isMetaMaskAvailable() ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={!isMetaMaskAvailable() ? 'Please install MetaMask to connect a wallet' : 'Connect your MetaMask wallet'}
    >
      <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.957 5.076l-2.246-2.246L21.957 5.076zM10.075 16.68l-2.246 2.246 2.246 2.246 2.246-2.246-2.246-2.246zM4.793 11.037l7.878-7.878 2.246 2.246-7.878 7.878-2.246-2.246zm8.463 9.165l2.246-2.246-2.246-2.246-2.246 2.246 2.246 2.246zM21.957 18.924l-2.246 2.246 2.246 2.246 2.246-2.246-2.246-2.246zM12.003 2.069l-7.878 7.878 2.246 2.246 7.878-7.878-2.246-2.246zM5.304 21.206l2.246-2.246-2.246-2.246L3.058 18.96l2.246 2.246z"/>
      </svg>
      <span className="text-sm text-gray-300">
        {isMetaMaskAvailable() ? 'Connect Wallet' : 'MetaMask Required'}
      </span>
    </button>
  );
}
