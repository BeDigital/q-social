import { Router, Request, Response } from 'express';

const router = Router();

// Test route index
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Test routes are working',
    available_endpoints: [
      '/test',
      '/test/error',
      '/test/csrf'
    ]
  });
});

// Basic test endpoint
router.get('/test', (_req: Request, res: Response) => {
  res.json({ message: 'GET request successful' });
});

// Test POST endpoint
router.post('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'POST request successful',
    data: req.body
  });
});

// Test error handling
router.get('/test/error', (_req: Request, res: Response) => {
  throw new Error('Test error handling');
});

// Test CSRF protection
router.post('/test/csrf', (req: Request, res: Response) => {
  res.json({ 
    message: 'CSRF protection test successful',
    token: req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
  });
});

export default router;
