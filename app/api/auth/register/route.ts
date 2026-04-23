import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { hashPassword } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = apiRateLimiter(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
    });

    return NextResponse.json({
      success: true,
      userId: user._id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
