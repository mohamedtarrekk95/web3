/**
 * Crypto Price Service - CoinGecko API Integration
 *
 * Provides reliable exchange rates using CoinGecko public API.
 * All prices are fetched in USD and converted via division.
 *
 * Architecture:
 * 1. Fetch USD price for FROM coin
 * 2. Fetch USD price for TO coin
 * 3. rate = fromUSD / toUSD
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// CoinGecko ID mapping (our symbol -> CoinGecko id)
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  MATIC: 'polygon',
  DOT: 'polkadot',
  LTC: 'litecoin',
  TRX: 'tron',
  BCH: 'bitcoin-cash',
  LINK: 'chainlink',
  UNI: 'uniswap',
};

const SUPPORTED_COINS = new Set(Object.keys(SYMBOL_TO_ID));

interface CoinGeckoPriceResponse {
  [id: string]: {
    usd: number;
  };
}

interface CachedPrice {
  price: number;
  timestamp: number;
}

// Server-side cache with 15 second TTL
const serverCache = new Map<string, CachedPrice>();
const CACHE_TTL_MS = 15000;
const MAX_STALE_MS = 60000; // 1 minute max stale before forcing refresh

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
 * Get CoinGecko ID for a symbol
 */
function getCoinGeckoId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toUpperCase()];
}

/**
 * Check if price is cached and fresh
 */
function isCached(symbol: string): boolean {
  const cached = serverCache.get(symbol.toUpperCase());
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached price if not too stale
 */
function getCached(symbol: string): number | null {
  const cached = serverCache.get(symbol.toUpperCase());
  if (!cached) return null;
  if (Date.now() - cached.timestamp > MAX_STALE_MS) return null;
  return cached.price;
}

/**
 * Store price in server cache
 */
function setCached(symbol: string, price: number): void {
  serverCache.set(symbol.toUpperCase(), { price, timestamp: Date.now() });
}

/**
 * Fetch USD price for a single coin from CoinGecko
 * Uses batching when possible for efficiency
 */
async function fetchCoinPrice(symbol: string): Promise<number> {
  const upper = symbol.toUpperCase();

  // Special case: USDT is always 1 USD
  if (upper === 'USDT') {
    return 1.0;
  }

  // Check cache first
  if (isCached(upper)) {
    return serverCache.get(upper)!.price;
  }

  const coinId = getCoinGeckoId(upper);
  const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`;

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data: CoinGeckoPriceResponse = await response.json();

        if (data[coinId] && typeof data[coinId].usd === 'number') {
          const price = data[coinId].usd;

          if (Number.isFinite(price) && price > 0) {
            setCached(upper, price);
            return price;
          }
        }
      }
    } catch (error) {
      console.warn(`CoinGecko attempt ${attempts + 1} failed for ${upper}:`, error);
    }

    if (attempts < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
    attempts++;
  }

  // Try stale cache as last resort
  const stale = getCached(upper);
  if (stale !== null) {
    return stale;
  }

  throw new Error(`Failed to fetch price for ${upper}`);
}

/**
 * Fetch USD prices for multiple coins in one request (batched)
 */
async function fetchBatchPrices(symbols: string[]): Promise<Map<string, number>> {
  const uniqueSymbols = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const prices = new Map<string, number>();

  // Separate batchable from special cases
  const batchable: string[] = [];
  for (const sym of uniqueSymbols) {
    if (sym === 'USDT') {
      prices.set(sym, 1.0);
    } else if (isCached(sym)) {
      prices.set(sym, serverCache.get(sym)!.price);
    } else {
      batchable.push(sym);
    }
  }

  // Batch fetch for efficiency (CoinGecko allows multiple IDs)
  if (batchable.length > 0) {
    const ids = batchable.map((s) => getCoinGeckoId(s)).join(',');
    const url = `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data: CoinGeckoPriceResponse = await response.json();

        for (const sym of batchable) {
          const coinId = getCoinGeckoId(sym);
          if (data[coinId] && typeof data[coinId].usd === 'number') {
            const price = data[coinId].usd;
            if (Number.isFinite(price) && price > 0) {
              setCached(sym, price);
              prices.set(sym, price);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Batch price fetch failed:', error);
    }

    // Fill in any missing with cached values
    for (const sym of batchable) {
      if (!prices.has(sym)) {
        const cached = getCached(sym);
        if (cached !== null) {
          prices.set(sym, cached);
        }
      }
    }
  }

  return prices;
}

/**
 * Calculate exchange rate between two coins using USD base.
 * rate = fromUSD / toUSD
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
    return { rate: 1, fallback: false, message: 'Live rate' };
  }

  // Validate symbols
  if (!isSupportedCoin(fromSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported: ${fromSymbol}` };
  }
  if (!isSupportedCoin(toSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported: ${toSymbol}` };
  }

  try {
    // Use batch fetch for efficiency
    const prices = await fetchBatchPrices([fromSymbol, toSymbol]);

    const fromUSD = prices.get(fromSymbol);
    const toUSD = prices.get(toSymbol);

    // Validate we have both prices
    if (fromUSD === undefined || !Number.isFinite(fromUSD) || fromUSD <= 0) {
      throw new Error(`Invalid price for ${fromSymbol}`);
    }
    if (toUSD === undefined || !Number.isFinite(toUSD) || toUSD <= 0) {
      throw new Error(`Invalid price for ${toSymbol}`);
    }

    const rate = fromUSD / toUSD;

    // Final validation
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1e10) {
      throw new Error(`Invalid rate calculated: ${rate}`);
    }

    return { rate, fallback: false, message: 'Live rate' };

  } catch (error) {
    console.error(`Exchange rate error ${fromSymbol}/${toSymbol}:`, error);

    // Try to construct from stale cache
    const fromCached = getCached(fromSymbol);
    const toCached = getCached(toSymbol);

    if (fromCached !== null && toCached !== null) {
      const rate = fromCached / toCached;
      if (Number.isFinite(rate) && rate > 0) {
        return { rate, fallback: true, message: 'Using cached price' };
      }
    }

    // Special cases for USDT
    if (fromSymbol === 'USDT' && toCached !== null) {
      return { rate: 1 / toCached, fallback: true, message: 'Using cached price' };
    }
    if (toSymbol === 'USDT' && fromCached !== null) {
      return { rate: fromCached, fallback: true, message: 'Using cached price' };
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
  for (const [symbol, data] of serverCache.entries()) {
    const age = Math.round((Date.now() - data.timestamp) / 1000);
    const fresh = Date.now() - data.timestamp < CACHE_TTL_MS;
    entries.push(`${symbol}: $${data.price.toFixed(2)} (${age}s ago${fresh ? ', fresh' : ', stale'})`);
  }
  return { entries };
}
