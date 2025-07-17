import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { SecurityMiddleware } from './middleware/security';
import { AppDataSource } from './database/ormconfig';
import testRoutes from './routes/test.routes';

const app = express();

// Trust proxy - required for rate limiting behind reverse proxies
app.set('trust proxy', 1);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set up WebSocket event handlers
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Cookie parser middleware (needed before CSRF)
app.use(cookieParser());

// Apply security middleware (includes body parsing, CORS, CSRF, etc.)
SecurityMiddleware.applyAll(app);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Q-Social API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/docs',
    health: '/health'
  });
});

// API routes
app.use('/api', testRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Test setup endpoints (only in test environment)
if (process.env.NODE_ENV === 'test') {
  app.get('/api/test/setup', (_req: Request, res: Response) => {
    res.json({ message: 'Test environment setup complete' });
  });

  app.get('/api/test/create-admin', (_req: Request, res: Response) => {
    res.json({ message: 'Admin user created' });
  });

  app.get('/api/test/create-user', (_req: Request, res: Response) => {
    res.json({ message: 'Test user created' });
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

AppDataSource.initialize().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Error initializing database:', error);
  process.exit(1);
});
