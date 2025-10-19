import { encrypt, decrypt, hash, verifyHash, generateToken, generateBackupCodes } from '@/lib/crypto';

describe('Crypto utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'secret-totp-key-123456';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same-secret';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw error on invalid encrypted data format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
    });
  });

  describe('hash/verifyHash', () => {
    it('should hash and verify data correctly', async () => {
      const data = 'backup-code-ABC123';
      const hashed = await hash(data);

      expect(hashed).not.toBe(data);
      expect(await verifyHash(data, hashed)).toBe(true);
    });

    it('should fail verification for wrong data', async () => {
      const data = 'correct-data';
      const wrongData = 'wrong-data';
      const hashed = await hash(data);

      expect(await verifyHash(wrongData, hashed)).toBe(false);
    });

    it('should produce different hashes for same data', async () => {
      const data = 'same-data';
      const hash1 = await hash(data);
      const hash2 = await hash(data);

      expect(hash1).not.toBe(hash2);
      expect(await verifyHash(data, hash1)).toBe(true);
      expect(await verifyHash(data, hash2)).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = generateToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken(32);
      const token2 = generateToken(32);

      expect(token1).not.toBe(token2);
    });

    it('should use default length when not specified', () => {
      const token = generateToken();
      expect(token).toHaveLength(64); // Default 32 bytes
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('should generate specified number of codes', () => {
      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
    });

    it('should generate 8-character uppercase codes', () => {
      const codes = generateBackupCodes();

      codes.forEach(code => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(10);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });
  });
});

