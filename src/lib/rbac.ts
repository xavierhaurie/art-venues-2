import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { isSessionRevoked, logAuditEvent } from '@/lib/db';
import { UserRole } from '@/types/auth';

// DEVELOPMENT MODE: Set to true to bypass authentication (NEVER in production!)
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';

/**
 * Role-based access control middleware
 * Checks if user has required role(s) for the endpoint
 */
export async function withRoleCheck(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<NextResponse | null> {
  // DEVELOPMENT MODE: Bypass authentication if enabled
  if (DEV_BYPASS_AUTH) {
    console.log('⚠️  DEV MODE: Bypassing authentication');
    return null; // null means "proceed"
  }

  // Get session token from cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    await logAuditEvent(
      'auth.access.denied',
      'rbac',
      null,
      { reason: 'no_session', endpoint: request.nextUrl.pathname },
      undefined,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify session token
  const session = await verifySession(request);

  if (!session) {
    await logAuditEvent(
      'auth.access.denied',
      'rbac',
      null,
      { reason: 'invalid_session', endpoint: request.nextUrl.pathname },
      undefined,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Check if session is revoked in database
  const revoked = await isSessionRevoked(session.jti);

  if (revoked) {
    await logAuditEvent(
      'auth.access.denied',
      'rbac',
      null,
      { reason: 'session_revoked', endpoint: request.nextUrl.pathname, userId: session.userId },
      session.userId,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json(
      { error: 'Session revoked' },
      { status: 401 }
    );
  }

  // Check if user has required role
  if (!allowedRoles.includes(session.role as UserRole)) {
    await logAuditEvent(
      'auth.rbac.denied',
      'rbac',
      null,
      {
        userId: session.userId,
        userRole: session.role,
        requiredRoles: allowedRoles,
        endpoint: request.nextUrl.pathname,
      }
    );

    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Attach session to request for use in route handlers
  (request as any).session = session;

  // Log successful access
  await logAuditEvent(
    'auth.rbac.allowed',
    'rbac',
    null,
    {
      userId: session.userId,
      userRole: session.role,
      endpoint: request.nextUrl.pathname,
    },
    session.userId,
    request.ip,
    request.headers.get('user-agent') || undefined
  );

  return null; // Allow request to proceed
}

/**
 * Middleware helper for admin-only routes
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  return withRoleCheck(request, ['admin']);
}

/**
 * Middleware helper for artist routes
 */
export async function requireArtist(request: NextRequest): Promise<NextResponse | null> {
  return withRoleCheck(request, ['artist', 'admin']);
}

/**
 * Middleware helper for venue routes
 */
export async function requireVenue(request: NextRequest): Promise<NextResponse | null> {
  return withRoleCheck(request, ['venue', 'admin']);
}

/**
 * Middleware helper for service routes
 */
export async function requireService(request: NextRequest): Promise<NextResponse | null> {
  return withRoleCheck(request, ['service', 'admin']);
}

/**
 * Middleware helper for any authenticated user
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  return withRoleCheck(request, ['admin', 'artist', 'venue', 'service']);
}

/**
 * Get session from request (after middleware has run)
 */
export function getSessionFromRequest(request: NextRequest) {
  return (request as any).session;
}
