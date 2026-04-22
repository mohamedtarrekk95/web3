import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Wallet from '@/lib/models/Wallet';
import { v4 as uuidv4 } from 'uuid';
import { orderRateLimiter } from '@/lib/rateLimit';

export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = orderRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();
    const { fromCoin, toCoin, amountSent, amountReceived } = body;

    if (!fromCoin || !toCoin || !amountSent || !amountReceived) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amounts are positive numbers
    if (typeof amountSent !== 'number' || typeof amountReceived !== 'number' ||
        amountSent <= 0 || amountReceived <= 0) {
      return NextResponse.json({ error: 'Invalid amounts' }, { status: 400 });
    }

    const wallet = await Wallet.findOne({ coinSymbol: fromCoin.toUpperCase() });
    const walletAddress = wallet?.address || 'Pending';

    const order = new Order({
      orderId: uuidv4(),
      fromCoin: fromCoin.toUpperCase(),
      toCoin: toCoin.toUpperCase(),
      amountSent,
      amountReceived,
      walletAddress,
      status: 'pending',
    });

    await order.save();

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
