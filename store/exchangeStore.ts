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
  source: 'websocket' | 'cache';
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
  wsConnected: boolean;
  wsReconnecting: boolean;
  livePrices: Record<string, number>;
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
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  updateLivePrice: (symbol: string, price: number) => void;
  setLivePrices: (prices: Record<string, number>) => void;
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
  wsConnected: false,
  wsReconnecting: false,
  livePrices: {},
  setCoins: (coins) => set({ coins }),
  setFromCoin: (fromCoin) => set({ fromCoin }),
  setToCoin: (toCoin) => set({ toCoin }),
  setAmount: (amount) => set({ amount }),

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

  clearPrice: () => set({ price: 0, total: 0, marketRate: 0, priceValidUntil: null }),

  swapCoins: () => set((state) => ({
    fromCoin: state.toCoin,
    toCoin: state.fromCoin,
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

  setWsConnected: (wsConnected) => set({ wsConnected }),
  setWsReconnecting: (wsReconnecting) => set({ wsReconnecting }),
  updateLivePrice: (symbol, price) =>
    set((state) => ({
      livePrices: { ...state.livePrices, [symbol]: price },
    })),
  setLivePrices: (prices) => set({ livePrices: prices }),
}));
