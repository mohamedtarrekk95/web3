import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Wallet from '@/lib/models/Wallet';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { orderRateLimiter } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = orderRateLimiter(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { fromCoin, toCoin, amountSent, amountReceived } = body;

    if (!fromCoin || !toCoin || !amountSent || !amountReceived) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof amountSent !== 'number' || typeof amountReceived !== 'number' ||
        amountSent <= 0 || amountReceived <= 0) {
      return NextResponse.json({ error: 'Invalid amounts' }, { status: 400 });
    }

    const wallet = await Wallet.findOne({ symbol: fromCoin.toUpperCase() });
    const walletAddress = wallet?.address || 'Pending';

    const order = new Order({
      orderId: uuidv4(),
      userId: new mongoose.Types.ObjectId(user.userId),
      fromCoin: fromCoin.toUpperCase(),
      toCoin: toCoin.toUpperCase(),
      amountSent,
      amountReceived,
      walletAddress,
      status: 'pending',
    });

    await order.save();

    return NextResponse.json({
      orderId: order.orderId,
      fromCoin: order.fromCoin,
      toCoin: order.toCoin,
      amountSent: order.amountSent,
      amountReceived: order.amountReceived,
      walletAddress: order.walletAddress,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const orders = await Order.find({ userId: new mongoose.Types.ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({
      orders: orders.map((o) => ({
        orderId: o.orderId,
        fromCoin: o.fromCoin,
        toCoin: o.toCoin,
        amountSent: o.amountSent,
        amountReceived: o.amountReceived,
        walletAddress: o.walletAddress,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
