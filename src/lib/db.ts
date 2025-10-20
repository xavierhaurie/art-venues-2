import { createClient } from '@supabase/supabase-js';
import { User, MagicLinkToken, OAuthAccount, BackupCode, UserSession } from '@/types/auth';
import { hash, verifyHash, generateToken, generateBackupCodes } from './crypto';
import { encryptTOTPSecret, decryptTOTPSecret, generateTOTPSecret, generateOTPAuthUrl, generateQRCode } from './totp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client - it uses 'public' schema by default
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database operations for authentication
 */

// ==================== USERS ====================

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('app_user')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('app_user')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function createUser(email: string, name?: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('app_user')
    .insert({
      email,
      name: name || null,
      role: 'artist', // Default role
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create user:', error);
    return null;
  }

  // Log user signup
  await logAuditEvent('auth.signup', 'user', data.id, { email });

  return data as User;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  await supabase
    .from('app_user')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function markFirstLoginCompleted(userId: string): Promise<void> {
  await supabase
    .from('app_user')
    .update({ first_login_completed: true })
    .eq('id', userId);
}

// ==================== MAGIC LINKS ====================

export async function createMagicLinkToken(email: string, userId?: string): Promise<string> {
  const token = generateToken(32);
  const tokenHash = await hash(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const { error } = await supabase
    .from('magic_link_token')
    .insert({
      user_id: userId || null,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Failed to create magic link token:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create magic link: ${error.message || JSON.stringify(error)}`);
  }

  // Log magic link request
  await logAuditEvent('auth.magic_link.requested', 'magic_link', null, { email });

  return token;
}

export async function verifyMagicLinkToken(token: string): Promise<MagicLinkToken | null> {
  // Get all unconsumed, unexpired tokens
  const { data: tokens, error } = await supabase
    .from('magic_link_token')
    .select('*')
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error || !tokens) return null;

  // Find matching token by comparing hashes
  for (const dbToken of tokens) {
    const isValid = await verifyHash(token, dbToken.token_hash);
    if (isValid) {
      // Mark token as consumed
      await supabase
        .from('magic_link_token')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', dbToken.id);

      // Log magic link consumed
      await logAuditEvent('auth.magic_link.consumed', 'magic_link', dbToken.id, {
        email: dbToken.email,
        user_id: dbToken.user_id,
      });

      return dbToken as MagicLinkToken;
    }
  }

  return null;
}

// ==================== OAUTH ====================

export async function getOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
  const { data, error } = await supabase
    .from('oauth_account')
    .select('*')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)
    .single();

  if (error || !data) return null;
  return data as OAuthAccount;
}

export async function createOAuthAccount(
  userId: string,
  provider: string,
  providerUserId: string,
  providerData: Record<string, any>
): Promise<OAuthAccount | null> {
  const { data, error } = await supabase
    .from('oauth_account')
    .insert({
      user_id: userId,
      provider,
      provider_user_id: providerUserId,
      provider_data: providerData,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create OAuth account:', error);
    return null;
  }

  // Log OAuth login
  await logAuditEvent('auth.oauth.login', 'oauth_account', data.id, { provider, userId });

  return data as OAuthAccount;
}

// ==================== TOTP ====================

export async function setupTOTP(userId: string, email: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
  console.log('🔐 Generating NEW TOTP secret for user (forced refresh):', userId);

  // Always generate a new secret to avoid any corruption issues
  const { secret, otpauth_url } = generateTOTPSecret(email);
  const encryptedSecret = encryptTOTPSecret(secret);

  // Generate QR code
  const qrCode = await generateQRCode(otpauth_url);

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  // Delete any existing backup codes first
  await supabase
    .from('backup_code')
    .delete()
    .eq('user_id', userId);

  // Store encrypted secret (this will overwrite any existing secret)
  await supabase
    .from('app_user')
    .update({
      totp_secret: encryptedSecret,
      totp_enabled: false // Reset to ensure proper setup flow
    })
    .eq('id', userId);

  // Store new backup codes (hashed)
  const backupCodeInserts = await Promise.all(
    backupCodes.map(async (code) => ({
      user_id: userId,
      code_hash: await hash(code),
    }))
  );

  await supabase.from('backup_code').insert(backupCodeInserts);

  // Log TOTP setup
  await logAuditEvent('auth.totp.setup', 'user', userId, { email });

  console.log('🔐 New TOTP secret generated and stored');
  console.log('🔐 Secret preview (first 10 chars):', secret.substring(0, 10));

  return { secret, qrCode, backupCodes };
}

export async function enableTOTP(userId: string): Promise<void> {
  await supabase
    .from('app_user')
    .update({ totp_enabled: true })
    .eq('id', userId);

  // Log TOTP enabled
  await logAuditEvent('auth.totp.enabled', 'user', userId, {});
}

export async function disableTOTP(userId: string): Promise<void> {
  await supabase
    .from('app_user')
    .update({
      totp_enabled: false,
      totp_secret: null,
    })
    .eq('id', userId);

  // Delete backup codes
  await supabase
    .from('backup_code')
    .delete()
    .eq('user_id', userId);

  // Log TOTP disabled
  await logAuditEvent('auth.totp.disabled', 'user', userId, {});
}

// ==================== BACKUP CODES ====================

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  // Get all unused backup codes for user
  const { data: codes, error } = await supabase
    .from('backup_code')
    .select('*')
    .eq('user_id', userId)
    .is('used_at', null);

  if (error || !codes) return false;

  // Find matching code
  for (const dbCode of codes) {
    const isValid = await verifyHash(code, dbCode.code_hash);
    if (isValid) {
      // Mark code as used
      await supabase
        .from('backup_code')
        .update({ used_at: new Date().toISOString() })
        .eq('id', dbCode.id);

      // Log backup code used
      await logAuditEvent('auth.backup_code.used', 'backup_code', dbCode.id, { userId });

      return true;
    }
  }

  return false;
}

export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  // Delete old backup codes
  await supabase
    .from('backup_code')
    .delete()
    .eq('user_id', userId);

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10);

  // Store new backup codes (hashed)
  const backupCodeInserts = await Promise.all(
    backupCodes.map(async (code) => ({
      user_id: userId,
      code_hash: await hash(code),
    }))
  );

  await supabase.from('backup_code').insert(backupCodeInserts);

  // Log backup codes regenerated
  await logAuditEvent('auth.backup_code.generated', 'user', userId, { count: backupCodes.length });

  return backupCodes;
}

export async function getUnusedBackupCodeCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('backup_code')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null);

  return count || 0;
}

// ==================== SESSIONS ====================

export async function createSessionRecord(
  userId: string,
  jti: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await supabase
    .from('user_session')
    .insert({
      user_id: userId,
      jti,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      expires_at: expiresAt.toISOString(),
    });

  // Log session created
  await logAuditEvent('auth.session.created', 'session', jti, { userId });
}

export async function revokeSession(jti: string): Promise<void> {
  await supabase
    .from('user_session')
    .update({ revoked_at: new Date().toISOString() })
    .eq('jti', jti);

  // Log session revoked
  await logAuditEvent('auth.session.revoked', 'session', jti, {});
}

export async function revokeAllUserSessions(userId: string, exceptJti?: string): Promise<void> {
  let query = supabase
    .from('user_session')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (exceptJti) {
    query = query.neq('jti', exceptJti);
  }

  await query;

  // Log all sessions revoked
  await logAuditEvent('auth.session.revoked_all', 'user', userId, { exceptJti });
}

export async function isSessionRevoked(jti: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_session')
    .select('revoked_at')
    .eq('jti', jti)
    .single();

  if (error || !data) return true;
  return data.revoked_at !== null;
}

// ==================== AUDIT LOG ====================

export async function logAuditEvent(
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, any>,
  actorUserId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      actor_user_id: actorUserId || null,
      action,
      target_type: targetType,
      target_id: targetId,
      meta,
      ip: ipAddress || null,
      user_agent: userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
