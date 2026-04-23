import { NextResponse } from 'next/server';
import { getExchangeRate, applyMargin, getSupportedCoins, isSupportedCoin } from '@/lib/pricing';
import { apiRateLimiter } from '@/lib/rateLimit';

const MARGIN = 0.018;

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = apiRateLimiter(ip);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests', supportedCoins: getSupportedCoins() },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = parseFloat(searchParams.get('amount') || '1');

    // Missing params
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing "from" or "to" parameter', supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    // Invalid amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const fromSymbol = from.toUpperCase().trim();
    const toSymbol = to.toUpperCase().trim();

    // Invalid symbol check
    if (!isSupportedCoin(fromSymbol)) {
      return NextResponse.json(
        { error: `Unsupported: ${fromSymbol}`, supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    if (!isSupportedCoin(toSymbol)) {
      return NextResponse.json(
        { error: `Unsupported: ${toSymbol}`, supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    // Same coin - instant 1:1
    if (fromSymbol === toSymbol) {
      const rate = applyMargin(1, MARGIN);
      return NextResponse.json({
        from: fromSymbol,
        to: toSymbol,
        amount,
        rate,
        marketRate: 1,
        total: rate * amount,
        margin: MARGIN * 100,
        validUntil: Date.now() + 60000,
        fallback: false,
      });
    }

    // Get exchange rate from CoinGecko
    const result = await getExchangeRate(fromSymbol, toSymbol);
    const { rate, fallback, message } = result;

    // Handle zero/invalid rates - return error but with 200 status
    if (rate <= 0 || !Number.isFinite(rate)) {
      return NextResponse.json({
        from: fromSymbol,
        to: toSymbol,
        amount,
        rate: 0,
        marketRate: 0,
        total: 0,
        margin: MARGIN * 100,
        validUntil: Date.now() + 60000,
        error: message || 'Price temporarily unavailable',
        fallback: true,
        supportedCoins: getSupportedCoins(),
      });
    }

    const rateWithMargin = applyMargin(rate, MARGIN);
    const total = rateWithMargin * amount;

    // Final validation
    if (!Number.isFinite(rateWithMargin) || !Number.isFinite(total)) {
      return NextResponse.json({
        from: fromSymbol,
        to: toSymbol,
        amount,
        rate: 0,
        marketRate: 0,
        total: 0,
        margin: MARGIN * 100,
        validUntil: Date.now() + 60000,
        error: 'Price calculation failed',
        fallback: true,
        supportedCoins: getSupportedCoins(),
      });
    }

    return NextResponse.json({
      from: fromSymbol,
      to: toSymbol,
      amount,
      rate: rateWithMargin,
      marketRate: rate,
      total,
      margin: MARGIN * 100,
      validUntil: Date.now() + 60000,
      fallback,
      message,
    });

  } catch (error) {
    console.error('Price API error:', error);

    // Always return 200 with fallback info - never crash
    return NextResponse.json(
      {
        error: 'Price service temporarily unavailable',
        fallback: true,
        supportedCoins: getSupportedCoins(),
      },
      { status: 200 }
    );
  }
}
