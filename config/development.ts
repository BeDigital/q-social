export default {
  env: 'development',
  server: {
    port: process.env.PORT || 3000,
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  database: {
    path: process.env.DB_PATH || './data/dev.sqlite',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    jwtExpiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    tlsKeyPath: process.env.TLS_KEY_PATH || './certs/dev/key.pem',
    tlsCertPath: process.env.TLS_CERT_PATH || './certs/dev/cert.pem',
  },
  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH || './uploads/dev',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'debug',
    sentryDsn: process.env.SENTRY_DSN,
  },
};
