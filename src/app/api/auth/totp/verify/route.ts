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

    // Debug logging
    console.log('🔍 TOTP verify - checking session cookie...');
    const cookieCheck = request.cookies.get('session');
    console.log('🔍 Session cookie exists:', !!cookieCheck);

    // Verify session (pass request object, not token string)
    const session = await verifySession(request);
    console.log('🔍 Session verified:', !!session);
    console.log('🔍 Session data:', session ? { userId: session.userId, email: session.email } : 'null');

    if (!session) {
      console.error('❌ No valid session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        console.error('❌ No TOTP secret found for user');
        return NextResponse.json(
          { error: 'TOTP not set up' },
          { status: 400 }
        );
      }

      console.log('🔐 User has TOTP secret, verifying token...');
      console.log('🔐 Token from request:', token);
      console.log('🔐 Token length:', token?.length);
      console.log('🔐 Secret (encrypted) length:', user.totp_secret?.length);

      isValid = verifyTOTP(token, user.totp_secret);

      console.log('🔐 Verification result:', isValid);

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
      console.error('❌ TOTP verification failed');
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

      // Set new session cookie
      const response = NextResponse.json(
        {
          success: true,
          message: 'TOTP setup completed successfully',
          redirectTo: '/dashboard'
        },
        { status: 200 }
      );

      response.cookies.set('session', newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      return response;
    } else {
      // TOTP already enabled, just verify and continue
      return NextResponse.json(
        {
          success: true,
          message: 'TOTP verified successfully'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('TOTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
