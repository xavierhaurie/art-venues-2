import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * GET /api/auth/me
 * Get current user information from session
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

    // Get user details
    const user = await getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user info (excluding sensitive data)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totp_enabled: user.totp_enabled,
        first_login_completed: user.first_login_completed,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
