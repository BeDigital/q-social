# Q-Social API Documentation

## Overview

Q-Social provides a RESTful API that enables developers to interact with the platform programmatically. All API endpoints require HTTPS and include appropriate security headers.

Base URL: `https://api.example.com`

## Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <token>
```

### Authentication Endpoints

#### POST /api/auth/register
Create a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "token": "string",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string"
  }
}
```

#### POST /api/auth/login
Authenticate a user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "token": "string",
  "refreshToken": "string",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string"
  }
}
```

## Posts

### POST /api/posts
Create a new post.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "content": "string",
  "mediaUrls": ["string"],
  "isDraft": "boolean",
  "scheduledFor": "string (ISO date)"
}
```

**Response:** `201 Created`
```json
{
  "id": "number",
  "content": "string",
  "mediaUrls": ["string"],
  "user": {
    "id": "number",
    "username": "string"
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

### GET /api/posts
Get posts feed.

**Authentication Required:** Yes

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `userId` (number, optional)
- `hashtag` (string, optional)

**Response:** `200 OK`
```json
{
  "posts": [{
    "id": "number",
    "content": "string",
    "mediaUrls": ["string"],
    "user": {
      "id": "number",
      "username": "string"
    },
    "likes": ["number"],
    "comments": ["number"],
    "createdAt": "string",
    "updatedAt": "string"
  }],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```

## Social Interactions

### POST /api/posts/{id}/like
Like a post.

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Post liked successfully"
}
```

### DELETE /api/posts/{id}/like
Unlike a post.

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Post unliked successfully"
}
```

### POST /api/users/{id}/follow
Follow a user.

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "User followed successfully"
}
```

### DELETE /api/users/{id}/follow
Unfollow a user.

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "User unfollowed successfully"
}
```

## Real-time Events

WebSocket connections are established through `/ws` endpoint.

### Event Types

#### Notifications
```typescript
interface NotificationEvent {
  type: 'notification';
  data: {
    id: number;
    type: string;
    content: string;
    userId: number;
    createdAt: string;
  };
}
```

#### Post Updates
```typescript
interface PostUpdateEvent {
  type: 'post_update';
  data: {
    action: 'add' | 'update' | 'delete';
    post: Post;
  };
}
```

#### Comment Updates
```typescript
interface CommentUpdateEvent {
  type: 'comment_update';
  data: {
    action: 'add' | 'delete';
    comment: Comment;
  };
}
```

## Error Handling

All endpoints return error responses in the following format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited based on the following rules:

- Authentication endpoints: 5 requests per 15 minutes
- Regular endpoints: 100 requests per 15 minutes
- WebSocket connections: 1000 messages per 15 minutes

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1625097600
```

## Security

### Required Headers

All requests must include:

```http
Content-Type: application/json
Accept: application/json
```

### Security Headers

All responses include:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## Data Privacy

### GDPR Compliance

#### GET /api/users/me/data
Export user data (GDPR Article 20).

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "user": {
    "personalInfo": {},
    "posts": [],
    "comments": [],
    "likes": [],
    "followers": [],
    "following": []
  }
}
```

#### DELETE /api/users/me
Delete user account (GDPR Article 17).

**Authentication Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Account deleted successfully"
}
```

## Versioning

API versioning is handled through the Accept header:

```http
Accept: application/vnd.qsocial.v1+json
```
