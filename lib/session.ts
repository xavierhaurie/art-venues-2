import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || '604800'); // 7 days default

// DEVELOPMENT MODE: Set to true to bypass authentication (NEVER in production!)
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';
const DEV_USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface SessionResult {
  token: string;
  jti: string;
  expiresAt: Date;
}

export function createSession(userId: string, email: string, role: string): SessionResult {
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + SESSION_DURATION) * 1000);

  const payload: SessionData = {
    userId,
    email,
    role,
    jti,
    iat: now,
    exp: now + SESSION_DURATION,
  };

  const token = jwt.sign(payload, JWT_SECRET);

  return { token, jti, expiresAt };
}

// Overloaded function - can take either a token string or NextRequest
export function verifySession(token: string): SessionData | null;
export function verifySession(request: NextRequest): Promise<SessionData | null>;
export function verifySession(tokenOrRequest: string | NextRequest): SessionData | null | Promise<SessionData | null> {
  if (typeof tokenOrRequest === 'string') {
    // Direct token verification for tests
    try {
      const decoded = jwt.verify(tokenOrRequest, JWT_SECRET) as SessionData;

      // Check if session is expired
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  } else {
    // NextRequest verification for middleware/API routes
    return verifySessionFromRequest(tokenOrRequest);
  }
}

async function verifySessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  try {
    const sessionCookie = request.cookies.get('session');

    console.log('🔐 verifySession - cookie exists:', !!sessionCookie);

    if (!sessionCookie) {
      console.log('🔐 verifySession - no cookie found');
      return null;
    }

    console.log('🔐 verifySession - verifying JWT...');
    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as SessionData;
    console.log('🔐 verifySession - JWT valid, userId:', decoded.userId);

    // Check if session is expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      console.log('🔐 verifySession - session expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('🔐 verifySession error:', error);
    return null;
  }
}

export function decodeSession(token: string): SessionData | null {
  try {
    // Decode without verification - useful for expired tokens or debugging
    const decoded = jwt.decode(token) as SessionData;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  // DEVELOPMENT MODE: Return fake session if bypass enabled
  if (DEV_BYPASS_AUTH) {
    console.log('⚠️  DEV MODE: Returning fake session');
    const now = Math.floor(Date.now() / 1000);
    return {
      userId: DEV_USER_ID,
      email: 'dev@example.com',
      role: 'artist',
      jti: 'dev-jti',
      iat: now,
      exp: now + SESSION_DURATION,
    };
  }

  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return null;
    }

    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as SessionData;

    // Check if session is expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

export function setSessionCookie(token: string): void {
  const cookieStore = cookies();

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete('session');
}

export async function getCurrentUserId(): Promise<string | null> {
  if (DEV_BYPASS_AUTH) {
    return DEV_USER_ID;
  }

  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return null;
    }

    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as SessionData;

    // Check if session is expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    console.error('getCurrentUserId error:', error);
    return null;
  }
}
