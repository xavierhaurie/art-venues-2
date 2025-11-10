-- 14.contact-messages-table.sql
-- Define contact_message table (simplified message capture)

DROP TABLE IF EXISTS feedback_email_token CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE; -- old plural name

CREATE TABLE contact_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  message text NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_message_processed ON contact_message(processed);
CREATE INDEX idx_contact_message_created_at ON contact_message(created_at DESC);

-- Keep support_email config seed
INSERT INTO config (name, value) VALUES ('support_email', 'support@artvenues.com')
ON CONFLICT (name) DO NOTHING;

-- Cleanup function no longer manages feedback tokens; retain other cleanup logic
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
  WHERE created_at < NOW() - INTERVAL '1 day';

  -- Delete old audit log entries (older than 90 days)
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
