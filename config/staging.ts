export default {
  env: 'staging',
  server: {
    port: process.env.PORT || 3000,
    apiUrl: process.env.API_URL || 'https://api-staging.example.com',
    frontendUrl: process.env.FRONTEND_URL || 'https://staging.example.com',
  },
  database: {
    path: process.env.DB_PATH || './data/staging.sqlite',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || 'https://staging.example.com').split(','),
    tlsKeyPath: process.env.TLS_KEY_PATH || './certs/staging/key.pem',
    tlsCertPath: process.env.TLS_CERT_PATH || './certs/staging/cert.pem',
  },
  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH || './uploads/staging',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN,
  },
};
