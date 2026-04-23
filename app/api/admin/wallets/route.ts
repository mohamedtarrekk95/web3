import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Wallet from '@/lib/models/Wallet';
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
    const wallets = await Wallet.find().sort({ coinSymbol: 1 });
    return NextResponse.json(wallets);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const { coinSymbol, address, qrCodeUrl } = body;

    if (!coinSymbol || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate coin symbol format
    if (!/^[A-Z]{2,10}$/.test(coinSymbol.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid coin symbol format' }, { status: 400 });
    }

    // Validate address is not obviously fake (basic check)
    if (address.length < 20 || address.length > 200) {
      return NextResponse.json({ error: 'Invalid wallet address length' }, { status: 400 });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { coinSymbol: coinSymbol.toUpperCase() },
      { coinSymbol: coinSymbol.toUpperCase(), address, qrCodeUrl: qrCodeUrl || '' },
      { upsert: true, new: true }
    );

    return NextResponse.json(wallet);
  } catch (error) {
    console.error('Wallet save error:', error);
    return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 });
  }
}
