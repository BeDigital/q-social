import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { SecurityMiddleware } from '../../src/middleware/security';

describe('CSRF Protection', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // Apply security middleware
    SecurityMiddleware.applyAll(app);

    // Test routes
    app.get('/api/test', (req, res) => {
      res.json({ message: 'GET request successful' });
    });

    app.post('/api/test', (req, res) => {
      res.json({ message: 'POST request successful' });
    });
  });

  it('should allow GET requests without CSRF token', async () => {
    const response = await request(app)
      .get('/api/test');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('GET request successful');
  });

  it('should set CSRF token cookie on GET request', async () => {
    const response = await request(app)
      .get('/api/test');
    
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'].some((cookie: string) => 
      cookie.includes('XSRF-TOKEN')
    )).toBe(true);
  });

  it('should reject POST request without CSRF token', async () => {
    const response = await request(app)
      .post('/api/test')
      .send({ data: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid CSRF token');
  });

  it('should accept POST request with valid CSRF token', async () => {
    // First get the CSRF token
    const getResponse = await request(app)
      .get('/api/test');
    
    const cookies = getResponse.headers['set-cookie'];
    const csrfToken = cookies
      .find((cookie: string) => cookie.includes('XSRF-TOKEN'))
      ?.split(';')[0]
      .split('=')[1];

    // Then make POST request with the token
    const postResponse = await request(app)
      .post('/api/test')
      .set('Cookie', cookies)
      .set('X-CSRF-TOKEN', csrfToken)
      .send({ data: 'test' });
    
    expect(postResponse.status).toBe(200);
    expect(postResponse.body.message).toBe('POST request successful');
  });

  it('should reject POST request with invalid CSRF token', async () => {
    const response = await request(app)
      .post('/api/test')
      .set('X-CSRF-TOKEN', 'invalid-token')
      .send({ data: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid CSRF token');
  });

  it('should accept token from X-XSRF-TOKEN header', async () => {
    // First get the CSRF token
    const getResponse = await request(app)
      .get('/api/test');
    
    const cookies = getResponse.headers['set-cookie'];
    const csrfToken = cookies
      .find((cookie: string) => cookie.includes('XSRF-TOKEN'))
      ?.split(';')[0]
      .split('=')[1];

    // Then make POST request with the token in alternate header
    const postResponse = await request(app)
      .post('/api/test')
      .set('Cookie', cookies)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ data: 'test' });
    
    expect(postResponse.status).toBe(200);
    expect(postResponse.body.message).toBe('POST request successful');
  });

  it('should accept token from form field', async () => {
    // First get the CSRF token
    const getResponse = await request(app)
      .get('/api/test');
    
    const cookies = getResponse.headers['set-cookie'];
    const csrfToken = cookies
      .find((cookie: string) => cookie.includes('XSRF-TOKEN'))
      ?.split(';')[0]
      .split('=')[1];

    // Then make POST request with the token in form field
    const postResponse = await request(app)
      .post('/api/test')
      .set('Cookie', cookies)
      .send({ 
        _csrf: csrfToken,
        data: 'test' 
      });
    
    expect(postResponse.status).toBe(200);
    expect(postResponse.body.message).toBe('POST request successful');
  });
});
