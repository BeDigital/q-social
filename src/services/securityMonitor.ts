import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface SecurityMonitorConfig {
  level: 'basic' | 'detailed' | 'full';
  redis: Redis;
}

interface SecurityMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  wafBlocks: number;
  geoBlocks: number;
}

interface SecurityEvent {
  type: 'WAF_BLOCK' | 'GEO_BLOCK' | 'RATE_LIMIT' | 'AUTH_FAILURE' | 'ERROR';
  timestamp: Date;
  details: Record<string, any>;
}

export class SecurityMonitor extends EventEmitter {
  private config: SecurityMonitorConfig;
  private redis: Redis;
  private metricsPrefix = 'security:metrics:';
  private eventsPrefix = 'security:events:';

  constructor(config: SecurityMonitorConfig) {
    super();
    this.config = config;
    this.redis = config.redis;
  }

  async recordRequest(duration: number): Promise<void> {
    const now = Date.now();
    
    await Promise.all([
      this.redis.incr(`${this.metricsPrefix}requests`),
      this.redis.lpush(`${this.metricsPrefix}response_times`, duration.toString()),
      this.redis.ltrim(`${this.metricsPrefix}response_times`, 0, 999)
    ]);

    if (this.config.level === 'full') {
      await this.redis.zadd(`${this.metricsPrefix}request_timeline`, now, JSON.stringify({
        timestamp: now,
        duration
      }));
    }
  }

  async recordError(error: Error): Promise<void> {
    await Promise.all([
      this.redis.incr(`${this.metricsPrefix}errors`),
      this.redis.lpush(`${this.eventsPrefix}errors`, JSON.stringify({
        timestamp: Date.now(),
        error: {
          name: error.name,
          message: error.message,
          stack: this.config.level === 'full' ? error.stack : undefined
        }
      }))
    ]);

    this.emit('error', error);
  }

  async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    await Promise.all([
      this.redis.incr(`${this.metricsPrefix}${event.type.toLowerCase()}`),
      this.redis.lpush(
        `${this.eventsPrefix}${event.type.toLowerCase()}`,
        JSON.stringify(event)
      )
    ]);

    if (this.config.level === 'full') {
      await this.redis.zadd(
        `${this.metricsPrefix}security_timeline`,
        event.timestamp.getTime(),
        JSON.stringify(event)
      );
    }

    this.emit('securityEvent', event);
  }

  async getMetrics(): Promise<SecurityMetrics> {
    const [
      requestCount,
      errorCount,
      responseTimes,
      wafBlocks,
      geoBlocks
    ] = await Promise.all([
      this.redis.get(`${this.metricsPrefix}requests`),
      this.redis.get(`${this.metricsPrefix}errors`),
      this.redis.lrange(`${this.metricsPrefix}response_times`, 0, -1),
      this.redis.get(`${this.metricsPrefix}waf_block`),
      this.redis.get(`${this.metricsPrefix}geo_block`)
    ]);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + parseInt(time, 10), 0) / responseTimes.length
      : 0;

    return {
      requestCount: parseInt(requestCount || '0', 10),
      errorCount: parseInt(errorCount || '0', 10),
      averageResponseTime: avgResponseTime,
      wafBlocks: parseInt(wafBlocks || '0', 10),
      geoBlocks: parseInt(geoBlocks || '0', 10)
    };
  }

  async getSecurityEvents(type?: string, limit = 100): Promise<SecurityEvent[]> {
    const key = type 
      ? `${this.eventsPrefix}${type.toLowerCase()}`
      : `${this.metricsPrefix}security_timeline`;

    const events = type
      ? await this.redis.lrange(key, 0, limit - 1)
      : await this.redis.zrevrange(key, 0, limit - 1);

    return events.map(event => JSON.parse(event));
  }

  async reset(): Promise<void> {
    const keys = await this.redis.keys(`${this.metricsPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }

    const eventKeys = await this.redis.keys(`${this.eventsPrefix}*`);
    if (eventKeys.length > 0) {
      await this.redis.del(eventKeys);
    }
  }

  middleware() {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Capture response metrics
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        await this.recordRequest(duration);

        if (res.statusCode >= 400) {
          await this.recordError(new Error(`HTTP ${res.statusCode}`));
        }
      });

      next();
    };
  }
}
