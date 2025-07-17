# Technical Design Document

## System Architecture Overview

### Technology Stack
- Frontend: React 18 with TypeScript
- State Management: Redux Toolkit
- Backend: Node.js with Express and TypeScript
- Database: SQLite with TypeORM
- Authentication: JWT + OAuth2
- Real-time: Socket.io
- Testing: Jest, React Testing Library, Cypress
- Build Tools: Vite
- Package Manager: pnpm

### High-Level Architecture
```
├── Client (React + TypeScript)
│   ├── Public Assets
│   ├── Components
│   ├── Pages
│   ├── Store (Redux)
│   ├── Services
│   └── Utils
│
├── Server (Node.js + TypeScript)
│   ├── API Routes
│   ├── Controllers
│   ├── Services
│   ├── Models
│   ├── Middleware
│   └── Utils
│
├── Database (SQLite)
│   ├── Migrations
│   ├── Seeds
│   └── TypeORM Entities
│
└── Shared
    ├── Types
    ├── Constants
    └── Validators
```

## Technical Design Details

### Database Schema

```sql
-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_image TEXT,
    bio TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    scheduled_for DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Likes
CREATE TABLE likes (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Followers
CREATE TABLE followers (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
);

-- Hashtags
CREATE TABLE hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PostHashtags
CREATE TABLE post_hashtags (
    post_id INTEGER NOT NULL,
    hashtag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (hashtag_id) REFERENCES hashtags(id)
);

-- Notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Endpoints

All endpoints require HTTPS and include appropriate security headers. Base URL: `https://api.example.com`

```typescript
// Authentication (All endpoints enforce TLS)
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

// Users (TLS required)
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/followers
GET    /api/users/:id/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
PUT    /api/users/:id/privacy

// Posts (TLS required)
GET    /api/posts
GET    /api/posts/:id
POST   /api/posts
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/like
DELETE /api/posts/:id/like
POST   /api/posts/:id/repost

// Comments (TLS required)
GET    /api/posts/:id/comments
POST   /api/posts/:id/comments
DELETE /api/comments/:id

// Search (TLS required)
GET    /api/search/users
GET    /api/search/posts
GET    /api/search/hashtags

// Notifications (TLS required)
GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/settings

// WebSocket connections (WSS required)
WSS    /ws/notifications
WSS    /ws/chat
```

### API Security Headers
```typescript
// Example API middleware for security headers
app.use((req, res, next) => {
  // Enforce HTTPS
  if (!req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
});

### Frontend Architecture

#### Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   ├── post/
│   │   ├── PostCard/
│   │   ├── PostForm/
│   │   └── PostList/
│   └── user/
│       ├── Profile/
│       ├── FollowButton/
│       └── UserList/
├── pages/
│   ├── Home/
│   ├── Profile/
│   ├── Explore/
│   └── Notifications/
└── features/
    ├── auth/
    ├── posts/
    ├── users/
    └── notifications/
```

#### State Management
```typescript
// Redux Store Structure
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
  };
  posts: {
    feed: Post[];
    userPosts: Post[];
    currentPost: Post | null;
    loading: boolean;
    error: string | null;
  };
  users: {
    profiles: { [key: string]: User };
    following: string[];
    followers: string[];
    loading: boolean;
    error: string | null;
  };
  notifications: {
    items: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
  };
}
```

## Technical Specifications

### Content Limitations
```typescript
const CONTENT_LIMITS = {
  post: {
    maxLength: 280,
    minLength: 1
  },
  media: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    maxImagesPerPost: 4,
    maxVideoDuration: 140 // seconds
  },
  rateLimit: {
    posts: {
      window: '15m',
      max: 300
    },
    likes: {
      window: '15m',
      max: 1000
    },
    follows: {
      window: '24h',
      max: 400
    }
  }
};
```

### Security Configurations
```typescript
const SECURITY_CONFIG = {
  passwords: {
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  rateLimiting: {
    login: {
      window: '15m',
      max: 5
    },
    registration: {
      window: '24h',
      max: 3
    },
    api: {
      window: '15m',
      max: 100
    }
  },
  sessions: {
    jwtExpiry: '15m',
    refreshTokenExpiry: '7d',
    sessionTimeout: '24h'
  }
};
```

### Caching Strategy
```typescript
const CACHE_CONFIG = {
  feed: {
    ttl: '5m',
    maxItems: 1000
  },
  posts: {
    ttl: '1h',
    maxItems: 10000
  },
  users: {
    ttl: '30m',
    maxItems: 5000
  },
  media: {
    ttl: '24h',
    maxSize: '1GB'
  }
};
```

## Implementation Approach

### Phase 1: Core Features
1. User Authentication
   - Registration and login
   - JWT token management
   - Password reset flow

2. Post Management
   - CRUD operations for posts
   - Media upload integration
   - Post feed implementation

3. Basic Social Features
   - Follow/unfollow functionality
   - Like/unlike posts
   - Basic commenting system

### Phase 2: Enhanced Features
1. Real-time Updates
   - Socket.io integration
   - Live notifications
   - Feed updates

2. Advanced Social Features
   - Hashtag system
   - @mentions
   - Reposting

3. Media Handling
   - Image optimization
   - Video upload support
   - Link preview generation

### Phase 3: Performance & Polish
1. Optimization
   - Infinite scroll
   - Virtual list implementation
   - Image lazy loading

2. Offline Support
   - Service Worker setup
   - Offline post drafts
   - Cache management

## Testing Strategy

### Unit Testing
```typescript
// Example test suite for PostCard component
describe('PostCard', () => {
  it('renders post content correctly', () => {
    const post = {
      id: 1,
      content: 'Test post',
      user: { username: 'testuser' }
    };
    render(<PostCard post={post} />);
    expect(screen.getByText('Test post')).toBeInTheDocument();
  });

  it('handles like interaction', async () => {
    const onLike = jest.fn();
    render(<PostCard post={post} onLike={onLike} />);
    await userEvent.click(screen.getByRole('button', { name: /like/i }));
    expect(onLike).toHaveBeenCalled();
  });
});
```

### Integration Testing
- API integration tests
- User flow testing
- State management tests
- Database operations

### E2E Testing
```typescript
// Example Cypress test
describe('Post Creation', () => {
  beforeEach(() => {
    cy.login();
  });

  it('creates a new post', () => {
    cy.visit('/');
    cy.get('[data-testid="post-input"]').type('New post content');
    cy.get('[data-testid="post-submit"]').click();
    cy.get('[data-testid="post-list"]')
      .should('contain', 'New post content');
  });
});
```

## UI/UX Design Strategy

### Component Library
- Custom component library built with styled-components
- Responsive design system
- Dark/light theme support
- Accessibility-first approach

### Design System
```typescript
// Theme configuration
const theme = {
  colors: {
    primary: '#1DA1F2',
    secondary: '#14171A',
    background: '#FFFFFF',
    text: '#657786',
    error: '#E0245E'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  typography: {
    h1: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: 1.2
    },
    body: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5
    }
  }
};
```

### Responsive Design
```typescript
const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px'
};

const media = {
  mobile: `@media (min-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`
};
```

## Performance Optimization

### Frontend Optimization
- Code splitting
- Tree shaking
- Asset optimization
- Caching strategy
- Lazy loading

### Backend Optimization
- Query optimization
- Connection pooling
- Rate limiting
- Response caching
- Compression

## Security Measures

### TLS Implementation
- Enforce TLS 1.3 for all connections
- HTTP to HTTPS redirection
- HSTS (HTTP Strict Transport Security) implementation
- Secure cookie attributes (Secure, HttpOnly)
- Strong cipher suite configuration:
  ```nginx
  ssl_protocols TLSv1.3;
  ssl_prefer_server_ciphers off;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
  ```
- Regular SSL/TLS certificate rotation
- Certificate pinning for mobile applications
- Monitoring of certificate expiration

### Authentication
- JWT with refresh tokens (transmitted only over HTTPS)
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Session management with secure session cookies
- TLS client certificate authentication for admin access

### Data Protection
- Input validation
- XSS prevention
- CSRF protection with secure tokens
- SQL injection prevention
- Content security policy
- TLS for all API endpoints
- End-to-end encryption for sensitive data
- Secure WebSocket connections (wss://)

## Monitoring and Logging

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- User analytics
- API metrics

### Logging Strategy
```typescript
// Logging configuration
const logger = {
  info: (message: string, meta?: object) => {
    // Log info level messages
  },
  error: (error: Error, meta?: object) => {
    // Log error level messages
  },
  warn: (message: string, meta?: object) => {
    // Log warning level messages
  }
};
```

## Deployment Strategy

### Security Configuration
- TLS 1.3 configuration for all environments
- Automated certificate management with Let's Encrypt
- SSL/TLS configuration validation
- Regular security audits
- Secure key management using AWS KMS

### Development Pipeline
1. Local development (with self-signed certificates)
2. Development environment (with valid TLS certificates)
3. Staging environment (with production-like TLS setup)
4. Production environment (with full TLS implementation)

### CI/CD Pipeline
- GitHub Actions for automation
- Automated testing
- Code quality checks
- Security scanning
- TLS configuration validation
- Deployment automation
- Certificate renewal automation

### Infrastructure Setup
```yaml
# Example nginx configuration
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # HSTS configuration
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy configuration
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
    
    # Static file serving
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}

## Future Considerations

### Scalability
- Database sharding
- Caching layer
- Load balancing
- CDN integration

### Feature Extensions
- Direct messaging
- Group functionality
- Content monetization
- Analytics dashboard

## Detailed Implementation Specifications

### Media Upload Flow
```typescript
interface MediaUploadConfig {
  maxConcurrentUploads: number;
  chunkSize: number;
  retryAttempts: number;
  allowedTypes: string[];
  processingSteps: {
    validation: MediaValidationConfig;
    compression: CompressionConfig;
    transformation: TransformationConfig;
  };
}

interface UploadPipeline {
  // Pre-upload
  validateFile: (file: File) => Promise<ValidationResult>;
  prepareUpload: (file: File) => Promise<UploadContext>;
  
  // Upload
  initiateUpload: (context: UploadContext) => Promise<UploadSession>;
  uploadChunks: (session: UploadSession) => Promise<UploadProgress>;
  finalizeUpload: (session: UploadSession) => Promise<MediaResource>;
  
  // Post-upload
  processMedia: (resource: MediaResource) => Promise<ProcessedMedia>;
  generatePreviews: (media: ProcessedMedia) => Promise<MediaPreviews>;
}
```

### Error Handling Strategy
```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  help?: string;
  requestId: string;
}

const ERROR_HANDLERS = {
  // Network errors
  NETWORK_ERROR: async (error: NetworkError) => {
    await retry(error.request, { maxAttempts: 3 });
    trackError('network', error);
  },
  
  // Authentication errors
  AUTH_ERROR: async (error: AuthError) => {
    await refreshToken();
    trackError('auth', error);
  },
  
  // Validation errors
  VALIDATION_ERROR: (error: ValidationError) => {
    displayFieldErrors(error.details);
    trackError('validation', error);
  },
  
  // Rate limiting
  RATE_LIMIT_ERROR: async (error: RateLimitError) => {
    await handleBackoff(error.retryAfter);
    trackError('rateLimit', error);
  }
};
```

### Offline Functionality
```typescript
interface OfflineConfig {
  // Data persistence
  storage: {
    posts: CacheConfig;
    media: CacheConfig;
    user: CacheConfig;
  };
  
  // Sync strategy
  sync: {
    priority: SyncPriority;
    conflictResolution: ConflictStrategy;
    retryPolicy: RetryPolicy;
  };
  
  // Service Worker
  serviceWorker: {
    routes: RouteConfig[];
    cacheStrategy: CacheStrategy;
    backgroundSync: BackgroundSyncConfig;
  };
}

class OfflineManager {
  async initialize() {
    await this.registerServiceWorker();
    await this.setupOfflineStorage();
    await this.initSyncManager();
  }
  
  async handleOfflineAction(action: Action): Promise<void> {
    await this.queueAction(action);
    await this.updateLocalState(action);
    await this.scheduleSyncAttempt();
  }
}
```

### Monitoring and Observability

#### Metrics Collection
```typescript
interface MetricsConfig {
  collection: {
    interval: number;
    sampleRate: number;
    maxQueueSize: number;
  };
  
  metrics: {
    // Performance metrics
    performance: {
      pageLoad: MetricDefinition;
      apiLatency: MetricDefinition;
      resourceUsage: MetricDefinition;
    };
    
    // Business metrics
    business: {
      activeUsers: MetricDefinition;
      postEngagement: MetricDefinition;
      userRetention: MetricDefinition;
    };
    
    // Infrastructure metrics
    infrastructure: {
      errorRate: MetricDefinition;
      systemLoad: MetricDefinition;
      networkStatus: MetricDefinition;
    };
  };
}
```

#### Alert Thresholds
```typescript
const ALERT_THRESHOLDS = {
  // Performance alerts
  performance: {
    pageLoadTime: {
      warning: 2000, // ms
      critical: 5000, // ms
    },
    apiLatency: {
      warning: 500, // ms
      critical: 2000, // ms
    },
    memoryUsage: {
      warning: 80, // percent
      critical: 90, // percent
    },
  },
  
  // Error alerts
  errors: {
    rate: {
      warning: 0.1, // 10% error rate
      critical: 0.25, // 25% error rate
    },
    severity: {
      high: 'immediate',
      medium: '15m',
      low: '1h',
    },
  },
  
  // Business alerts
  business: {
    userActivity: {
      warning: -20, // 20% decrease
      critical: -40, // 40% decrease
    },
    engagement: {
      warning: -15, // 15% decrease
      critical: -30, // 30% decrease
    },
  },
};
```

#### Logging Standards
```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  traceId: string;
  spanId: string;
  userId?: string;
  action: string;
  message: string;
  metadata: {
    environment: string;
    version: string;
    host: string;
  };
  context: Record<string, any>;
}

const LOGGING_CONFIG = {
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  },
  
  retention: {
    ERROR: '30d',
    WARN: '14d',
    INFO: '7d',
    DEBUG: '24h',
  },
  
  sampling: {
    ERROR: 1.0, // 100%
    WARN: 1.0, // 100%
    INFO: 0.5, // 50%
    DEBUG: 0.1, // 10%
  },
};
