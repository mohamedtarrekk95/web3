// CoinGecko API base URL
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Symbol to CoinGecko ID mapping
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

// Supported coins (our internal symbols)
const SUPPORTED_COINS = new Set(Object.keys(SYMBOL_TO_ID));

interface CachedPrice {
  price: number;
  timestamp: number;
  source: 'api' | 'fallback';
}

interface CoinGeckoPriceData {
  [coinId: string]: {
    usd: number;
  };
}

// In-memory cache with fallback support
const priceCache: Map<string, CachedPrice> = new Map();
const CACHE_DURATION = 20000; // 20 seconds
const STALE_CACHE_DURATION = 300000; // 5 minutes - use stale cache if no fresh data

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
 * Checks if cached price is fresh
 */
function isCacheFresh(cacheKey: string): boolean {
  const cached = priceCache.get(cacheKey);
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION;
}

/**
 * Gets any cached price (fresh or stale), preferring fresh
 */
function getCachedPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol.toUpperCase());
  if (!cached) return null;
  if (Date.now() - cached.timestamp < STALE_CACHE_DURATION) {
    return cached.price;
  }
  return null;
}

/**
 * Stores price in cache
 */
function setCachedPrice(symbol: string, price: number, source: 'api' | 'fallback' = 'api'): void {
  priceCache.set(symbol.toUpperCase(), {
    price,
    timestamp: Date.now(),
    source,
  });
}

/**
 * Fetches price from CoinGecko with retry + fallback
 */
async function fetchPriceWithFallback(symbol: string): Promise<CachedPrice> {
  const cacheKey = symbol.toUpperCase();
  const coinId = SYMBOL_TO_ID[cacheKey];

  if (!coinId) {
    throw new Error(`Unknown symbol: ${cacheKey}`);
  }

  // Try from cache first
  if (isCacheFresh(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }

  // First attempt
  try {
    const price = await fetchFromCoinGecko(coinId);
    setCachedPrice(cacheKey, price, 'api');
    return priceCache.get(cacheKey)!;
  } catch (error) {
    console.warn(`CoinGecko attempt 1 failed for ${cacheKey}:`, error);
  }

  // Wait 500ms and retry once
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const price = await fetchFromCoinGecko(coinId);
    setCachedPrice(cacheKey, price, 'api');
    return priceCache.get(cacheKey)!;
  } catch (error) {
    console.warn(`CoinGecko attempt 2 failed for ${cacheKey}:`, error);
  }

  // All attempts failed - try any cached value (even stale)
  const fallbackPrice = getCachedPrice(cacheKey);
  if (fallbackPrice !== null) {
    return {
      price: fallbackPrice,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }

  // No fallback available - try to get price anyway (may throw)
  const lastResort = await fetchFromCoinGecko(coinId);
  return {
    price: lastResort,
    timestamp: Date.now(),
    source: 'api',
  };
}

/**
 * Direct CoinGecko API call
 */
async function fetchFromCoinGecko(coinId: string): Promise<number> {
  const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data: CoinGeckoPriceData = await response.json();

  if (!data || !data[coinId] || typeof data[coinId].usd === 'undefined') {
    throw new Error(`Invalid response for ${coinId}`);
  }

  const price = data[coinId].usd;

  if (!Number.isFinite(price) || price <= 0 || isNaN(price)) {
    throw new Error(`Invalid price value: ${price}`);
  }

  return price;
}

/**
 * Gets exchange rate between two coins.
 * NEVER throws - always returns a valid rate (real or fallback)
 */
export async function getExchangeRate(from: string, to: string): Promise<{
  rate: number;
  fallback: boolean;
  message: string;
}> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Same coin - instant 1:1
  if (fromSymbol === toSymbol) {
    return {
      rate: 1,
      fallback: false,
      message: 'Same coin',
    };
  }

  // Validate coins
  if (!isSupportedCoin(fromSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported coin: ${fromSymbol}` };
  }
  if (!isSupportedCoin(toSymbol)) {
    return { rate: 0, fallback: true, message: `Unsupported coin: ${toSymbol}` };
  }

  try {
    // Fetch both prices with fallback support
    const [fromPrice, toPrice] = await Promise.all([
      fetchPriceWithFallback(fromSymbol),
      fetchPriceWithFallback(toSymbol),
    ]);

    const { price: fromUSD } = fromPrice;
    const { price: toUSD } = toPrice;

    // Validate prices
    if (!Number.isFinite(fromUSD) || fromUSD <= 0 || isNaN(fromUSD)) {
      return { rate: 0, fallback: true, message: `Invalid price for ${fromSymbol}` };
    }
    if (!Number.isFinite(toUSD) || toUSD <= 0 || isNaN(toUSD)) {
      return { rate: 0, fallback: true, message: `Invalid price for ${toSymbol}` };
    }

    const rate = fromUSD / toUSD;

    // Final validation
    if (!Number.isFinite(rate) || isNaN(rate) || rate <= 0 || rate > 1e10) {
      return { rate: 0, fallback: true, message: 'Invalid rate calculation' };
    }

    const isFallback = fromPrice.source === 'fallback' || toPrice.source === 'fallback';

    return {
      rate,
      fallback: isFallback,
      message: isFallback ? 'Using last known price' : 'Live rate',
    };

  } catch (error) {
    console.error(`Exchange rate error for ${fromSymbol}/${toSymbol}:`, error);

    // Try to get any cached value
    const fromCached = getCachedPrice(fromSymbol);
    const toCached = getCachedPrice(toSymbol);

    if (fromCached !== null && toCached !== null) {
      const rate = fromCached / toCached;
      if (Number.isFinite(rate) && rate > 0) {
        return {
          rate,
          fallback: true,
          message: 'Using last known price',
        };
      }
    }

    // Last resort - return 0, let frontend handle display
    return {
      rate: 0,
      fallback: true,
      message: 'Price unavailable',
    };
  }
}

/**
 * Applies platform margin to the price
 */
export function applyMargin(price: number, margin: number = 0.018): number {
  if (!Number.isFinite(price) || price <= 0 || isNaN(price)) {
    return 0;
  }
  return price * (1 - margin);
}

/**
 * Get all cached prices for debugging
 */
export function getCacheStatus(): { size: number; coins: Record<string, { price: number; age: number; fresh: boolean }> } {
  const coins: Record<string, { price: number; age: number; fresh: boolean }> = {};
  for (const [symbol, data] of priceCache.entries()) {
    const age = Math.round((Date.now() - data.timestamp) / 1000);
    coins[symbol] = {
      price: data.price,
      age,
      fresh: Date.now() - data.timestamp < CACHE_DURATION,
    };
  }
  return { size: priceCache.size, coins };
}
