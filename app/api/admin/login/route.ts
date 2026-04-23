import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { adminRateLimiter } from '@/lib/rateLimit';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const ADMIN_COOKIE = 'admin_token';

export async function POST(request: NextRequest) {
  console.log('[Admin Login] POST request received');

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

    console.log('[Admin Login] Username:', username);

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and password at least 6 characters' },
        { status: 400 }
      );
    }

    // Find user in users collection - check both email and name fields
    let user = await User.findOne({
      $or: [
        { email: username.toLowerCase() },
        { name: username }
      ]
    });

    console.log('[Admin Login] User found in DB:', !!user);
    if (user) {
      console.log('[Admin Login] User role:', user.role);
      console.log('[Admin Login] User is admin?', user.role === 'admin');
    }

    if (!user) {
      console.log('[Admin Login] User not found');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('[Admin Login] Password invalid');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      console.log('[Admin Login] User is not admin, role:', user.role);
      return NextResponse.json({ error: 'Access denied - not an admin' }, { status: 403 });
    }

    // Generate token with proper user info
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[Admin Login] Token generated for admin:', user.email);

    const response = NextResponse.json({ success: true, username: user.name });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error: any) {
    console.error('[Admin Login] Error:', error);
    return NextResponse.json({ error: 'Login failed: ' + error.message }, { status: 500 });
  }
}