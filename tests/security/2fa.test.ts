import request from 'supertest';
import express from 'express';
import { authenticator } from 'otplib';
import { SecurityMiddleware } from '../../src/middleware/security';
import { testUser, getCSRFToken } from '../utils/test-helpers';

describe('Two-Factor Authentication', () => {
  let app: express.Application;
  let testSecret: string;
  let backupCodes: string[];

  beforeEach(() => {
    app = express();
    SecurityMiddleware.applyAll(app);

    // Mock 2FA routes
    app.post('/api/auth/2fa/setup', (req, res) => {
      const secret = authenticator.generateSecret();
      const uri = authenticator.keyuri(req.body.email, 'Q-Social', secret);
      testSecret = secret;
      res.json({ secret, uri });
    });

    app.post('/api/auth/2fa/verify', (req, res) => {
      const { token } = req.body;
      const isValid = authenticator.verify({ token, secret: testSecret });
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
      }
      backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substr(2, 8)
      );
      res.json({ verified: true, backupCodes });
    });

    app.post('/api/auth/2fa/validate', (req, res) => {
      const { token, backupCode } = req.body;
      
      if (backupCode && backupCodes.includes(backupCode)) {
        backupCodes = backupCodes.filter(code => code !== backupCode);
        return res.json({ valid: true });
      }

      const isValid = authenticator.verify({ token, secret: testSecret });
      res.json({ valid: isValid });
    });

    app.post('/api/auth/2fa/disable', (req, res) => {
      const { token } = req.body;
      const isValid = authenticator.verify({ token, secret: testSecret });
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
      }
      testSecret = '';
      backupCodes = [];
      res.json({ disabled: true });
    });
  });

  describe('2FA Setup', () => {
    it('should generate secret key and QR URI', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.secret).toBeDefined();
      expect(response.body.uri).toContain('otpauth://totp/');
    });

    it('should verify initial setup with valid token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // First setup 2FA
      const setupResponse = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      // Generate valid TOTP token
      const totpToken = authenticator.generate(setupResponse.body.secret);

      // Verify setup
      const verifyResponse = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: totpToken });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(true);
      expect(verifyResponse.body.backupCodes).toHaveLength(10);
    });

    it('should reject invalid setup token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: '123456' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid 2FA token');
    });
  });

  describe('2FA Validation', () => {
    it('should validate correct TOTP token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Setup 2FA first
      await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      // Generate and validate token
      const totpToken = authenticator.generate(testSecret);
      const response = await request(app)
        .post('/api/auth/2fa/validate')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: totpToken });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should accept valid backup code', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Setup 2FA and get backup codes
      await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      const totpToken = authenticator.generate(testSecret);
      const verifyResponse = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: totpToken });

      // Use a backup code
      const backupCode = verifyResponse.body.backupCodes[0];
      const response = await request(app)
        .post('/api/auth/2fa/validate')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ backupCode });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should reject used backup code', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Setup 2FA and get backup codes
      await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      const totpToken = authenticator.generate(testSecret);
      const verifyResponse = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: totpToken });

      const backupCode = verifyResponse.body.backupCodes[0];

      // Use backup code first time
      await request(app)
        .post('/api/auth/2fa/validate')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ backupCode });

      // Try to use same backup code again
      const response = await request(app)
        .post('/api/auth/2fa/validate')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ backupCode });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('2FA Management', () => {
    it('should disable 2FA with valid token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Setup 2FA first
      await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });

      // Generate token and disable 2FA
      const totpToken = authenticator.generate(testSecret);
      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: totpToken });

      expect(response.status).toBe(200);
      expect(response.body.disabled).toBe(true);
    });

    it('should reject 2FA disable with invalid token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: '123456' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid 2FA token');
    });
  });
});
