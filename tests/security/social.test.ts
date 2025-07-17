import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { SecurityMiddleware } from '../../src/middleware/security';
import { testUser, getCSRFToken, loginUser } from '../utils/test-helpers';

describe('Social Interaction Security', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(cookieParser());
    SecurityMiddleware.applyAll(app);

    // Test routes
    app.post('/api/users/:id/follow', (req, res) => {
      res.json({ message: 'User followed' });
    });

    app.post('/api/posts/:id/like', (req, res) => {
      res.json({ message: 'Post liked' });
    });

    app.post('/api/posts/:id/comments', (req, res) => {
      res.json({ id: 1, ...req.body });
    });

    app.post('/api/posts/:id/share', (req, res) => {
      res.json({ message: 'Post shared' });
    });
  });

  describe('Follow/Unfollow Protection', () => {
    it('should reject follow action without CSRF token', async () => {
      const response = await request(app)
        .post('/api/users/1/follow');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow follow action with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/users/1/follow')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User followed');
    });

    it('should handle rapid follow/unfollow requests', async () => {
      const { token, cookies } = await getCSRFToken(app);
      
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/users/1/follow')
          .set('Cookie', cookies)
          .set('X-CSRF-TOKEN', token)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Like/Unlike Protection', () => {
    it('should reject like action without CSRF token', async () => {
      const response = await request(app)
        .post('/api/posts/1/like');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow like action with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts/1/like')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post liked');
    });

    it('should handle rapid like/unlike requests', async () => {
      const { token, cookies } = await getCSRFToken(app);
      
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/posts/1/like')
          .set('Cookie', cookies)
          .set('X-CSRF-TOKEN', token)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Comment Protection', () => {
    it('should reject comment without CSRF token', async () => {
      const response = await request(app)
        .post('/api/posts/1/comments')
        .send({ content: 'Test comment' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow comment with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts/1/comments')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: 'Test comment' });
      
      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Test comment');
    });

    it('should sanitize comment content', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts/1/comments')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: '<script>alert("xss")</script>' });
      
      expect(response.status).toBe(200);
      expect(response.body.content).not.toContain('<script>');
    });
  });

  describe('Share Protection', () => {
    it('should reject share action without CSRF token', async () => {
      const response = await request(app)
        .post('/api/posts/1/share');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow share action with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts/1/share')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post shared');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should maintain CSRF protection under rate limiting', async () => {
      const { token, cookies } = await getCSRFToken(app);
      
      // Make many requests quickly
      const requests = Array(150).fill(null).map(() => 
        request(app)
          .post('/api/posts/1/like')
          .set('Cookie', cookies)
          .set('X-CSRF-TOKEN', token)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      expect(responses.some(r => r.status === 429)).toBe(true);
      // But none should bypass CSRF
      expect(responses.every(r => r.status === 200 || r.status === 429)).toBe(true);
    });
  });
});
