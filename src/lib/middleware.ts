import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { isSessionRevoked } from '@/lib/db';

/**
 * Middleware to protect routes that require authentication
 */
export async function authMiddleware(request: NextRequest) {
  // Get session token from cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify session token (pass the request, not the token string)
  const session = await verifySession(request);

  if (!session) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Check if session is revoked in database
  const revoked = await isSessionRevoked(session.jti);

  if (revoked) {
    return NextResponse.json(
      { error: 'Session revoked' },
      { status: 401 }
    );
  }

  // Attach session to request for use in route handlers
  (request as any).session = session;

  return null; // Allow request to proceed
}

/**
 * Get session from request (use in route handlers)
 */
export function getSession(request: NextRequest) {
  return (request as any).session;
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const authResult = await authMiddleware(request);
    if (authResult) return authResult;

    const session = getSession(request);

    if (!session || !allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return null;
  };
}
