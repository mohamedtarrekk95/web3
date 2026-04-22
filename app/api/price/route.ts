import { NextResponse } from 'next/server';
import { getExchangeRate, applyMargin } from '@/lib/binance';
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

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from or to parameters' }, { status: 400 });
    }

    const rate = await getExchangeRate(from, to);
    const rateWithMargin = applyMargin(rate, MARGIN);
    const total = rateWithMargin * amount;

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
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
