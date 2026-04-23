'use client';

/**
 * usePriceStream - Real-time WebSocket price hook
 *
 * Manages Binance WebSocket connection and provides live prices.
 * Updates Zustand store on every price tick.
 */

import { useEffect, useCallback, useRef } from 'react';
import { priceSocket } from '@/lib/priceSocket';
import { useExchangeStore } from '@/store/exchangeStore';

const MARGIN = 0.018;

export function usePriceStream() {
  const {
    fromCoin,
    toCoin,
    amount,
    setWsConnected,
    setWsReconnecting,
    updateLivePrice,
    setLivePrices,
    setPrice,
    setLoading,
    setIsUpdating,
  } = useExchangeStore();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const amountRef = useRef(amount);
  amountRef.current = amount;

  // Handle incoming price updates
  const handlePriceUpdate = useCallback((symbol: string, price: number, change24h: number) => {
    updateLivePrice(symbol, price);

    // Recalculate if this symbol affects current pair
    const store = useExchangeStore.getState();
    const { fromCoin, toCoin, wsConnected } = store;

    if (!wsConnected) {
      setWsConnected(true);
      setWsReconnecting(false);
    }

    // If we have a from/to coin pair, recalculate the rate
    if (fromCoin && toCoin) {
      recalculatePrice(symbol, price);
    }
  }, [updateLivePrice, setWsConnected, setWsReconnecting]);

  // Recalculate exchange price when any price updates
  const recalculatePrice = useCallback((updatedSymbol: string, updatedPrice: number) => {
    const store = useExchangeStore.getState();
    const { fromCoin, toCoin, amount, livePrices, price } = store;

    if (!fromCoin || !toCoin) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const fromSymbol = fromCoin.symbol;
    const toSymbol = toCoin.symbol;
    const fromKey = `${fromSymbol}USDT`;
    const toKey = `${toSymbol}USDT`;

    // Only recalculate if the updated symbol is one of our pair
    if (updatedSymbol !== fromKey && updatedSymbol !== toKey) return;

    const fromPrice = livePrices[fromKey];
    const toPrice = livePrices[toKey];

    if (!fromPrice || !toPrice || fromPrice <= 0 || toPrice <= 0) return;

    const marketRate = fromPrice / toPrice;
    const rateWithMargin = marketRate * (1 - MARGIN);
    const total = rateWithMargin * amountNum;

    if (Number.isFinite(marketRate) && Number.isFinite(rateWithMargin) && Number.isFinite(total)) {
      setPrice(rateWithMargin, marketRate, total, Date.now() + 60000, false, 'Live');
    }
  }, [setPrice]);

  // Connect to WebSocket on mount
  useEffect(() => {
    // Subscribe to price updates
    unsubscribeRef.current = priceSocket.subscribe(handlePriceUpdate);

    // Connect if not already connected
    priceSocket.connect();

    // Update store with initial connection state
    const state = priceSocket.getState();
    setWsConnected(state.connected);
    setWsReconnecting(state.reconnecting);

    // Initialize live prices from cache
    const cachedPrices = priceSocket.getAllLivePrices();
    if (Object.keys(cachedPrices).length > 0) {
      setLivePrices(cachedPrices);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handlePriceUpdate, setWsConnected, setWsReconnecting, setLivePrices]);

  // Recalculate price when coins change
  useEffect(() => {
    if (!fromCoin || !toCoin) return;

    const store = useExchangeStore.getState();
    const { livePrices, amount } = store;

    const fromKey = `${fromCoin.symbol}USDT`;
    const toKey = `${toCoin.symbol}USDT`;

    const fromPrice = livePrices[fromKey];
    const toPrice = livePrices[toKey];

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setLoading(false);
      return;
    }

    if (fromPrice && toPrice && fromPrice > 0 && toPrice > 0) {
      const marketRate = fromPrice / toPrice;
      const rateWithMargin = marketRate * (1 - MARGIN);
      const total = rateWithMargin * amountNum;

      if (Number.isFinite(marketRate) && Number.isFinite(rateWithMargin) && Number.isFinite(total)) {
        setPrice(rateWithMargin, marketRate, total, Date.now() + 60000, false, 'Live');
        setLoading(false);
        setIsUpdating(false);
      }
    }
  }, [fromCoin?.symbol, toCoin?.symbol, setPrice, setLoading, setIsUpdating]);

  // Get live price for a symbol
  const getLivePrice = useCallback((symbol: string): number | null => {
    return priceSocket.getLivePrice(`${symbol}USDT`);
  }, []);

  // Get cached fallback price
  const getFallbackPrice = useCallback((symbol: string): number | null => {
    return priceSocket.getFallbackPrice(symbol);
  }, []);

  return {
    getLivePrice,
    getFallbackPrice,
    isConnected: priceSocket.getState().connected,
  };
}
