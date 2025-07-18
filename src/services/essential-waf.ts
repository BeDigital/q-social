import { Request, Response, NextFunction } from 'express';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

interface WafConfig {
  enabled: boolean;
  region: string;
  allowedCountries: string[];
  rateLimit: number;
}

export class EssentialWafService {
  private config: WafConfig;
  private cloudWatch: CloudWatchClient;
  private requestCounts: Map<string, { count: number; timestamp: number }>;

  constructor(config: WafConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      region: config.region ?? 'us-west-2',
      allowedCountries: config.allowedCountries ?? ['US'],
      rateLimit: config.rateLimit ?? 2000
    };

    this.cloudWatch = new CloudWatchClient({ region: this.config.region });
    this.requestCounts = new Map();
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      try {
        // Geographic restriction check
        const countryCode = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
        if (!this.isCountryAllowed(countryCode as string)) {
          await this.recordMetric('GeoBlockedRequests', 1);
          return res.status(403).json({
            error: 'Access Denied',
            message: 'Geographic access restriction'
          });
        }

        // Rate limiting check
        const ip = req.ip;
        if (await this.isRateLimited(ip)) {
          await this.recordMetric('RateLimitedRequests', 1);
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded'
          });
        }

        // Record successful request
        await this.recordMetric('AllowedRequests', 1);
        next();
      } catch (error) {
        console.error('WAF Error:', error);
        next(error);
      }
    };
  }

  private isCountryAllowed(countryCode?: string): boolean {
    if (!countryCode) {
      return false;
    }
    return this.config.allowedCountries.includes(countryCode.toUpperCase());
  }

  private async isRateLimited(ip: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    // Clean up old entries
    for (const [key, data] of this.requestCounts.entries()) {
      if (now - data.timestamp > windowMs) {
        this.requestCounts.delete(key);
      }
    }

    // Get or create counter for IP
    const counter = this.requestCounts.get(ip) || { count: 0, timestamp: now };

    // Reset counter if window has passed
    if (now - counter.timestamp > windowMs) {
      counter.count = 0;
      counter.timestamp = now;
    }

    // Increment counter
    counter.count++;
    this.requestCounts.set(ip, counter);

    return counter.count > this.config.rateLimit;
  }

  private async recordMetric(metricName: string, value: number): Promise<void> {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'Q-Social/WAF',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: 'Count',
            Timestamp: new Date()
          }
        ]
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Error recording WAF metric:', error);
    }
  }

  // Method to update allowed countries (for future phases)
  async updateAllowedCountries(countries: string[]): Promise<void> {
    this.config.allowedCountries = countries.map(c => c.toUpperCase());
    await this.recordMetric('ConfigurationUpdates', 1);
  }

  // Method to update rate limit
  async updateRateLimit(limit: number): Promise<void> {
    this.config.rateLimit = limit;
    await this.recordMetric('ConfigurationUpdates', 1);
  }
}
