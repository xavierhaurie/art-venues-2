import { NextRequest, NextResponse } from 'next/server';
import { getUserById, enableTOTP, markFirstLoginCompleted, revokeAllUserSessions, createSessionRecord, logAuditEvent, verifyBackupCode } from '@/lib/db';
import { verifySession, createSession } from '@/lib/session';
import { verifyTOTP } from '@/lib/totp';
import { checkRateLimit, getUserRateLimitKey, resetRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/auth/totp/verify
 * Verify TOTP token or backup code
 */
export async function POST(request: NextRequest) {
  try {
    const { token, isBackupCode } = await request.json();

    // Get session from cookie
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session
    const session = verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Rate limiting per user
    const rateLimitKey = getUserRateLimitKey(session.userId, 'totp');
    const rateLimit = await checkRateLimit(rateLimitKey, 'totp');

    if (!rateLimit.allowed) {
      await logAuditEvent(
        'auth.totp.rate_limited',
        'user',
        session.userId,
        { retryAfter: rateLimit.retryAfter },
        session.userId,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        {
          error: 'Too many attempts',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      );
    }

    // Get user
    const user = await getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      isValid = await verifyBackupCode(user.id, token);

      if (isValid) {
        await logAuditEvent(
          'auth.backup_code.verified',
          'user',
          user.id,
          {},
          user.id,
          request.ip,
          request.headers.get('user-agent') || undefined
        );
      }
    } else {
      // Verify TOTP token
      if (!user.totp_secret) {
        return NextResponse.json(
          { error: 'TOTP not set up' },
          { status: 400 }
        );
      }

      isValid = verifyTOTP(token, user.totp_secret);

      if (isValid) {
        await logAuditEvent(
          'auth.totp.verified',
          'user',
          user.id,
          {},
          user.id,
          request.ip,
          request.headers.get('user-agent') || undefined
        );
      }
    }

    if (!isValid) {
      await logAuditEvent(
        'auth.totp.failed',
        'user',
        user.id,
        { isBackupCode },
        user.id,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Reset rate limit on successful verification
    await resetRateLimit(rateLimitKey, 'totp');

    // If TOTP was just set up (not enabled yet), enable it now
    if (!user.totp_enabled) {
      await enableTOTP(user.id);

      // Revoke all other sessions (session rotation on 2FA enable)
      await revokeAllUserSessions(user.id, session.jti);

      // Create new session
      const { token: newSessionToken, jti: newJti, expiresAt } = createSession(
        user.id,
        user.email,
        user.role
      );

      await createSessionRecord(
        user.id,
        newJti,
        expiresAt,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      // Mark first login as completed
      await markFirstLoginCompleted(user.id);

      const response = NextResponse.json({
        message: 'TOTP enabled successfully',
        sessionRotated: true,
      });

      // Update session cookie
      response.cookies.set('session', newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      message: 'TOTP verified successfully',
    });

  } catch (error) {
    console.error('TOTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

