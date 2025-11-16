// Database types for authentication
export type UserRole = 'admin' | 'artist' | 'venue' | 'service';
export type AuthProvider = 'magic_link' | 'google' | 'facebook';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  totp_enabled: boolean;
  totp_secret: string | null;
  first_login_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MagicLinkToken {
  id: string;
  user_id: string | null;
  email: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_user_id: string;
  provider_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BackupCode {
  id: string;
  user_id: string;
  code_hash: string;
  used_at: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  jti: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface RateLimit {
  id: string;
  key: string;
  endpoint: string;
  attempts: number;
  window_start: string;
  blocked_until: string | null;
  created_at: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti: string;
  iat: number;
  exp: number;
}

export interface TOTPSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}
