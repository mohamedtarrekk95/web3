'use client';

import { useState, useRef, useEffect } from 'react';

interface Coin {
  symbol: string;
  name: string;
  icon: string;
}

interface CoinSelectorProps {
  coins: Coin[];
  selectedCoin: Coin | null;
  onSelect: (coin: Coin) => void;
  label: string;
}

export default function CoinSelector({ coins, selectedCoin, onSelect, label }: CoinSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCoins = coins.filter(
    (coin) =>
      coin.symbol.toLowerCase().includes(search.toLowerCase()) ||
      coin.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">{label}</label>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-cyan-500/50 transition-colors"
        >
          {selectedCoin ? (
            <div className="flex items-center gap-3">
              <img
                src={selectedCoin.icon}
                alt={selectedCoin.symbol}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://via.placeholder.com/32?text=${selectedCoin.symbol}`;
                }}
              />
              <div className="text-left">
                <div className="font-medium text-white">{selectedCoin.symbol}</div>
                <div className="text-xs text-gray-400">{selectedCoin.name}</div>
              </div>
            </div>
          ) : (
            <span className="text-gray-500">Select coin</span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-gray-800">
              <input
                type="text"
                placeholder="Search coin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredCoins.map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    onSelect(coin);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors"
                >
                  <img
                    src={coin.icon}
                    alt={coin.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/32?text=${coin.symbol}`;
                    }}
                  />
                  <div className="text-left">
                    <div className="font-medium text-white">{coin.symbol}</div>
                    <div className="text-xs text-gray-400">{coin.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
