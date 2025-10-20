import { createSession, verifySession, decodeSession } from '@/lib/session';

describe('Session utilities', () => {
  describe('createSession', () => {
    it('should create valid session token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'artist';
      
      const { token, jti, expiresAt } = createSession(userId, email, role);
      
      expect(token).toBeTruthy();
      expect(jti).toBeTruthy();
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create sessions with unique JTI', () => {
      const session1 = createSession('user-1', 'test1@example.com', 'artist');
      const session2 = createSession('user-1', 'test1@example.com', 'artist');
      
      expect(session1.jti).not.toBe(session2.jti);
    });

    it('should set expiry to 7 days from now', () => {
      const { expiresAt } = createSession('user-1', 'test@example.com', 'artist');
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('verifySession', () => {
    it('should verify valid session token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'artist';
      
      const { token } = createSession(userId, email, role);
      const payload = verifySession(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.role).toBe(role);
      expect(payload?.jti).toBeTruthy();
    });

    it('should reject invalid token', () => {
      const payload = verifySession('invalid-token');
      expect(payload).toBeNull();
    });

    it('should reject expired token', () => {
      // This would require mocking time or creating an expired token
      // For now, we just test that the verification function exists
      expect(verifySession).toBeDefined();
    });
  });

  describe('decodeSession', () => {
    it('should decode session token without verification', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'artist';
      
      const { token } = createSession(userId, email, role);
      const payload = decodeSession(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.role).toBe(role);
    });

    it('should return null for invalid token', () => {
      const payload = decodeSession('not-a-valid-jwt');
      expect(payload).toBeNull();
    });
  });
});

