import { NextRequest, NextResponse } from 'next/server';
import { regenerateBackupCodes, getUnusedBackupCodeCount, logAuditEvent } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * POST /api/auth/backup-codes/generate
 * Generate new backup codes for a user
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

    // Regenerate backup codes
    const backupCodes = await regenerateBackupCodes(session.userId);

    // Log backup codes regenerated
    await logAuditEvent(
      'auth.backup_code.regenerated',
      'user',
      session.userId,
      { count: backupCodes.length },
      session.userId,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      backupCodes,
      message: 'New backup codes generated. Store them securely.',
    });

  } catch (error) {
    console.error('Backup code generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/backup-codes/count
 * Get count of unused backup codes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify session
    const session = await verifySession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get unused backup code count
    const count = await getUnusedBackupCodeCount(session.userId);

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Backup code count error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
