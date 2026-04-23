import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { adminRateLimiter } from '@/lib/rateLimit';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const ADMIN_COOKIE = 'admin_token';

export async function POST(request: NextRequest) {
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
    await connectDB();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Validate input length
    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and password at least 6 characters' },
        { status: 400 }
      );
    }

    let admin = await Admin.findOne({ username });

    if (!admin) {
      // First-time setup - create admin account
      const hashedPassword = await bcrypt.hash(password, 12);
      admin = new Admin({ username, password: hashedPassword });
      await admin.save();
    } else {
      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    const response = NextResponse.json({ success: true, username });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
