import { create } from 'zustand';

interface Coin {
  symbol: string;
  name: string;
  icon: string;
}

interface WalletInfo {
  symbol: string;
  address: string;
  qrCodeImageUrl: string;
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
  priceCache: Record<string, { price: number; marketRate: number; total: number; timestamp: number; fallback: boolean; source: 'websocket' | 'cache' }>;
  wsConnected: boolean;
  wsReconnecting: boolean;
  livePrices: Record<string, number>;
  // Checkout data
  checkoutData: {
    fromCoin: Coin | null;
    toCoin: Coin | null;
    amount: string;
    total: number;
    price: number;
    walletInfo: WalletInfo | null;
  } | null;
  setCoins: (coins: Coin[]) => void;
  setFromCoin: (coin: Coin) => void;
  setToCoin: (coin: Coin) => void;
  setAmount: (amount: string) => void;
  setPrice: (price: number, marketRate: number, total: number, validUntil: number, fallback: boolean, message?: string) => void;
  setLoading: (loading: boolean) => void;
  setIsUpdating: (updating: boolean) => void;
  setPriceCache: (key: string, data: { price: number; marketRate: number; total: number; timestamp: number; fallback: boolean; source: 'websocket' | 'cache' }) => void;
  getPriceCache: (key: string) => { price: number; marketRate: number; total: number; timestamp: number; fallback: boolean; source: 'websocket' | 'cache' } | null;
  clearPrice: () => void;
  swapCoins: () => void;
  reset: () => void;
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  updateLivePrice: (symbol: string, price: number) => void;
  setLivePrices: (prices: Record<string, number>) => void;
  setCheckoutData: (data: ExchangeState['checkoutData']) => void;
  clearCheckoutData: () => void;
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
  checkoutData: null,

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
    checkoutData: null,
  }),

  setWsConnected: (wsConnected) => set({ wsConnected }),
  setWsReconnecting: (wsReconnecting) => set({ wsReconnecting }),
  updateLivePrice: (symbol, price) =>
    set((state) => ({
      livePrices: { ...state.livePrices, [symbol]: price },
    })),
  setLivePrices: (prices) => set({ livePrices: prices }),

  setCheckoutData: (data) => set({ checkoutData: data }),
  clearCheckoutData: () => set({ checkoutData: null }),
}));