import { Express } from 'express';
import request from 'supertest';

export interface TestUser {
  id?: number;
  username: string;
  email: string;
  password: string;
}

export interface TestPost {
  id?: number;
  content: string;
  userId?: number;
}

export const testUser: TestUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123!'
};

export async function getCSRFToken(app: Express): Promise<{token: string, cookies: string[]}> {
  const response = await request(app)
    .get('/api/test');
  
  const cookies = response.headers['set-cookie'];
  const csrfToken = cookies
    .find((cookie: string) => cookie.includes('XSRF-TOKEN'))
    ?.split(';')[0]
    .split('=')[1];

  return {
    token: csrfToken,
    cookies: cookies
  };
}

export async function loginUser(app: Express, user: TestUser): Promise<{token: string, cookies: string[]}> {
  // First get CSRF token
  const { token, cookies } = await getCSRFToken(app);

  // Login request
  const response = await request(app)
    .post('/api/auth/login')
    .set('Cookie', cookies)
    .set('X-CSRF-TOKEN', token)
    .send({
      email: user.email,
      password: user.password
    });

  return {
    token: response.body.token,
    cookies: response.headers['set-cookie'] || cookies
  };
}

export async function createTestPost(app: Express, authData: {token: string, cookies: string[]}, post: TestPost): Promise<TestPost> {
  const response = await request(app)
    .post('/api/posts')
    .set('Cookie', authData.cookies)
    .set('X-CSRF-TOKEN', authData.token)
    .send(post);

  return response.body;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
