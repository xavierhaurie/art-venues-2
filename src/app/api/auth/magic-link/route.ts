import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, createMagicLinkToken, logAuditEvent } from '@/lib/db';
import { checkRateLimit, getEmailRateLimitKey } from '@/lib/rate-limit';
import { sendMagicLinkEmail } from '@/lib/email';

/**
 * POST /api/auth/magic-link
 * Request a magic link for email authentication
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting per email
    const rateLimitKey = getEmailRateLimitKey(normalizedEmail, 'magic_link');
    const rateLimit = await checkRateLimit(rateLimitKey, 'magic_link');

    if (!rateLimit.allowed) {
      await logAuditEvent(
        'auth.magic_link.rate_limited',
        'rate_limit',
        null,
        { email: normalizedEmail, retryAfter: rateLimit.retryAfter },
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      );
    }

    // Check if user exists, create if not
    let user = await getUserByEmail(normalizedEmail);
    if (!user) {
      user = await createUser(normalizedEmail);
      if (!user) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    // Create magic link token
    const token = await createMagicLinkToken(normalizedEmail, user.id);

    // Send email with magic link
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link/verify?token=${token}`;
    await sendMagicLinkEmail(normalizedEmail, magicLink);

    return NextResponse.json({
      message: 'Magic link sent to your email',
    });

  } catch (error) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

