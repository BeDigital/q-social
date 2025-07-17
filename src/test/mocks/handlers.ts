import { rest } from 'msw';
import { mockPosts, mockUsers } from './data';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;
    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token',
          user: mockUsers[0],
        })
      );
    }
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  // Posts endpoints
  rest.get('/api/posts', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        posts: mockPosts,
        total: mockPosts.length,
      })
    );
  }),

  rest.post('/api/posts', async (req, res, ctx) => {
    const { content } = await req.json();
    const newPost = {
      id: Date.now(),
      content,
      user: mockUsers[0],
      likes: [],
      comments: [],
      created_at: new Date().toISOString(),
    };
    return res(
      ctx.status(201),
      ctx.json(newPost)
    );
  }),

  // Users endpoints
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    const user = mockUsers.find(u => u.id === parseInt(id as string));
    if (user) {
      return res(ctx.status(200), ctx.json(user));
    }
    return res(ctx.status(404), ctx.json({ message: 'User not found' }));
  }),

  // Social interaction endpoints
  rest.post('/api/posts/:id/like', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Post liked successfully' })
    );
  }),

  rest.post('/api/posts/:id/comment', async (req, res, ctx) => {
    const { content } = await req.json();
    const newComment = {
      id: Date.now(),
      content,
      user: mockUsers[0],
      created_at: new Date().toISOString(),
    };
    return res(
      ctx.status(201),
      ctx.json(newComment)
    );
  }),

  // WebSocket mock (for testing purposes)
  rest.get('/ws', (req, res, ctx) => {
    return res(
      ctx.status(101),
      ctx.set('Upgrade', 'websocket'),
      ctx.set('Connection', 'Upgrade')
    );
  }),
];
