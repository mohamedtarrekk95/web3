import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Simple logging - actual auth happens in route handlers using getAdminFromCookies()
  if (pathname.startsWith('/api/admin')) {
    console.log('[Middleware] Admin route intercepted:', pathname);

    // Quick check - just ensure token exists, actual role check is in route handler
    const authToken = request.cookies.get('auth_token')?.value;
    const adminToken = request.cookies.get('admin_token')?.value;
    const token = adminToken || authToken;

    if (!token) {
      console.log('[Middleware] No token - route handler will return 401');
    } else {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Middleware] Token valid for:', (decoded as any).email, 'role:', (decoded as any).role);
      } catch {
        console.log('[Middleware] Token invalid - route handler will return 401');
      }
    }
  }

  // Pass through - actual auth happens in route handlers
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
  ],
};