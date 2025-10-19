import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, logAuditEvent } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * POST /api/auth/logout
 * Logout user and revoke session
 */
export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }

    // Verify session
    const session = verifySession(sessionToken);

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
    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    response.cookies.delete('session');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

