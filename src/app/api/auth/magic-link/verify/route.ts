import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken, getUserByEmail, updateUserLastLogin, logAuditEvent } from '/lib/db';
import { createSession } from '/lib/session';
import { createSessionRecord } from '/lib/db';

/**
 * GET /api/auth/magic-link/verify?token=xxx
 * Verify and consume a magic link token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify magic link token
    const magicLinkToken = await verifyMagicLinkToken(token);

    if (!magicLinkToken) {
      await logAuditEvent(
        'auth.login.failed',
        'magic_link',
        null,
        { reason: 'invalid_token' },
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user
    const user = await getUserByEmail(magicLinkToken.email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if this is first login and TOTP is not enabled
    const requiresTOTPSetup = !user.first_login_completed && !user.totp_enabled;

    // Create session
    const { token: sessionToken, jti, expiresAt } = createSession(user.id, user.email, user.role);

    // Store session in database
    await createSessionRecord(
      user.id,
      jti,
      expiresAt,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    // Update last login
    await updateUserLastLogin(user.id);

    // Log successful login
    await logAuditEvent(
      'auth.login.success',
      'user',
      user.id,
      { method: 'magic_link', requiresTOTPSetup },
      user.id,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    const response = NextResponse.json({
      requiresTOTPSetup,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totp_enabled: user.totp_enabled,
      },
    });

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
