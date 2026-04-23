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

export async function GET(request: Request) {
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
    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
