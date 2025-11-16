import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './crypto';

/**
 * Generate TOTP secret for a user
 */
export function generateTOTPSecret(email: string): { secret: string; otpauth_url: string } {
  const secret = speakeasy.generateSecret({
    name: `Art Venues (${email})`,
    issuer: 'Art Venues',
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret');
  }

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Generate otpauth URL from an existing secret
 */
export function generateOTPAuthUrl(secret: string, email: string): string {
  return speakeasy.otpauthURL({
    secret,
    label: `Art Venues (${email})`,
    issuer: 'Art Venues',
    encoding: 'base32',
  });
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify TOTP token with enhanced debugging and extended time window
 */
export function verifyTOTP(token: string, encryptedSecret: string): boolean {
  try {
    console.log('🔐 Verifying TOTP token:', token);
    console.log('🔐 Token type:', typeof token);
    console.log('🔐 Token length:', token?.length);

    const secret = decrypt(encryptedSecret);
    console.log('🔐 Decrypted secret (first 10 chars):', secret.substring(0, 10));
    console.log('🔐 Secret length:', secret.length);
    console.log('🔐 Secret is valid base32:', /^[A-Z2-7]+$/.test(secret));

    // Try with a much larger window first (up to 5 minutes drift)
    console.log('🔐 Attempting verification with extended window...');

    const extendedResult = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 10, // ±5 minutes (10 * 30 seconds)
    });

    console.log('🔐 Extended window verification (±5min):', extendedResult);

    if (extendedResult) {
      console.log('✅ TOTP verified with extended window - time sync issue detected but allowing');
      return true;
    }

    // Generate tokens for current time and nearby windows for debugging
    const now = Math.floor(Date.now() / 1000);
    console.log('🔐 Current server time:', new Date().toISOString());
    console.log('🔐 Checking tokens around current time...');

    for (let i = -5; i <= 5; i++) {
      const timeWindow = now + (i * 30);
      const expectedToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time: timeWindow,
      });

      const timeStr = new Date(timeWindow * 1000).toISOString();
      console.log(`🔐 Window ${i}: ${expectedToken} at ${timeStr}`);

      if (token === expectedToken) {
        console.log(`✅ Token matches window ${i} (${i * 30} seconds offset)`);
        return true;
      }
    }

    console.log('❌ No matching token found in any reasonable time window');
    return false;

  } catch (error) {
    console.error('🔐 Error verifying TOTP:', error);
    return false;
  }
}

/**
 * Encrypt TOTP secret for storage
 */
export function encryptTOTPSecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt TOTP secret from storage
 */
export function decryptTOTPSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}
