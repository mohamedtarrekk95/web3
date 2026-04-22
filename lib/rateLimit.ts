// Simple in-memory rate limiter for Next.js API routes
// Works with Vercel serverless functions (per-instance memory)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function rateLimit(config: RateLimitConfig) {
  return function (ipOrId: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ipOrId);

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      rateLimitStore.delete(ipOrId);
    }

    const current = rateLimitStore.get(ipOrId);

    if (!current) {
      rateLimitStore.set(ipOrId, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { success: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    if (current.count >= config.maxRequests) {
      return { success: false, remaining: 0, resetTime: current.resetTime };
    }

    current.count++;
    return { success: true, remaining: config.maxRequests - current.count, resetTime: current.resetTime };
  };
}

// Pre-configured limiters
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 orders per minute
});

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 admin requests per minute
});

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
