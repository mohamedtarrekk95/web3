/**
 * Shared admin auth helper - ensures consistent auth across all admin routes
 */
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AdminUser {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

/**
 * Extract and verify admin token from cookies
 * Returns decoded user if valid admin, null otherwise
 */
export async function getAdminFromCookies(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    const authToken = cookieStore.get('auth_token')?.value;
    const token = adminToken || authToken;

    if (!token) {
      console.log('[adminAuth] No token found in cookies');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    console.log('[adminAuth] Token decoded:', JSON.stringify(decoded));

    if (decoded.role !== 'admin') {
      console.log('[adminAuth] User is not admin, role:', decoded.role);
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'admin' | 'user'
    };
  } catch (err) {
    console.log('[adminAuth] Token verification failed:', err);
    return null;
  }
}

/**
 * Require admin - throws error if not admin (for use in try/catch)
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminFromCookies();
  if (!admin) {
    throw new Error('Unauthorized');
  }
  return admin;
}