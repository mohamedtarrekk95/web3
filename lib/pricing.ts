/**
 * Crypto Price Service - Binance API Integration
 *
 * Provides real-time exchange rates using Binance public API.
 * Supports all major trading pairs with USDT base conversion.
 */

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';

// Symbol mapping: our symbol -> Binance pair
const SYMBOL_TO_PAIR: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  USDT: 'USDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  AVAX: 'AVAXUSDT',
  MATIC: 'MATICUSDT',
  DOT: 'DOTUSDT',
  LTC: 'LTCUSDT',
  TRX: 'TRXUSDT',
  BCH: 'BCHUSDT',
  LINK: 'LINKUSDT',
  UNI: 'UNIUSDT',
};

const SUPPORTED_COINS = new Set(Object.keys(SYMBOL_TO_PAIR));

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface CachedPrice {
  price: number;
  timestamp: number;
}

// Server-side cache (persists during function warm starts)
const serverCache = new Map<string, CachedPrice>();
const CACHE_TTL_MS = 10000; // 10 seconds

export function isSupportedCoin(symbol: string): boolean {
  return SUPPORTED_COINS.has(symbol.toUpperCase());
}

export function getSupportedCoins(): string[] {
  return Array.from(SUPPORTED_COINS).sort();
}

export function validateSymbol(symbol: string): { valid: boolean; symbol: string; error?: string } {
  const upper = symbol.toUpperCase();
  if (!SUPPORTED_COINS.has(upper)) {
    return {
      valid: false,
      symbol: upper,
      error: `Unsupported cryptocurrency: ${upper}. Supported: ${getSupportedCoins().join(', ')}`,
    };
  }
  return { valid: true, symbol: upper };
}

/**
 * Get Binance trading pair for a symbol
 */
function getBinancePair(symbol: string): string {
  return SYMBOL_TO_PAIR[symbol.toUpperCase()];
}

/**
 * Check if price is cached and fresh
 */
function isCached(pair: string): boolean {
  const cached = serverCache.get(pair);
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached price
 */
function getCached(pair: string): number | null {
  const cached = serverCache.get(pair);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS * 3) return null; // 30s absolute max
  return cached.price;
}

/**
 * Store price in server cache
 */
function setCached(pair: string, price: number): void {
  serverCache.set(pair, { price, timestamp: Date.now() });
}

/**
 * Fetch price from Binance API with retry
 */
async function fetchFromBinance(pair: string): Promise<number> {
  // Check cache first
  if (isCached(pair)) {
    return serverCache.get(pair)!.price;
  }

  // Direct pair query
  let price: number | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts && price === null) {
    try {
      const response = await fetch(`${BINANCE_API}?symbol=${pair}`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data: BinanceTickerResponse = await response.json();
        const parsed = parseFloat(data.price);
        if (Number.isFinite(parsed) && parsed > 0) {
          price = parsed;
          setCached(pair, price);
        }
      }
    } catch (error) {
      console.warn(`Binance attempt ${attempts + 1} failed for ${pair}:`, error);
    }

    if (price === null && attempts < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
    attempts++;
  }

  if (price !== null) {
    return price;
  }

  // Try cached (stale) as fallback
  const stale = getCached(pair);
  if (stale !== null) {
    return stale;
  }

  throw new Error(`Failed to fetch price for ${pair}`);
}

/**
 * Get single coin price in USD
 */
export async function getCoinPrice(symbol: string): Promise<number> {
  const pair = getBinancePair(symbol);
  if (pair === 'USDT') return 1.0; // USDT is 1:1 with USD
  return fetchFromBinance(pair);
}

/**
 * Calculate exchange rate between two coins.
 * Uses direct Binance pairs when available, otherwise USDT intermediate.
 */
export async function getExchangeRate(from: string, to: string): Promise<{
  rate: number;
  fallback: boolean;
  message: string;
}> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Same coin - 1:1
  if (fromSymbol === toSymbol) {
    return { rate: 1, fallback: false, message: 'Same coin' };
  }

  // Validate
  if (!isSupportedCoin(fromSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported: ${fromSymbol}` };
  }
  if (!isSupportedCoin(toSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported: ${toSymbol}` };
  }

  try {
    // USDT is always 1
    if (fromSymbol === 'USDT') {
      const toPrice = await getCoinPrice(toSymbol);
      return { rate: 1 / toPrice, fallback: false, message: 'Live rate' };
    }
    if (toSymbol === 'USDT') {
      const fromPrice = await getCoinPrice(fromSymbol);
      return { rate: fromPrice, fallback: false, message: 'Live rate' };
    }

    // Both to USDT first, then calculate
    const [fromPrice, toPrice] = await Promise.all([
      getCoinPrice(fromSymbol),
      getCoinPrice(toSymbol),
    ]);

    if (!Number.isFinite(fromPrice) || fromPrice <= 0) {
      throw new Error(`Invalid price for ${fromSymbol}`);
    }
    if (!Number.isFinite(toPrice) || toPrice <= 0) {
      throw new Error(`Invalid price for ${toSymbol}`);
    }

    const rate = fromPrice / toPrice;

    if (!Number.isFinite(rate) || rate <= 0 || rate > 1e10) {
      throw new Error(`Invalid rate: ${rate}`);
    }

    return { rate, fallback: false, message: 'Live rate' };

  } catch (error) {
    console.error(`Exchange rate error ${fromSymbol}/${toSymbol}:`, error);

    // Try to use stale cache
    const fromPair = getBinancePair(fromSymbol);
    const toPair = getBinancePair(toSymbol);

    if (fromPair === 'USDT') {
      const staleTo = getCached(toPair);
      if (staleTo) return { rate: 1 / staleTo, fallback: true, message: 'Using cached price' };
    } else if (toPair === 'USDT') {
      const staleFrom = getCached(fromPair);
      if (staleFrom) return { rate: staleFrom, fallback: true, message: 'Using cached price' };
    } else {
      const staleFrom = getCached(fromPair);
      const staleTo = getCached(toPair);
      if (staleFrom && staleTo) {
        return { rate: staleFrom / staleTo, fallback: true, message: 'Using cached price' };
      }
    }

    return { rate: 0, fallback: true, message: 'Price temporarily unavailable' };
  }
}

/**
 * Apply platform margin (1.8%)
 */
export function applyMargin(price: number, margin = 0.018): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return price * (1 - margin);
}

/**
 * Debug: get cache status
 */
export function getCacheStatus(): { entries: string[] } {
  const entries: string[] = [];
  for (const [pair, data] of serverCache.entries()) {
    const age = Math.round((Date.now() - data.timestamp) / 1000);
    entries.push(`${pair}: $${data.price.toFixed(2)} (${age}s ago)`);
  }
  return { entries };
}
