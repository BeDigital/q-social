import { EssentialWafService } from '../../src/services/essential-waf';
import { EssentialMonitor } from '../../src/services/essential-monitor';

export const createSecurityConfig = (environment: string) => {
  const isProduction = environment === 'production';

  return {
    waf: {
      enabled: true,
      region: process.env.AWS_REGION || 'us-west-2',
      allowedCountries: ['US'],
      rateLimit: isProduction ? 2000 : 5000
    },

    monitoring: {
      enabled: true,
      region: process.env.AWS_REGION || 'us-west-2',
      metricNamespace: `Q-Social/${environment}`
    },

    security: {
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      
      cors: {
        origin: isProduction ? 'https://be-digital-q-social' : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count'],
        credentials: true,
        maxAge: 86400
      }
    }
  };
};
