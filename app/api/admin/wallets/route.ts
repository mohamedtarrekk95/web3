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
  console.log('[Admin Wallets] Cookie header received:', cookieHeader?.substring(0, 50) + '...');

  if (!cookieHeader) return null;

  const adminMatch = cookieHeader.match(/admin_token=([^;]+)/);
  if (adminMatch) {
    console.log('[Admin Wallets] Found admin_token');
    return adminMatch[1];
  }

  const authMatch = cookieHeader.match(/auth_token=([^;]+)/);
  if (authMatch) {
    console.log('[Admin Wallets] Found auth_token');
    return authMatch[1];
  }

  console.log('[Admin Wallets] No token found in cookies');
  return null;
}

function verifyToken(request: Request) {
  const token = extractToken(request);
  if (!token) throw new Error('Unauthorized - No token');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string; username?: string; role: string };
    console.log('[Admin Wallets] JWT decoded:', JSON.stringify(decoded));
    console.log('[Admin Wallets] Role:', decoded.role);
    return decoded;
  } catch (err) {
    console.log('[Admin Wallets] JWT verify failed:', err);
    throw new Error('Unauthorized - Invalid token');
  }
}

export async function GET(request: Request) {
  console.log('[Admin Wallets] GET request received');

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
    console.log('[Admin Wallets] Token verified, role:', decoded.role);

    if (decoded.role !== 'admin') {
      console.log('[Admin Wallets] ACCESS DENIED - role is not admin:', decoded.role);
      return NextResponse.json({ error: 'Forbidden - Not an admin' }, { status: 403 });
    }

    await connectDB();
    const wallets = await Wallet.find().sort({ coinSymbol: 1 });
    console.log('[Admin Wallets] Found', wallets.length, 'wallets');
    return NextResponse.json(wallets);
  } catch (error: any) {
    console.log('[Admin Wallets] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  console.log('[Admin Wallets] POST request received');

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
    console.log('[Admin Wallets] Token verified, role:', decoded.role);

    if (decoded.role !== 'admin') {
      console.log('[Admin Wallets] ACCESS DENIED - role is not admin:', decoded.role);
      return NextResponse.json({ error: 'Forbidden - Not an admin' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    console.log('[Admin Wallets] Request body:', JSON.stringify(body));

    // Support both field names: qrCodeUrl or qrCodeImageUrl
    let { coinSymbol, address, qrCodeUrl } = body;
    if (!qrCodeUrl && body.qrCodeImageUrl) {
      qrCodeUrl = body.qrCodeImageUrl;
    }

    console.log('[Admin Wallets] Parsed - coinSymbol:', coinSymbol, 'address:', address, 'qrCodeUrl:', qrCodeUrl);

    if (!coinSymbol || !address) {
      console.log('[Admin Wallets] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields: coinSymbol and address' }, { status: 400 });
    }

    // Validate coin symbol format
    if (!/^[A-Z]{2,10}$/.test(coinSymbol.toUpperCase())) {
      console.log('[Admin Wallets] Invalid coin symbol:', coinSymbol);
      return NextResponse.json({ error: 'Invalid coin symbol format' }, { status: 400 });
    }

    // Validate address length (basic check)
    const addrStr = String(address || '').trim();
    if (addrStr.length < 5 || addrStr.length > 200) {
      console.log('[Admin Wallets] Invalid address length:', addrStr.length);
      return NextResponse.json({ error: 'Invalid wallet address length' }, { status: 400 });
    }

    console.log('[Admin Wallets] Saving wallet for:', coinSymbol.toUpperCase());

    const wallet = await Wallet.findOneAndUpdate(
      { coinSymbol: coinSymbol.toUpperCase() },
      {
        coinSymbol: coinSymbol.toUpperCase(),
        address: addrStr,
        qrCodeUrl: qrCodeUrl || ''
      },
      { upsert: true, new: true }
    );

    console.log('[Admin Wallets] Wallet saved successfully:', JSON.stringify(wallet));
    return NextResponse.json(wallet);
  } catch (error: any) {
    console.error('[Admin Wallets] MongoDB/save error:', error);
    return NextResponse.json({ error: 'Failed to save wallet: ' + error.message }, { status: 500 });
  }
}