-- M0-AUTH-01: Authentication Schema Extensions
-- Adds magic-link, OAuth, TOTP, backup codes, session management, and rate limiting

SET search_path = public;

-- Auth providers enum
CREATE TYPE auth_provider AS ENUM ('magic_link', 'google', 'facebook');

-- Add auth fields to app_user table
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS first_login_completed boolean NOT NULL DEFAULT false;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Magic link tokens
CREATE TABLE magic_link_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email)),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_magic_link_email ON magic_link_token(email);
CREATE INDEX idx_magic_link_expires ON magic_link_token(expires_at) WHERE consumed_at IS NULL;

-- OAuth accounts
CREATE TABLE oauth_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_user_id text NOT NULL,
  provider_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX idx_oauth_user ON oauth_account(user_id);
CREATE TRIGGER trg_oauth_updated BEFORE UPDATE ON oauth_account
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Backup codes (hashed)
CREATE TABLE backup_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_backup_code_user ON backup_code(user_id);
CREATE INDEX idx_backup_code_unused ON backup_code(user_id) WHERE used_at IS NULL;

-- Sessions
CREATE TABLE user_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  jti text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_session_user ON user_session(user_id);
CREATE INDEX idx_session_jti ON user_session(jti);
CREATE INDEX idx_session_active ON user_session(user_id, expires_at) WHERE revoked_at IS NULL;

-- Rate limiting tracking
CREATE TABLE rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,  -- 'ip:' + ip or 'user:' + user_id or 'email:' + email
  endpoint text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(key, endpoint, window_start)
);
CREATE INDEX idx_rate_limit_key ON rate_limit(key, endpoint, window_start);
CREATE INDEX idx_rate_limit_blocked ON rate_limit(blocked_until) WHERE blocked_until IS NOT NULL;

-- Audit log entries for auth events
-- (uses existing audit_log table, just document event types here)
-- Auth event types:
--   auth.magic_link.requested
--   auth.magic_link.consumed
--   auth.oauth.login
--   auth.login.success
--   auth.login.failed
--   auth.totp.setup
--   auth.totp.enabled
--   auth.totp.disabled
--   auth.totp.verified
--   auth.totp.failed
--   auth.backup_code.generated
--   auth.backup_code.used
--   auth.session.created
--   auth.session.revoked
--   auth.rate_limit.exceeded

-- Clean up expired tokens (call periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Delete consumed magic links older than 24 hours
  DELETE FROM magic_link_token
  WHERE consumed_at IS NOT NULL
    AND consumed_at < NOW() - INTERVAL '24 hours';

  -- Delete expired unused magic links
  DELETE FROM magic_link_token
  WHERE consumed_at IS NULL
    AND expires_at < NOW();

  -- Delete expired sessions
  DELETE FROM user_session
  WHERE expires_at < NOW()
    OR revoked_at < NOW() - INTERVAL '7 days';

  -- Delete old rate limit entries (older than 1 day)
  DELETE FROM rate_limit
  WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$;
