import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || '604800'); // 7 days default

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

export async function verifySession(request: NextRequest): Promise<SessionData | null> {
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

export async function getSession(): Promise<SessionData | null> {
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
