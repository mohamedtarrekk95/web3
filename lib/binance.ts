const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';

// Top 15 supported cryptocurrencies with USDT trading pairs on Binance
const SUPPORTED_COINS = new Set([
  'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE',
  'AVAX', 'MATIC', 'DOT', 'LTC', 'TRX', 'BCH', 'LINK', 'UNI',
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
  return Array.from(SUPPORTED_COINS).sort();
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
      if (!data || typeof data.price === 'undefined' || data.price === null) {
        throw new Error('Invalid API response structure');
      }

      const price = parseFloat(data.price);

      // Validate parsed price
      if (!Number.isFinite(price) || price <= 0 || isNaN(price)) {
        throw new Error(`Invalid price value for ${cacheKey}`);
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
 * Rate = (FROM/USDT) / (TO/USDT)
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Same coin - return 1
  if (fromSymbol === toSymbol) {
    return 1;
  }

  // Validate both coins
  const fromValidation = validateSymbol(fromSymbol);
  if (!fromValidation.valid) {
    throw new Error(fromValidation.error);
  }

  const toValidation = validateSymbol(toSymbol);
  if (!toValidation.valid) {
    throw new Error(toValidation.error);
  }

  try {
    // Fetch both USDT prices in parallel
    const [fromResult, toResult] = await Promise.all([
      getBinancePrice(`${fromSymbol}USDT`),
      getBinancePrice(`${toSymbol}USDT`),
    ]);

    const { price: fromUSDT } = fromResult;
    const { price: toUSDT } = toResult;

    // Validate prices before division
    if (!Number.isFinite(fromUSDT) || fromUSDT <= 0 || isNaN(fromUSDT)) {
      throw new Error(`Invalid USDT price for ${fromSymbol}`);
    }
    if (!Number.isFinite(toUSDT) || toUSDT <= 0 || isNaN(toUSDT)) {
      throw new Error(`Invalid USDT price for ${toSymbol}`);
    }

    const rate = fromUSDT / toUSDT;

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
      if (error.message.includes('Invalid')) {
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
