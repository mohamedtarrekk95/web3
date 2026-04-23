import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { adminRateLimiter } from '@/lib/rateLimit';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function verifyToken(request: Request) {
  // Read from cookie instead of Authorization header (frontend uses credentials: 'include')
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) throw new Error('Unauthorized');

  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) throw new Error('Unauthorized');

  const token = match[1];
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = adminRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    verifyToken(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: id },
      { status },
      { new: true }
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
