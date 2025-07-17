export default {
  security: {
    csrf: {
      tokenLength: 32,
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-CSRF-TOKEN',
      expiryTime: process.env.NODE_ENV === 'test' ? 1000 : 3600000
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      saltLength: 16,
      ivLength: 12,
      tagLength: 16,
      iterations: 100000,
      digest: 'sha512'
    },
    secrets: {
      rotationInterval: process.env.NODE_ENV === 'test' ? 1000 : 86400000, // 24 hours
      backupCount: 3
    },
    rateLimit: {
      windowMs: process.env.NODE_ENV === 'test' ? 15000 : 900000, // 15 minutes
      max: process.env.NODE_ENV === 'test' ? 10 : 100
    }
  },
  monitoring: {
    performance: {
      sampleRate: process.env.NODE_ENV === 'test' ? 1 : 0.1,
      logLevel: process.env.NODE_ENV === 'test' ? 'debug' : 'info'
    },
    errorTracking: {
      enabled: true,
      sampleRate: 1
    }
  },
  testing: {
    loadTest: {
      duration: process.env.NODE_ENV === 'test' ? 1 : 10,
      connections: process.env.NODE_ENV === 'test' ? 10 : 100,
      pipelining: 1,
      timeout: 10
    }
  }
}
