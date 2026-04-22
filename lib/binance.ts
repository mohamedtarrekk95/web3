const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';

// Whitelist of supported coins that have USDT trading pairs on Binance
const SUPPORTED_COINS = new Set([
  'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE',
  'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'UNI', 'ATOM',
  'XLM', 'ALGO', 'VET', 'FIL', 'THETA', 'AAVE', 'EOS',
  'TRX', 'XTZ', 'CAKE', 'DASH', 'MKR', 'COMP', 'SNX',
]);

interface PriceResult {
  price: number;
  symbol: string;
}

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache: Map<string, PriceCache> = new Map();
const CACHE_DURATION = 5000; // 5 seconds
const MAX_RETRIES = 2;

export function isSupportedCoin(symbol: string): boolean {
  return SUPPORTED_COINS.has(symbol.toUpperCase());
}

export function getSupportedCoins(): string[] {
  return Array.from(SUPPORTED_COINS);
}

/**
 * Fetches price from Binance API with retry logic and cache fallback
 */
export async function getBinancePrice(symbol: string): Promise<PriceResult> {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);

  // Return cached price if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { price: cached.price, symbol: cacheKey };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BINANCE_API}?symbol=${cacheKey}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // Try to use stale cache on HTTP error
        if (cached) {
          return { price: cached.price, symbol: cacheKey };
        }
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data.price === 'undefined') {
        throw new Error('Invalid API response structure');
      }

      const price = parseFloat(data.price);

      // Validate parsed price
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid price value: ${data.price}`);
      }

      // Cache valid price
      priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return { price, symbol: cacheKey };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we have a cached value, return it on any attempt after the first
      if (cached && attempt > 0) {
        return { price: cached.price, symbol: cacheKey };
      }
    }
  }

  // If all retries failed but we have stale cache, return it
  if (cached) {
    return { price: cached.price, symbol: cacheKey };
  }

  throw lastError || new Error(`Failed to fetch price for ${cacheKey}`);
}

/**
 * Calculates exchange rate using ONLY USDT as intermediate currency.
 * This ensures all trading pairs work by going: FROM -> USDT -> TO
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Same coin - return 1
  if (fromSymbol === toSymbol) {
    return 1;
  }

  // Both must be supported
  if (!isSupportedCoin(fromSymbol)) {
    throw new Error(`Unsupported coin: ${fromSymbol}`);
  }
  if (!isSupportedCoin(toSymbol)) {
    throw new Error(`Unsupported coin: ${toSymbol}`);
  }

  try {
    // Get USDT prices for both coins
    const [fromResult, toResult] = await Promise.all([
      getBinancePrice(`${fromSymbol}USDT`),
      getBinancePrice(`${toSymbol}USDT`),
    ]);

    const { price: fromUSDT, symbol: fromSym } = fromResult;
    const { price: toUSDT, symbol: toSym } = toResult;

    // Prevent division by zero and invalid results
    if (!Number.isFinite(fromUSDT) || fromUSDT <= 0) {
      throw new Error(`Invalid USDT price for ${fromSym}`);
    }
    if (!Number.isFinite(toUSDT) || toUSDT <= 0) {
      throw new Error(`Invalid USDT price for ${toSym}`);
    }

    const rate = fromUSDT / toUSDT;

    // Final validation
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1e10) {
      throw new Error(`Calculated invalid rate: ${rate}`);
    }

    return rate;

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported coin')) {
      throw error;
    }
    throw new Error(`Exchange rate unavailable for ${fromSymbol}/${toSymbol}`);
  }
}

/**
 * Applies platform margin to the price
 */
export function applyMargin(price: number, margin: number = 0.018): number {
  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }
  return price * (1 - margin);
}
