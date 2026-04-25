import { NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rateLimit';

// 1inch API base URL (public, no API key required)
const INCH_API = 'https://api.1inch.dev/swap/v6.0';
const PLATFORM_FEE_PERCENT = 0.003; // 0.3% platform fee
const PLATFORM_WALLET = '0xe88E1F6D128f09584cF9E9147512DA6f116b365A';

// Token addresses for supported coins (mainnet)
const TOKEN_ADDRESSES: Record<string, string> = {
  BTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2d999', // WBTC on Ethereum
  ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  BNB: '0xb8c77482e45f1f44de174bf260c1c16f7f8bae24',
  SOL: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Use wrapped SOL
  XRP: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  ADA: '0x3ee2200efb3400fabb9aac8c3137a1fc5db9d5e8',
  DOGE: '0xba2ae424d960c26247dd6d32f250d7c7b22e1d31',
  AVAX: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  MATIC: '0x7d1afa7b718fb893db30a3a0c0a5d5f428bb3ef4',
  DOT: '0xe1da2f13dad48d4729382a0c7fb87118b77b2ae0',
  LTC: '0x4338665cbb7b2485a8855a139b84d4e167c6da05',
  TRX: '0x86b0493f318bb5c3d3e1e72c1b0c6d7a1de07f8b',
  BCH: '0x07fab36b94fe09b2c039c3d5cddb4b5c3d1e72c2',
  LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
  UNI: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
};

// Coin decimals mapping
const TOKEN_DECIMALS: Record<string, number> = {
  BTC: 8,
  ETH: 18,
  USDT: 6,
  BNB: 18,
  SOL: 9,
  XRP: 6,
  ADA: 18,
  DOGE: 8,
  AVAX: 18,
  MATIC: 18,
  DOT: 18,
  LTC: 8,
  TRX: 6,
  BCH: 8,
  LINK: 18,
  UNI: 18,
};

const NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const USDT_ADDRESS = TOKEN_ADDRESSES.USDT;

interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: number;
  marketRate: number;
  priceImpact: number;
  guaranteedPrice: string;
  routes: Array<{ protocol: string; part: number; name: string }>;
  estimatedGas: string;
  gasUsd: number;
  platformFee: number;
  platformFeePercent: number;
  platformFeeWallet: string;
  minimumReceived: string;
  validUntil: number;
  aggregator: string;
}

async function getTokenPrice(symbol: string): Promise<number> {
  // Use CoinGecko for USD prices
  const coinIds: Record<string, string> = {
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

  const coinId = coinIds[symbol];
  if (!coinId) return 0;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = await response.json();
      return data[coinId]?.usd || 0;
    }
  } catch (error) {
    console.warn(`Price fetch failed for ${symbol}:`, error);
  }
  return 0;
}

async function getSwapQuote(
  fromSymbol: string,
  toSymbol: string,
  amount: string
): Promise<SwapQuote | null> {
  const fromAddress = TOKEN_ADDRESSES[fromSymbol] || NATIVE_ADDRESS;
  const toAddress = TOKEN_ADDRESSES[toSymbol] || NATIVE_ADDRESS;
  const decimals = TOKEN_DECIMALS[fromSymbol] || 18;
  const amountWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

  // 1inch quote endpoint
  const url = `${INCH_API}/quote/${fromAddress}/${toAddress}/${amountWei}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`1inch API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Parse response
    const toAmountDecimals = TOKEN_DECIMALS[toSymbol] || 18;
    const toAmountOriginal = parseFloat(data.toAmount || '0') / Math.pow(10, toAmountDecimals);

    return {
      fromToken: fromSymbol,
      toToken: toSymbol,
      fromAmount: amount,
      toAmount: toAmountOriginal.toFixed(8),
      rate: parseFloat(data.toAmount || '0') / Math.pow(10, toAmountDecimals) / parseFloat(amount),
      marketRate: 0, // Will be filled from price feed
      priceImpact: data.priceImpact || 0,
      guaranteedPrice: toAmountOriginal.toFixed(8),
      routes: (data.route || []).map((r: { name: string; part: number }) => ({
        protocol: r.name || 'Unknown',
        part: r.part || 0,
        name: r.name || 'Unknown Protocol',
      })),
      estimatedGas: data.estimatedGas || '0',
      gasUsd: 0, // Will be calculated
      platformFee: toAmountOriginal * PLATFORM_FEE_PERCENT,
      platformFeePercent: PLATFORM_FEE_PERCENT * 100,
      platformFeeWallet: PLATFORM_WALLET,
      minimumReceived: toAmountOriginal.toFixed(8),
      validUntil: Date.now() + 30000, // 30 seconds
      aggregator: '1inch',
    };
  } catch (error) {
    console.warn(`1inch quote failed:`, error);
    return null;
  }
}

// Fallback: calculate quote using CoinGecko prices
async function getFallbackQuote(
  fromSymbol: string,
  toSymbol: string,
  amount: string
): Promise<SwapQuote | null> {
  if (fromSymbol === toSymbol) {
    return {
      fromToken: fromSymbol,
      toToken: toSymbol,
      fromAmount: amount,
      toAmount: amount,
      rate: 1,
      marketRate: 1,
      priceImpact: 0,
      guaranteedPrice: amount,
      routes: [],
      estimatedGas: '0',
      gasUsd: 0,
      platformFee: 0,
      platformFeePercent: PLATFORM_FEE_PERCENT * 100,
      platformFeeWallet: PLATFORM_WALLET,
      minimumReceived: amount,
      validUntil: Date.now() + 30000,
      aggregator: 'price_feed',
    };
  }

  try {
    const [fromPrice, toPrice] = await Promise.all([
      getTokenPrice(fromSymbol),
      getTokenPrice(toSymbol),
    ]);

    if (fromPrice <= 0 || toPrice <= 0) {
      return null;
    }

    const marketRate = fromPrice / toPrice;
    const rateWithFee = marketRate * (1 - PLATFORM_FEE_PERCENT);
    const toAmount = parseFloat(amount) * rateWithFee;

    return {
      fromToken: fromSymbol,
      toToken: toSymbol,
      fromAmount: amount,
      toAmount: toAmount.toFixed(8),
      rate: rateWithFee,
      marketRate,
      priceImpact: 0,
      guaranteedPrice: toAmount.toFixed(8),
      routes: [
        { protocol: 'CoinGecko', part: 100, name: 'CoinGecko Price Feed' },
      ],
      estimatedGas: '0',
      gasUsd: 0,
      platformFee: toAmount * PLATFORM_FEE_PERCENT,
      platformFeePercent: PLATFORM_FEE_PERCENT * 100,
      platformFeeWallet: PLATFORM_WALLET,
      minimumReceived: (toAmount * 0.99).toFixed(8), // 1% slippage protection
      validUntil: Date.now() + 30000,
      aggregator: 'price_feed',
    };
  } catch (error) {
    console.error('Fallback quote failed:', error);
    return null;
  }
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = apiRateLimiter(ip);

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from or to parameter' }, { status: 400 });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const fromSymbol = from.toUpperCase().trim();
    const toSymbol = to.toUpperCase().trim();

    // Validate symbols
    if (!TOKEN_ADDRESSES[fromSymbol] && fromSymbol !== 'ETH') {
      return NextResponse.json({ error: `Unsupported token: ${fromSymbol}` }, { status: 400 });
    }

    if (!TOKEN_ADDRESSES[toSymbol] && toSymbol !== 'ETH') {
      return NextResponse.json({ error: `Unsupported token: ${toSymbol}` }, { status: 400 });
    }

    // Try 1inch first, fallback to price feed
    let quote = await getSwapQuote(fromSymbol, toSymbol, amount);

    if (!quote) {
      quote = await getFallbackQuote(fromSymbol, toSymbol, amount);
    }

    if (!quote) {
      return NextResponse.json(
        { error: 'Failed to get quote. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Swap quote API error:', error);
    return NextResponse.json(
      { error: 'Quote service temporarily unavailable' },
      { status: 200 }
    );
  }
}
