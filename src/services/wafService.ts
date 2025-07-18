import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

interface WAFConfig {
  enabled: boolean;
  rateLimit: boolean;
  geoRestrictions: boolean;
}

interface WAFRule {
  id: string;
  name: string;
  priority: number;
  action: 'ALLOW' | 'BLOCK' | 'COUNT';
  conditions: WAFCondition[];
}

interface WAFCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  value: string | string[];
}

export class WAFService {
  private rules: WAFRule[] = [];
  private redis: Redis;
  private config: WAFConfig;

  constructor(config: WAFConfig) {
    this.config = config;
    this.redis = new Redis();
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    if (this.config.geoRestrictions) {
      this.addRule({
        id: 'geo-1',
        name: 'Geographic Restrictions',
        priority: 1,
        action: 'BLOCK',
        conditions: [{
          field: 'country',
          operator: 'EQUALS',
          value: ['US', 'GB', 'EU']
        }]
      });
    }

    if (this.config.rateLimit) {
      this.addRule({
        id: 'rate-1',
        name: 'Rate Limiting',
        priority: 2,
        action: 'BLOCK',
        conditions: [{
          field: 'request_rate',
          operator: 'EQUALS',
          value: '100/minute'
        }]
      });
    }
  }

  async addRule(rule: WAFRule): Promise<void> {
    this.rules.push(rule);
    await this.redis.hset('waf:rules', rule.id, JSON.stringify(rule));
  }

  async removeRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    await this.redis.hdel('waf:rules', ruleId);
  }

  async resetRules(): Promise<void> {
    this.rules = [];
    await this.redis.del('waf:rules');
    this.initializeDefaultRules();
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      try {
        // Check rate limiting
        if (this.config.rateLimit) {
          const ip = req.ip;
          const requests = await this.redis.incr(`waf:ratelimit:${ip}`);
          await this.redis.expire(`waf:ratelimit:${ip}`, 60);

          if (requests > 100) {
            return res.status(429).json({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded'
            });
          }
        }

        // Check geographic restrictions
        if (this.config.geoRestrictions) {
          const country = req.headers['x-origin-country'] as string;
          const geoRule = this.rules.find(r => r.id === 'geo-1');
          
          if (geoRule && !geoRule.conditions[0].value.includes(country)) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'Geographic restriction'
            });
          }
        }

        // Apply other WAF rules
        for (const rule of this.rules) {
          const blocked = await this.evaluateRule(rule, req);
          if (blocked) {
            return res.status(403).json({
              error: 'Forbidden',
              message: `Blocked by rule: ${rule.name}`
            });
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private async evaluateRule(rule: WAFRule, req: Request): Promise<boolean> {
    for (const condition of rule.conditions) {
      const value = this.getFieldValue(condition.field, req);
      
      switch (condition.operator) {
        case 'EQUALS':
          if (Array.isArray(condition.value)) {
            if (!condition.value.includes(value)) {
              return rule.action === 'BLOCK';
            }
          } else if (value !== condition.value) {
            return rule.action === 'BLOCK';
          }
          break;

        case 'CONTAINS':
          if (typeof value === 'string' && !value.includes(condition.value as string)) {
            return rule.action === 'BLOCK';
          }
          break;

        case 'REGEX':
          if (typeof value === 'string' && !new RegExp(condition.value as string).test(value)) {
            return rule.action === 'BLOCK';
          }
          break;
      }
    }

    return false;
  }

  private getFieldValue(field: string, req: Request): string {
    switch (field) {
      case 'country':
        return req.headers['x-origin-country'] as string;
      case 'ip':
        return req.ip;
      case 'path':
        return req.path;
      case 'method':
        return req.method;
      default:
        return req.headers[field] as string;
    }
  }
}
