import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Rate limiter configurations - using snake_case to match endpoint names
const rateLimiters = {
  magic_link: new RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_MAGIC_LINK_PER_HOUR || '5'),
    duration: 60 * 60, // 1 hour
  }),
  login: new RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_LOGIN_ATTEMPTS_PER_15MIN || '5'),
    duration: 15 * 60, // 15 minutes
  }),
  totp: new RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_TOTP_ATTEMPTS_PER_5MIN || '5'),
    duration: 5 * 60, // 5 minutes
  }),
};

export type RateLimitEndpoint = 'magic_link' | 'login' | 'totp';

/**
 * Check and consume rate limit for a key
 */
export async function checkRateLimit(
  key: string,
  endpoint: RateLimitEndpoint
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = rateLimiters[endpoint];

  if (!limiter) {
    console.error(`No rate limiter found for endpoint: ${endpoint}`);
    return { allowed: true }; // Fail open in case of misconfiguration
  }

  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      const retryAfter = Math.ceil(error.msBeforeNext / 1000);

      // Log to database for audit
      await logRateLimitExceeded(key, endpoint, retryAfter);

      return { allowed: false, retryAfter };
    }
    throw error;
  }
}

/**
 * Reset rate limit for a key (e.g., after successful verification)
 */
export async function resetRateLimit(key: string, endpoint: RateLimitEndpoint): Promise<void> {
  const limiter = rateLimiters[endpoint];
  if (limiter) {
    await limiter.delete(key);
  }
}

/**
 * Get remaining attempts for a key
 */
export async function getRemainingAttempts(key: string, endpoint: RateLimitEndpoint): Promise<number> {
  const limiter = rateLimiters[endpoint];
  if (!limiter) {
    return 0;
  }
  try {
    const res = await limiter.get(key);
    if (!res) {
      return rateLimiters[endpoint].points;
    }
    return res.remainingPoints;
  } catch (error) {
    return 0;
  }
}

/**
 * Log rate limit exceeded to database
 */
async function logRateLimitExceeded(key: string, endpoint: string, retryAfter: number): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('rate_limit').insert({
      key,
      endpoint,
      attempts: 1,
      window_start: new Date().toISOString(),
      blocked_until: new Date(Date.now() + retryAfter * 1000).toISOString(),
    });

    // Also log to audit log
    await supabase.from('audit_log').insert({
      action: 'auth.rate_limit.exceeded',
      target_type: 'rate_limit',
      meta: { key, endpoint, retryAfter },
    });
  } catch (error) {
    console.error('Failed to log rate limit exceeded:', error);
  }
}

/**
 * Get rate limit key for IP address
 */
export function getIPRateLimitKey(ip: string, endpoint: RateLimitEndpoint): string {
  return `ip:${ip}:${endpoint}`;
}

/**
 * Get rate limit key for user
 */
export function getUserRateLimitKey(userId: string, endpoint: RateLimitEndpoint): string {
  return `user:${userId}:${endpoint}`;
}

/**
 * Get rate limit key for email
 */
export function getEmailRateLimitKey(email: string, endpoint: RateLimitEndpoint): string {
  return `email:${email}:${endpoint}`;
}

