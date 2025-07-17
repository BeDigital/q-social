import { Request, Response } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitInfo>;
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.limits = new Map();
    this.config = config;
  }

  private getKey(req: Request): string {
    // Use IP address as default key
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.limits.entries()) {
      if (info.resetTime <= now) {
        this.limits.delete(key);
      }
    }
  }

  async checkRateLimit(req: Request, res: Response): Promise<void> {
    this.cleanup();

    const key = this.getKey(req);
    const now = Date.now();
    const limitInfo = this.limits.get(key) || {
      count: 0,
      resetTime: now + this.config.windowMs,
    };

    if (limitInfo.resetTime <= now) {
      limitInfo.count = 0;
      limitInfo.resetTime = now + this.config.windowMs;
    }

    limitInfo.count++;

    if (limitInfo.count > this.config.max) {
      const waitTime = Math.ceil((limitInfo.resetTime - now) / 1000);
      res.set('Retry-After', String(waitTime));
      throw new Error('Rate limit exceeded');
    }

    this.limits.set(key, limitInfo);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': String(this.config.max),
      'X-RateLimit-Remaining': String(this.config.max - limitInfo.count),
      'X-RateLimit-Reset': String(Math.ceil(limitInfo.resetTime / 1000)),
    });
  }
}
