import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { SecurityMiddleware } from '../../src/middleware/security';
import { testUser, getCSRFToken } from '../utils/test-helpers';

describe('Social Authentication', () => {
  let app: express.Application;
  let validStates: Map<string, { timestamp: number, csrfToken: string }>;

  beforeEach(() => {
    app = express();
    SecurityMiddleware.applyAll(app);
    validStates = new Map();

    // Mock OAuth routes
    app.get('/api/auth/oauth/:provider', (req, res) => {
      const { provider } = req.params;
      const csrfToken = req.headers['x-csrf-token'] as string;
      
      // Generate and store state parameter
      const state = crypto.randomBytes(32).toString('hex');
      validStates.set(state, {
        timestamp: Date.now(),
        csrfToken
      });

      const redirectUrl = `https://oauth.provider.com/auth?client_id=test&redirect_uri=callback&state=${state}`;
      res.json({ redirectUrl, state });
    });

    app.get('/api/auth/oauth/:provider/callback', (req, res) => {
      const { code, state } = req.query;
      
      // Validate state parameter
      const stateData = validStates.get(state as string);
      if (!code || !state || !stateData) {
        return res.status(400).json({ error: 'Invalid OAuth callback parameters' });
      }

      // Check state expiration (5 minutes)
      if (Date.now() - stateData.timestamp > 300000) {
        validStates.delete(state as string);
        return res.status(400).json({ error: 'OAuth state expired' });
      }

      // Clean up used state
      validStates.delete(state as string);

      res.json({ token: 'test-oauth-token', user: testUser });
    });

    app.post('/api/auth/link/:provider', (req, res) => {
      const { provider } = req.params;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }
      res.json({ message: `Account linked with ${provider}` });
    });
  });

  describe('OAuth2 Flow', () => {
    it('should initiate OAuth2 flow with provider', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .query({ redirect_uri: 'http://localhost:3000/callback' });

      expect(response.status).toBe(200);
      expect(response.body.redirectUrl).toContain('oauth.provider.com/auth');
      expect(response.body.state).toBeDefined();
      expect(validStates.has(response.body.state)).toBe(true);
    });

    it('should handle OAuth2 callback with valid state', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // First get state from OAuth init
      const initResponse = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .query({ redirect_uri: 'http://localhost:3000/callback' });

      const { state } = initResponse.body;

      // Then handle callback
      const response = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should reject callback without code', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // First get state
      const initResponse = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);

      const { state } = initResponse.body;

      // Then try callback without code
      const response = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({ state });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid OAuth callback parameters');
    });
  });

  describe('Profile Integration', () => {
    it('should link social account with CSRF protection', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/auth/link/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ token: 'social-access-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account linked with google');
    });

    it('should reject account linking without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/link/google')
        .send({ token: 'social-access-token' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });
  });

  describe('Security Measures', () => {
    it('should validate state parameter', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state: 'invalid-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid OAuth callback parameters');
    });

    it('should prevent CSRF in OAuth flow', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // First request to get state
      const initResponse = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);

      // Try callback with different state
      const callbackResponse = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state: 'different-state'
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error).toBe('Invalid OAuth callback parameters');
    });

    it('should expire state after timeout', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Get state from OAuth init
      const initResponse = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);

      const { state } = initResponse.body;

      // Manually expire the state
      const stateData = validStates.get(state);
      if (stateData) {
        stateData.timestamp = Date.now() - 301000; // 5 minutes + 1 second
        validStates.set(state, stateData);
      }

      // Try callback with expired state
      const response = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('OAuth state expired');
    });

    it('should prevent state reuse', async () => {
      const { token, cookies } = await getCSRFToken(app);

      // Get state from OAuth init
      const initResponse = await request(app)
        .get('/api/auth/oauth/google')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);

      const { state } = initResponse.body;

      // First callback
      await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state
        });

      // Try to reuse the same state
      const response = await request(app)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid OAuth callback parameters');
    });
  });
});
