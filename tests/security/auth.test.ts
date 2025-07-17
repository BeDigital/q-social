import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { SecurityMiddleware } from '../../src/middleware/security';
import { testUser, getCSRFToken } from '../utils/test-helpers';

describe('Authentication Security', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(cookieParser());
    SecurityMiddleware.applyAll(app);

    // Mock session store
    const sessions = new Map<string, boolean>();

    // Test routes
    app.post('/api/auth/login', (req, res) => {
      if (!req.body.email || !req.body.password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }
      res.json({ token: 'test-token', user: testUser });
    });

    app.post('/api/auth/register', (req, res) => {
      res.json({ message: 'User registered successfully' });
    });

    app.post('/api/auth/password-reset', (req, res) => {
      res.json({ message: 'Password reset email sent' });
    });

    app.post('/api/auth/logout', (req, res) => {
      const token = req.headers['x-csrf-token'] as string;
      sessions.delete(token);
      res.clearCookie('_csrf');
      res.clearCookie('XSRF-TOKEN');
      res.json({ message: 'Logged out successfully' });
    });

    // Add session check middleware
    app.use((req, res, next) => {
      const token = req.headers['x-csrf-token'] as string;
      if (req.method !== 'GET' && !sessions.has(token)) {
        return res.status(403).json({ error: 'Invalid session' });
      }
      next();
    });
  });

  describe('Login Protection', () => {
    it('should reject login without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow login with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send(testUser);
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBe('test-token');
    });

    it('should reject login with expired CSRF token', async () => {
      // Get initial token
      const { token, cookies } = await getCSRFToken(app);
      
      // Wait for token to expire (cookie maxAge is set to 1ms in test mode)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send(testUser);
      
      expect(response.status).toBe(403);
    });
  });

  describe('Registration Protection', () => {
    it('should reject registration without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow registration with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send(testUser);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User registered successfully');
    });
  });

  describe('Password Reset Protection', () => {
    it('should reject password reset without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: testUser.email });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow password reset with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/password-reset')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ email: testUser.email });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });
  });

  describe('Session Management', () => {
    it('should issue new CSRF token after login', async () => {
      const { token: initialToken, cookies: initialCookies } = await getCSRFToken(app);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initialCookies)
        .set('X-CSRF-TOKEN', initialToken)
        .send(testUser);

      expect(loginResponse.headers['set-cookie']).toBeDefined();
      expect(loginResponse.headers['set-cookie'].some((c: string) => c.includes('XSRF-TOKEN'))).toBe(true);
    });

    it('should invalidate old CSRF token after logout', async () => {
      // First login
      const { token, cookies } = await getCSRFToken(app);
      
      await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send(testUser);

      // Then logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);

      // Try to use the old token
      const response = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send(testUser);

      expect(response.status).toBe(403);
    });
  });
});
