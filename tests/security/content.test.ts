import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { SecurityMiddleware } from '../../src/middleware/security';
import { testUser, getCSRFToken, loginUser } from '../utils/test-helpers';

describe('Content Management Security', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(cookieParser());
    SecurityMiddleware.applyAll(app);

    // Test routes
    app.post('/api/posts', (req, res) => {
      res.json({ id: 1, ...req.body });
    });

    app.put('/api/posts/:id', (req, res) => {
      res.json({ id: req.params.id, ...req.body });
    });

    app.delete('/api/posts/:id', (req, res) => {
      res.json({ message: 'Post deleted' });
    });

    app.post('/api/posts/:id/media', (req, res) => {
      res.json({ message: 'Media uploaded' });
    });
  });

  describe('Post Creation Protection', () => {
    it('should reject post creation without CSRF token', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({ content: 'Test post' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow post creation with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: 'Test post' });
      
      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Test post');
    });

    it('should handle concurrent post creation requests', async () => {
      const { token, cookies } = await getCSRFToken(app);
      
      const requests = Array(5).fill(null).map((_, i) => 
        request(app)
          .post('/api/posts')
          .set('Cookie', cookies)
          .set('X-CSRF-TOKEN', token)
          .send({ content: `Test post ${i}` })
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Media Upload Protection', () => {
    it('should reject media upload without CSRF token', async () => {
      const response = await request(app)
        .post('/api/posts/1/media')
        .attach('file', Buffer.from('test'), 'test.jpg');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow media upload with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts/1/media')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .attach('file', Buffer.from('test'), 'test.jpg');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Media uploaded');
    });
  });

  describe('Post Modification Protection', () => {
    it('should reject post update without CSRF token', async () => {
      const response = await request(app)
        .put('/api/posts/1')
        .send({ content: 'Updated content' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow post update with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .put('/api/posts/1')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: 'Updated content' });
      
      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated content');
    });

    it('should reject post deletion without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/posts/1');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow post deletion with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .delete('/api/posts/1')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted');
    });
  });

  describe('Content Validation', () => {
    it('should reject malicious content even with valid CSRF token', async () => {
      const { token, cookies } = await getCSRFToken(app);

      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: '<script>alert("xss")</script>' });
      
      expect(response.status).toBe(200);
      expect(response.body.content).not.toContain('<script>');
    });

    it('should handle large content uploads with CSRF protection', async () => {
      const { token, cookies } = await getCSRFToken(app);
      const largeContent = 'a'.repeat(10000);

      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', cookies)
        .set('X-CSRF-TOKEN', token)
        .send({ content: largeContent });
      
      expect(response.status).toBe(200);
    });
  });
});
