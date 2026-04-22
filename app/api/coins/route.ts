import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coin from '@/lib/models/Coin';
import { apiRateLimiter } from '@/lib/rateLimit';

const DEFAULT_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { symbol: 'BNB', name: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { symbol: 'XRP', name: 'Ripple', icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { symbol: 'ADA', name: 'Cardano', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { symbol: 'DOT', name: 'Polkadot', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { symbol: 'MATIC', name: 'Polygon', icon: 'https://cryptologos.cc/logos/matic-polygon-logo.png' },
  { symbol: 'LTC', name: 'Litecoin', icon: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
];

export async function GET(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = apiRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    let coins = await Coin.find({ isActive: true }).sort({ symbol: 1 });

    if (coins.length === 0) {
      await Coin.insertMany(DEFAULT_COINS);
      coins = await Coin.find({ isActive: true }).sort({ symbol: 1 });
    }

    return NextResponse.json(coins);
  } catch (error) {
    console.error('Coins API error:', error);
    return NextResponse.json({ error: 'Failed to fetch coins' }, { status: 500 });
  }
}
