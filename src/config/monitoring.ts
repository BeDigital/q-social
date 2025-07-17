import winston from 'winston';

// Configure logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'test' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'q-social' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Performance monitoring configuration
export const performanceConfig = {
  sampleRate: process.env.NODE_ENV === 'test' ? 1 : 0.1,
  metrics: {
    responseTime: {
      buckets: [10, 50, 100, 200, 500, 1000, 2000],
      timeout: 5000
    },
    requestRate: {
      interval: 60000,
      threshold: process.env.NODE_ENV === 'test' ? 100 : 1000
    },
    errorRate: {
      interval: 60000,
      threshold: 0.05
    }
  },
  alerts: {
    responseTime: {
      warning: 1000,
      critical: 2000
    },
    errorRate: {
      warning: 0.02,
      critical: 0.05
    },
    memory: {
      warning: 80,
      critical: 90
    }
  }
};

// Error tracking configuration
export const errorConfig = {
  sampling: {
    base: 1,
    rate: process.env.NODE_ENV === 'test' ? 1 : 0.1
  },
  ignore: [
    'ERR_NETWORK',
    'ECONNRESET',
    'ECONNREFUSED'
  ],
  grouping: {
    timeWindow: 300000,
    maxGroups: 1000
  }
};

// Tracing configuration
export const tracingConfig = {
  enabled: true,
  sampleRate: process.env.NODE_ENV === 'test' ? 1 : 0.1,
  excludePaths: [
    '/health',
    '/metrics'
  ]
};
