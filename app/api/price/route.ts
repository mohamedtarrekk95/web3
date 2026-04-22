import { NextResponse } from 'next/server';
import { getExchangeRate, applyMargin, isSupportedCoin, getSupportedCoins } from '@/lib/binance';
import { apiRateLimiter } from '@/lib/rateLimit';

const MARGIN = 0.018;

export async function GET(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = apiRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = parseFloat(searchParams.get('amount') || '1');

    // Validate required params
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing "from" or "to" parameter' },
        { status: 400 }
      );
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Pre-validate coin symbols
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    if (!isSupportedCoin(fromUpper)) {
      return NextResponse.json(
        {
          error: `Unsupported cryptocurrency: ${fromUpper}`,
          supportedCoins: getSupportedCoins(),
        },
        { status: 400 }
      );
    }

    if (!isSupportedCoin(toUpper)) {
      return NextResponse.json(
        {
          error: `Unsupported cryptocurrency: ${toUpper}`,
          supportedCoins: getSupportedCoins(),
        },
        { status: 400 }
      );
    }

    // Same coin check
    if (fromUpper === toUpper) {
      return NextResponse.json({
        from,
        to,
        amount,
        rate: applyMargin(1, MARGIN),
        marketRate: 1,
        total: applyMargin(1, MARGIN) * amount,
        margin: MARGIN * 100,
        validUntil: Date.now() + 60000,
      });
    }

    // Get exchange rate (now uses USDT-only pairs)
    const rate = await getExchangeRate(fromUpper, toUpper);
    const rateWithMargin = applyMargin(rate, MARGIN);
    const total = rateWithMargin * amount;

    // Final validation before responding
    if (!Number.isFinite(rate) || !Number.isFinite(total)) {
      return NextResponse.json(
        { error: 'Invalid price calculation' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        from,
        to,
        amount,
        rate: rateWithMargin,
        marketRate: rate,
        total,
        margin: MARGIN * 100,
        validUntil: Date.now() + 60000,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    );

  } catch (error) {
    console.error('Price API error:', error);

    // Return 500 only for truly unexpected errors
    // Known errors (unsupported coin, etc.) are handled above
    return NextResponse.json(
      { error: 'Price service temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
