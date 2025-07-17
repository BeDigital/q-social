export default {
  env: 'production',
  server: {
    port: process.env.PORT || 3000,
    apiUrl: process.env.API_URL || 'https://api.example.com',
    frontendUrl: process.env.FRONTEND_URL || 'https://example.com',
  },
  database: {
    path: process.env.DB_PATH || './data/prod.sqlite',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || 'https://example.com').split(','),
    tlsKeyPath: process.env.TLS_KEY_PATH || './certs/prod/key.pem',
    tlsCertPath: process.env.TLS_CERT_PATH || './certs/prod/cert.pem',
  },
  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH || './uploads/prod',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '50', 10), // Stricter rate limiting in production
  },
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'warn',
    sentryDsn: process.env.SENTRY_DSN,
  },
};
