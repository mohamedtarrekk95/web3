/**
 * Auth utilities - JWT-based authentication
 */
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Sign a JWT token
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Set auth cookie (async in Next.js 15)
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear auth cookie (async in Next.js 15)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get token from cookies (async in Next.js 15)
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Get current user from cookies (async in Next.js 15)
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return verifyToken(token);
}
