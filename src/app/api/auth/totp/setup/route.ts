import { NextRequest, NextResponse } from 'next/server';
import { setupTOTP, logAuditEvent } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * POST /api/auth/totp/setup
 * Initialize TOTP setup for a user (returns secret and QR code)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await verifySession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Setup TOTP
    const { secret, qrCode, backupCodes } = await setupTOTP(session.userId, session.email);

    // Log TOTP setup initiated
    await logAuditEvent(
      'auth.totp.setup',
      'user',
      session.userId,
      { email: session.email },
      session.userId,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      secret,
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app',
    });

  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

