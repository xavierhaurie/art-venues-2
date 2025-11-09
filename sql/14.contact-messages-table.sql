-- 14.contact-messages-table.sql
-- Create contact_messages table, feedback_email_token table, and add support_email config

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);

-- Feedback email confirmation tokens
CREATE TABLE IF NOT EXISTS feedback_email_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_email ON feedback_email_token(email);
CREATE INDEX idx_feedback_expires ON feedback_email_token(expires_at) WHERE consumed_at IS NULL;

-- Update cleanup function to include feedback tokens
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

  -- Delete consumed feedback tokens older than 24 hours
  DELETE FROM feedback_email_token
  WHERE consumed_at IS NOT NULL
    AND consumed_at < NOW() - INTERVAL '24 hours';

  -- Delete expired unused feedback tokens
  DELETE FROM feedback_email_token
  WHERE consumed_at IS NULL
    AND expires_at < NOW();

  -- Delete expired sessions
  DELETE FROM user_session
  WHERE expires_at < NOW()
    OR revoked_at < NOW() - INTERVAL '7 days';

  -- Delete old rate limit entries (older than 1 day)
  DELETE FROM rate_limit
  WHERE created_at < NOW() - INTERVAL '1 day';

  -- Delete old audit log entries (older than 90 days)
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Add support_email config value
INSERT INTO config (name, value) VALUES
  ('support_email', 'support@artvenues.com')
ON CONFLICT (name) DO NOTHING;

