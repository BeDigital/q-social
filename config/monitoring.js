const winston = require('winston');
const Sentry = require('@sentry/node');
const { Integrations } = require('@sentry/tracing');

// Configure Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [new Integrations.Express()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
    // Sanitize sensitive data
    if (event.request && event.request.data) {
      delete event.request.data.password;
      delete event.request.data.token;
    }
    return event;
  },
});

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'q-social' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write production logs to file
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: '/var/log/q-social/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: '/var/log/q-social/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
});

// Configure metrics
const metrics = {
  // Response time histogram
  responseTime: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  }),

  // Request counter
  requestCount: new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  // Active WebSocket connections gauge
  wsConnections: new client.Gauge({
    name: 'ws_connections_current',
    help: 'Number of currently active WebSocket connections',
  }),

  // Database query duration histogram
  dbQueryDuration: new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // Cache hit ratio gauge
  cacheHitRatio: new client.Gauge({
    name: 'cache_hit_ratio',
    help: 'Cache hit ratio',
  }),

  // Memory usage gauge
  memoryUsage: new client.Gauge({
    name: 'process_memory_bytes',
    help: 'Process memory usage in bytes',
  }),
};

// Health check function
const healthCheck = async () => {
  try {
    // Check database connection
    await db.raw('SELECT 1');

    // Check Redis connection
    await redis.ping();

    // Check disk space
    const diskSpace = await checkDiskSpace('/');
    const diskSpaceOk = (diskSpace.free / diskSpace.size) > 0.1;

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryOk = (memoryUsage.heapUsed / memoryUsage.heapTotal) < 0.9;

    return {
      status: 'healthy',
      checks: {
        database: true,
        redis: true,
        diskSpace: diskSpaceOk,
        memory: memoryOk,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Error tracking middleware
const errorTracking = (err, req, res, next) => {
  // Log error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Track error in Sentry
  Sentry.captureException(err);

  // Update metrics
  metrics.requestCount.labels(req.method, req.route?.path || 'unknown', 500).inc();

  next(err);
};

// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
  const start = process.hrtime();

  // Track response time
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    metrics.responseTime
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .observe(durationInSeconds);

    metrics.requestCount
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .inc();
  });

  next();
};

// Resource usage monitoring
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  metrics.memoryUsage.set(memoryUsage.heapUsed);

  // Log resource usage if above threshold
  if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
    logger.warn('High memory usage detected', {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
    });
  }
}, 60000); // Check every minute

module.exports = {
  logger,
  metrics,
  healthCheck,
  errorTracking,
  performanceMonitoring,
};
