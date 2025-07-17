# Security Implementation Guide

## CSRF Protection

The Q-Social platform implements robust CSRF (Cross-Site Request Forgery) protection using a token-based approach. This document outlines the implementation details and usage guidelines.

### Implementation Details

1. Token Generation
   - Tokens are generated using cryptographically secure random values
   - Each token is associated with a timestamp for expiration tracking
   - Tokens are managed through a singleton pattern to ensure consistent state

2. Token Storage
   - Tokens are stored server-side in a Map data structure
   - Each token entry includes:
     - Token value
     - Creation timestamp
   - Automatic cleanup of expired tokens

3. Token Lifecycle
   - Generation: On initial request and after successful authentication
   - Validation: On every non-GET request
   - Expiration: Configurable based on environment
     - Production: 1 hour
     - Test: 1 second
   - Cleanup: During token generation and logout

### Usage in Requests

1. Getting a CSRF Token
   ```typescript
   // The token is automatically set in a cookie named 'XSRF-TOKEN'
   // No explicit action needed for initial token generation
   ```

2. Making Protected Requests
   ```typescript
   // Include the token in the X-CSRF-TOKEN header
   fetch('/api/endpoint', {
     method: 'POST',
     headers: {
       'X-CSRF-TOKEN': 'token-from-cookie',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(data)
   });
   ```

### Security Features

1. Double Submit Cookie Pattern
   - Token stored in cookie and required in header
   - Prevents CSRF attacks even if cookie is stolen

2. Token Expiration
   - Tokens expire after a configurable period
   - Expired tokens are automatically rejected
   - Cleanup process prevents token accumulation

3. Secure Configuration
   - Secure cookie settings in production
   - HTTPS enforcement
   - Strict CORS policy

4. Error Handling
   - Clear error messages in development
   - Generic security errors in production
   - Proper error status codes (403 for invalid tokens)

### Testing

1. Test Environment Configuration
   ```typescript
   // Test helpers available in tests/utils/test-helpers.ts
   const { token, cookies } = await getCSRFToken(app);
   ```

2. Test Cases
   - Token validation
   - Expiration handling
   - Session management
   - Error scenarios

### Integration with Other Security Measures

1. Rate Limiting
   - Prevents token harvesting
   - Configurable limits per endpoint

2. Session Management
   - Token invalidation on logout
   - New token generation on login

3. Security Headers
   - CORS configuration
   - Content Security Policy
   - Other security headers via Helmet

### Best Practices

1. Always use the provided middleware
   ```typescript
   SecurityMiddleware.applyAll(app);
   ```

2. Never skip CSRF protection except for:
   - GET requests
   - Public endpoints (explicitly marked)
   - Test endpoints (in test environment only)

3. Handle errors appropriately
   - Catch CSRF errors
   - Provide user feedback
   - Log security events

4. Regular maintenance
   - Monitor token usage
   - Review security logs
   - Update security configurations

### Configuration

1. Environment Variables
   ```env
   NODE_ENV=production|test
   CSRF_TOKEN_EXPIRY=3600000
   ```

2. Security Settings
   ```typescript
   // in config/security.ts
   export const securityConfig = {
     csrf: {
       enabled: true,
       cookieName: 'XSRF-TOKEN',
       headerName: 'X-CSRF-TOKEN'
     }
     // ... other security settings
   };
   ```

## Additional Security Measures

### Input Validation
- All user input is sanitized
- Type validation
- Content validation

### File Upload Security
- File type validation
- Size limits
- Malware scanning

### Error Handling
- Security-focused error messages
- Proper status codes
- Logging of security events

### Session Management
- Secure session handling
- Token rotation
- Proper cleanup

### Monitoring
- Security event logging
- Error tracking
- Performance monitoring

## Security Checklist

- [x] CSRF Protection
- [x] Input Validation
- [x] XSS Prevention
- [x] Secure Headers
- [x] Rate Limiting
- [x] File Upload Security
- [x] Error Handling
- [x] Session Management
- [x] Logging
- [x] Monitoring
