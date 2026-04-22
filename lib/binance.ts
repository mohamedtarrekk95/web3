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

// Reverse mapping (CoinGecko ID to symbol)
const ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_ID).map(([k, v]) => [v, k])
);

// Supported coins (our internal symbols)
const SUPPORTED_COINS = new Set(Object.keys(SYMBOL_TO_ID));

interface PriceResult {
  price: number;
  symbol: string;
  id: string;
}

interface PriceCache {
  price: number;
  timestamp: number;
}

interface CoinGeckoPriceData {
  [coinId: string]: {
    usd: number;
  };
}

const priceCache: Map<string, PriceCache> = new Map();
const CACHE_DURATION = 10000; // 10 seconds
const MAX_RETRIES = 2;

export function isSupportedCoin(symbol: string): boolean {
  return SUPPORTED_COINS.has(symbol.toUpperCase());
}

export function getSupportedCoins(): string[] {
  return Array.from(SUPPORTED_COINS).sort();
}

/**
 * Get CoinGecko ID from our internal symbol
 */
export function getCoinGeckoId(symbol: string): string | null {
  return SYMBOL_TO_ID[symbol.toUpperCase()] || null;
}

/**
 * Validates that a symbol exists in our whitelist
 */
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
 * Fetches price from CoinGecko API with retry logic and cache fallback
 */
export async function getCoinGeckoPrice(symbol: string): Promise<PriceResult> {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);

  // Return cached price if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { price: cached.price, symbol: cacheKey, id: SYMBOL_TO_ID[cacheKey] };
  }

  const coinId = SYMBOL_TO_ID[cacheKey];
  if (!coinId) {
    throw new Error(`Unknown symbol: ${cacheKey}`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        if (cached) {
          return { price: cached.price, symbol: cacheKey, id: coinId };
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPriceData = await response.json();

      // Validate response structure
      if (!data || !data[coinId] || typeof data[coinId].usd === 'undefined') {
        throw new Error(`Invalid response for ${coinId}`);
      }

      const price = data[coinId].usd;

      // Validate parsed price
      if (!Number.isFinite(price) || price <= 0 || isNaN(price)) {
        throw new Error(`Invalid price value for ${coinId}: ${price}`);
      }

      // Cache valid price
      priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return { price, symbol: cacheKey, id: coinId };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Use stale cache on retry attempts
      if (cached && attempt > 0) {
        return { price: cached.price, symbol: cacheKey, id: coinId };
      }
    }
  }

  // Last resort: return stale cache if available
  if (cached) {
    return { price: cached.price, symbol: cacheKey, id: coinId };
  }

  throw lastError || new Error(`Failed to fetch price for ${cacheKey}`);
}

/**
 * Calculates exchange rate using CoinGecko USD prices.
 * Rate = fromPrice / toPrice (both in USD)
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Same coin - return 1
  if (fromSymbol === toSymbol) {
    return 1;
  }

  // Validate both coins upfront
  const fromValidation = validateSymbol(fromSymbol);
  if (!fromValidation.valid) {
    throw new Error(fromValidation.error);
  }

  const toValidation = validateSymbol(toSymbol);
  if (!toValidation.valid) {
    throw new Error(toValidation.error);
  }

  try {
    // Fetch both prices in parallel from CoinGecko
    const [fromResult, toResult] = await Promise.all([
      getCoinGeckoPrice(fromSymbol),
      getCoinGeckoPrice(toSymbol),
    ]);

    const { price: fromPrice } = fromResult;
    const { price: toPrice } = toResult;

    // Validate prices before division
    if (!Number.isFinite(fromPrice) || fromPrice <= 0 || isNaN(fromPrice)) {
      throw new Error(`Invalid USD price for ${fromSymbol}`);
    }
    if (!Number.isFinite(toPrice) || toPrice <= 0 || isNaN(toPrice)) {
      throw new Error(`Invalid USD price for ${toSymbol}`);
    }

    const rate = fromPrice / toPrice;

    // Final validation of calculated rate
    if (!Number.isFinite(rate) || isNaN(rate) || rate <= 0 || rate > 1e10) {
      throw new Error(`Invalid exchange rate calculated: ${rate}`);
    }

    return rate;

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unsupported')) {
        throw error;
      }
      if (error.message.includes('Invalid') || error.message.includes('Failed')) {
        throw error;
      }
    }
    throw new Error(`Exchange rate unavailable for ${fromSymbol}/${toSymbol}`);
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
 * Get current cache status (for debugging)
 */
export function getCacheStatus(): { size: number; entries: string[] } {
  const entries: string[] = [];
  for (const [symbol, data] of priceCache.entries()) {
    const age = Date.now() - data.timestamp;
    entries.push(`${symbol}: ${data.price.toFixed(2)} (${Math.round(age / 1000)}s ago)`);
  }
  return { size: priceCache.size, entries };
}
