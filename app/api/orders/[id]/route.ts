import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { apiRateLimiter } from '@/lib/rateLimit';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    if (!id || id.length < 8) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findOne({ orderId: id });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user is admin to include adminNote
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'admin';

    const response: Record<string, any> = {
      orderId: order.orderId,
      type: order.type,
      fromCoin: order.fromCoin,
      toCoin: order.toCoin,
      amountSent: order.amountSent,
      amountReceived: order.amountReceived,
      walletAddress: order.walletAddress,
      receivingAddress: order.receivingAddress || '',
      status: order.status,
      paymentMethod: order.paymentMethod || '',
      telegramUsername: order.telegramUsername || '',
      txid: order.txid || '',
      createdAt: order.createdAt,
    };

    // Only include adminNote for admin users
    if (isAdmin) {
      response.adminNote = order.adminNote || '';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}