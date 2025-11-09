import * as speakeasy from 'speakeasy';

describe('totp placeholder', () => {
  it('generates a token', () => {
    const secret = speakeasy.generateSecret({ length: 10 });
    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});
