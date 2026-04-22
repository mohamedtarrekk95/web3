import { NextResponse } from 'next/server';
import { getExchangeRate, applyMargin, isSupportedCoin, getSupportedCoins, validateSymbol } from '@/lib/binance';
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

    // Validate required params exist
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing "from" or "to" parameter', supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Normalize and validate coin symbols against whitelist
    const fromValidation = validateSymbol(from);
    if (!fromValidation.valid) {
      return NextResponse.json(
        { error: fromValidation.error, supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    const toValidation = validateSymbol(to);
    if (!toValidation.valid) {
      return NextResponse.json(
        { error: toValidation.error, supportedCoins: getSupportedCoins() },
        { status: 400 }
      );
    }

    const fromSymbol = fromValidation.symbol;
    const toSymbol = toValidation.symbol;

    // Same coin - return 1:1 rate
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
      });
    }

    // Get exchange rate using USDT intermediate
    const rate = await getExchangeRate(fromSymbol, toSymbol);
    const rateWithMargin = applyMargin(rate, MARGIN);
    const total = rateWithMargin * amount;

    // Validate final calculation
    if (!Number.isFinite(rate) || !Number.isFinite(total) || isNaN(rate) || isNaN(total)) {
      return NextResponse.json(
        { error: 'Price calculation failed. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        from: fromSymbol,
        to: toSymbol,
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

    // Return 503 for service errors with clear message
    return NextResponse.json(
      { error: 'Price service temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    );
  }
}
