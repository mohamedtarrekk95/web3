import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { adminRateLimiter } from '@/lib/rateLimit';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function extractToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  // Check admin_token first (set by admin login), then auth_token (user login)
  const adminMatch = cookieHeader.match(/admin_token=([^;]+)/);
  if (adminMatch) return adminMatch[1];

  const authMatch = cookieHeader.match(/auth_token=([^;]+)/);
  if (authMatch) return authMatch[1];

  return null;
}

function verifyToken(request: Request) {
  const token = extractToken(request);
  if (!token) throw new Error('Unauthorized');

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
