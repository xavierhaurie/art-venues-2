import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, logAuditEvent } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * POST /api/auth/logout
 * Logout user and revoke session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await verifySession(request);

    if (session) {
      // Revoke session in database
      await revokeSession(session.jti);

      // Log logout
      await logAuditEvent(
        'auth.logout',
        'session',
        session.jti,
        {},
        session.userId,
        request.ip,
        request.headers.get('user-agent') || undefined
      );
    }

    // Clear session cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
