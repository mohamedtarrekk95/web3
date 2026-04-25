import { create } from 'zustand';

export interface Coin {
  symbol: string;
  name: string;
  icon: string;
}

export interface SwapRoute {
  protocol: string;
  part: number;
  name: string;
  logoUrl?: string;
}

export interface SwapQuote {
  fromToken: Coin;
  toToken: Coin;
  fromAmount: string;
  toAmount: string;
  rate: number;
  marketRate: number;
  priceImpact: number;
  guaranteedPrice: number;
  routes: SwapRoute[];
  estimatedGas: string;
  gasUsd: number;
  platformFee: number;
  platformFeePercent: number;
  minimumReceived: string;
  validUntil: number;
  aggregator: string;
}

export interface SwapExecution {
  orderId: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  fromToken: Coin;
  toToken: Coin;
  fromAmount: string;
  toAmount: string;
  timestamp: number;
}

interface SwapState {
  coins: Coin[];
  fromCoin: Coin | null;
  toCoin: Coin | null;
  amount: string;
  quote: SwapQuote | null;
  loading: boolean;
  error: string | null;
  swapHistory: SwapExecution[];
  isSwappingCoins: boolean;
  executionStatus: 'idle' | 'confirming' | 'processing' | 'success' | 'error';
  txHash: string | null;

  // Actions
  setCoins: (coins: Coin[]) => void;
  setFromCoin: (coin: Coin | null) => void;
  setToCoin: (coin: Coin | null) => void;
  setAmount: (amount: string) => void;
  setQuote: (quote: SwapQuote | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSwapHistory: (history: SwapExecution[]) => void;
  addToHistory: (execution: SwapExecution) => void;
  swapCoins: () => void;
  clearQuote: () => void;
  reset: () => void;
  setExecutionStatus: (status: SwapState['executionStatus']) => void;
  setTxHash: (hash: string | null) => void;
}

export const useSwapStore = create<SwapState>((set, get) => ({
  coins: [],
  fromCoin: null,
  toCoin: null,
  amount: '',
  quote: null,
  loading: false,
  error: null,
  swapHistory: [],
  isSwappingCoins: false,
  executionStatus: 'idle',
  txHash: null,

  setCoins: (coins) => set({ coins }),
  setFromCoin: (fromCoin) => {
    set({ fromCoin, quote: null });
  },
  setToCoin: (toCoin) => {
    set({ toCoin, quote: null });
  },
  setAmount: (amount) => set({ amount, quote: null }),
  setQuote: (quote) => set({ quote, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSwapHistory: (history) => set({ swapHistory: history }),
  addToHistory: (execution) =>
    set((state) => ({ swapHistory: [execution, ...state.swapHistory] })),

  swapCoins: () =>
    set((state) => ({
      fromCoin: state.toCoin,
      toCoin: state.fromCoin,
      amount: state.amount,
      quote: null,
      isSwappingCoins: true,
    })),

  clearQuote: () => set({ quote: null }),
  reset: () =>
    set({
      fromCoin: null,
      toCoin: null,
      amount: '',
      quote: null,
      loading: false,
      error: null,
      executionStatus: 'idle',
      txHash: null,
    }),
  setExecutionStatus: (executionStatus) => set({ executionStatus }),
  setTxHash: (txHash) => set({ txHash }),
}));
