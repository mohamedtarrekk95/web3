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
  setPriceCache: (symbol: string, data: PriceCache) => void;
  getCachedPrice: (symbol: string) => PriceCache | null;
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
  setPrice: (price, marketRate, total, priceValidUntil, fallback = false, message = '') =>
    set({ price, marketRate, total, priceValidUntil, fallback, priceMessage: message }),
  setLoading: (loading) => set({ loading }),
  setIsUpdating: (isUpdating) => set({ isUpdating }),
  setPriceCache: (symbol, data) =>
    set((state) => ({
      priceCache: { ...state.priceCache, [symbol]: data },
    })),
  getCachedPrice: (symbol) => {
    const cache = get().priceCache;
    return cache[symbol] || null;
  },
  swapCoins: () =>
    set((state) => ({
      fromCoin: state.toCoin,
      toCoin: state.fromCoin,
    })),
  reset: () =>
    set({
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
 * Preload prices for popular coins on app start
 */
export async function preloadPrices() {
  const POPULAR_COINS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];
  const store = useExchangeStore.getState();

  try {
    const results = await Promise.all(
      POPULAR_COINS.map(async (coin) => {
        try {
          const res = await fetch(`/api/price?from=${coin}&to=USDT&amount=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.rate > 0) {
              store.setPriceCache(coin, {
                price: data.rate,
                marketRate: data.marketRate,
                total: data.total,
                timestamp: Date.now(),
                fallback: data.fallback || false,
              });
              return { coin, success: true } as const;
            }
          }
          return { coin, success: false } as const;
        } catch {
          return { coin, success: false } as const;
        }
      })
    );
    const successfulCoins: string[] = [];
    for (const r of results) {
      if (r.success && r.coin) {
        successfulCoins.push(r.coin);
      }
    }
    console.log('Preloaded prices:', successfulCoins.join(', '));
  } catch (error) {
    console.warn('Failed to preload prices:', error);
  }
}
