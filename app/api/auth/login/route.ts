import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = apiRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      userId: user._id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
