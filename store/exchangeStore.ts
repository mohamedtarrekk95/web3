import { create } from 'zustand';

interface Coin {
  symbol: string;
  name: string;
  icon: string;
}

interface PriceCache {
  price: number;
  marketRate: number;
  total: number;
  timestamp: number;
  fallback: boolean;
  source: 'api' | 'preload';
}

interface ExchangeState {
  coins: Coin[];
  fromCoin: Coin | null;
  toCoin: Coin | null;
  amount: string;
  price: number;
  total: number;
  marketRate: number;
  loading: boolean;
  isUpdating: boolean;
  priceValidUntil: number | null;
  fallback: boolean;
  priceMessage: string;
  priceCache: Record<string, PriceCache>;
  setCoins: (coins: Coin[]) => void;
  setFromCoin: (coin: Coin) => void;
  setToCoin: (coin: Coin) => void;
  setAmount: (amount: string) => void;
  setPrice: (price: number, marketRate: number, total: number, validUntil: number, fallback: boolean, message?: string) => void;
  setLoading: (loading: boolean) => void;
  setIsUpdating: (updating: boolean) => void;
  setPriceCache: (key: string, data: PriceCache) => void;
  getPriceCache: (key: string) => PriceCache | null;
  clearPrice: () => void;
  swapCoins: () => void;
  reset: () => void;
}

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  coins: [],
  fromCoin: null,
  toCoin: null,
  amount: '1',
  price: 0,
  total: 0,
  marketRate: 0,
  loading: false,
  isUpdating: false,
  priceValidUntil: null,
  fallback: false,
  priceMessage: '',
  priceCache: {},
  setCoins: (coins) => set({ coins }),
  setFromCoin: (fromCoin) => set({ fromCoin }),
  setToCoin: (toCoin) => set({ toCoin }),
  setAmount: (amount) => set({ amount }),

  // setPrice ALSO clears loading to ensure state sync
  setPrice: (price, marketRate, total, priceValidUntil, fallback = false, message = '') =>
    set({ price, marketRate, total, priceValidUntil, fallback, priceMessage: message, loading: false }),

  setLoading: (loading) => set({ loading }),
  setIsUpdating: (isUpdating) => set({ isUpdating }),

  setPriceCache: (key, data) =>
    set((state) => ({
      priceCache: { ...state.priceCache, [key]: data },
    })),

  getPriceCache: (key) => {
    const cache = get().priceCache;
    return cache[key] || null;
  },

  // Clear price when coins change - prevents stale display
  clearPrice: () => set({ price: 0, total: 0, marketRate: 0, priceValidUntil: null }),

  swapCoins: () => set((state) => ({
    fromCoin: state.toCoin,
    toCoin: state.fromCoin,
    // Reset price when swapping to force reload
    price: 0,
    total: 0,
    marketRate: 0,
    priceValidUntil: null,
  })),

  reset: () => set({
    fromCoin: null,
    toCoin: null,
    amount: '1',
    price: 0,
    total: 0,
    marketRate: 0,
    loading: false,
    isUpdating: false,
    priceValidUntil: null,
    fallback: false,
    priceMessage: '',
  }),
}));

/**
 * Preload prices for popular coin pairs on app start
 */
export async function preloadPrices() {
  const POPULAR_PAIRS = [
    { from: 'BTC', to: 'USDT' },
    { from: 'ETH', to: 'USDT' },
    { from: 'BNB', to: 'USDT' },
    { from: 'SOL', to: 'USDT' },
    { from: 'ADA', to: 'USDT' },
    { from: 'BTC', to: 'ETH' },
  ];

  const store = useExchangeStore.getState();

  try {
    await Promise.all(
      POPULAR_PAIRS.map(async ({ from, to }) => {
        try {
          const res = await fetch(`/api/price?from=${from}&to=${to}&amount=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.rate > 0) {
              const key = `${from}-${to}`;
              store.setPriceCache(key, {
                price: data.rate,
                marketRate: data.marketRate,
                total: data.total,
                timestamp: Date.now(),
                fallback: data.fallback || false,
                source: 'preload',
              });
            }
          }
        } catch {
          // Silent fail for preloads
        }
      })
    );
  } catch (error) {
    console.warn('Preload failed:', error);
  }
}
