const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache: Map<string, PriceCache> = new Map();
const CACHE_DURATION = 5000; // 5 seconds

export async function getBinancePrice(symbol: string): Promise<number> {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    const response = await fetch(`${BINANCE_API}?symbol=${cacheKey}`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    const data = await response.json();
    const price = parseFloat(data.price);

    priceCache.set(cacheKey, { price, timestamp: Date.now() });
    return price;
  } catch (error) {
    const cached = priceCache.get(cacheKey);
    if (cached) {
      return cached.price;
    }
    throw error;
  }
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  const fromSymbol = from.toUpperCase();
  const toSymbol = to.toUpperCase();

  // Direct pair (e.g., BTCETH)
  try {
    return await getBinancePrice(`${fromSymbol}${toSymbol}`);
  } catch {
    // Try reverse pair (e.g., ETHBTC)
    try {
      const reversePrice = await getBinancePrice(`${toSymbol}${fromSymbol}`);
      return 1 / reversePrice;
    } catch {
      // Try USDT as intermediate
      try {
        const fromUsdt = await getBinancePrice(`${fromSymbol}USDT`);
        const toUsdt = await getBinancePrice(`${toSymbol}USDT`);
        return fromUsdt / toUsdt;
      } catch {
        throw new Error(`Cannot get price for ${fromSymbol}/${toSymbol}`);
      }
    }
  }
}

export function applyMargin(price: number, margin: number = 0.018): number {
  return price * (1 - margin);
}
