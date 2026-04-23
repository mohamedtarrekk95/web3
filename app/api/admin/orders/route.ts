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
  console.log('[Admin Orders] Cookie header received:', cookieHeader?.substring(0, 50) + '...');

  if (!cookieHeader) return null;

  const adminMatch = cookieHeader.match(/admin_token=([^;]+)/);
  if (adminMatch) {
    console.log('[Admin Orders] Found admin_token');
    return adminMatch[1];
  }

  const authMatch = cookieHeader.match(/auth_token=([^;]+)/);
  if (authMatch) {
    console.log('[Admin Orders] Found auth_token');
    return authMatch[1];
  }

  console.log('[Admin Orders] No token found in cookies');
  return null;
}

function verifyToken(request: Request) {
  const token = extractToken(request);
  if (!token) throw new Error('Unauthorized - No token');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string; username?: string; role: string };
    console.log('[Admin Orders] JWT decoded:', JSON.stringify(decoded));
    console.log('[Admin Orders] Role:', decoded.role);
    return decoded;
  } catch (err) {
    console.log('[Admin Orders] JWT verify failed:', err);
    throw new Error('Unauthorized - Invalid token');
  }
}

export async function GET(request: Request) {
  console.log('[Admin Orders] GET request received');

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = adminRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const decoded = verifyToken(request);
    console.log('[Admin Orders] Token verified, role:', decoded.role);

    if (decoded.role !== 'admin') {
      console.log('[Admin Orders] ACCESS DENIED - role is not admin:', decoded.role);
      return NextResponse.json({ error: 'Forbidden - Not an admin' }, { status: 403 });
    }

    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log('[Admin Orders] Found', orders.length, 'orders');
    return NextResponse.json(orders);
  } catch (error: any) {
    console.log('[Admin Orders] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}