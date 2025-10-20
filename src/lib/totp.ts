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
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, encryptedSecret: string): boolean {
  try {
    console.log('🔐 Verifying TOTP token:', token);
    const secret = decrypt(encryptedSecret);
    console.log('🔐 Decrypted secret (first 10 chars):', secret.substring(0, 10));

    const result = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps in either direction
    });

    console.log('🔐 TOTP verification result:', result);
    return result;
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
