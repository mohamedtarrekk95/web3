import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] Path:', pathname);

  if (pathname.startsWith('/api/admin')) {
    const authToken = request.cookies.get('auth_token')?.value;
    const adminToken = request.cookies.get('admin_token')?.value;
    const token = adminToken || authToken;

    console.log('[Middleware] Admin route accessed');
    console.log('[Middleware] auth_token present:', !!authToken);
    console.log('[Middleware] admin_token present:', !!adminToken);

    if (!token) {
      console.log('[Middleware] No token - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string; username?: string; role: string };
      console.log('[Middleware] Token decoded:', JSON.stringify(decoded));
      console.log('[Middleware] Role:', decoded.role);

      if (!decoded || decoded.role !== 'admin') {
        console.log('[Middleware] Not admin or invalid - returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      console.log('[Middleware] Admin access granted');
    } catch (err) {
      console.log('[Middleware] Token verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
  ],
};