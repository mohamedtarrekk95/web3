import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }

    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Protect /my-orders - ANY authenticated user can access
  if (pathname.startsWith('/my-orders')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    // If token is valid, allow access (no role check needed for /my-orders)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/my-orders/:path*',
  ],
};
