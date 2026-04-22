import { create } from 'zustand';

interface Coin {
  symbol: string;
  name: string;
  icon: string;
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
  priceValidUntil: number | null;
  error: string | null;
  setCoins: (coins: Coin[]) => void;
  setFromCoin: (coin: Coin) => void;
  setToCoin: (coin: Coin) => void;
  setAmount: (amount: string) => void;
  setPrice: (price: number, marketRate: number, total: number, validUntil: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  swapCoins: () => void;
  reset: () => void;
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  coins: [],
  fromCoin: null,
  toCoin: null,
  amount: '1',
  price: 0,
  total: 0,
  marketRate: 0,
  loading: false,
  priceValidUntil: null,
  error: null,
  setCoins: (coins) => set({ coins }),
  setFromCoin: (fromCoin) => set({ fromCoin }),
  setToCoin: (toCoin) => set({ toCoin }),
  setAmount: (amount) => set({ amount }),
  setPrice: (price, marketRate, total, priceValidUntil) =>
    set({ price, marketRate, total, priceValidUntil }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
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
      priceValidUntil: null,
      error: null,
    }),
}));
