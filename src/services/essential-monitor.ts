import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

interface MonitorConfig {
  enabled: boolean;
  region: string;
  metricNamespace: string;
}

export class EssentialMonitor {
  private config: MonitorConfig;
  private cloudWatch: CloudWatchClient;

  constructor(config: MonitorConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      region: config.region ?? 'us-west-2',
      metricNamespace: config.metricNamespace ?? 'Q-Social/Monitoring'
    };

    this.cloudWatch = new CloudWatchClient({ region: this.config.region });
  }

  async recordMetric(name: string, value: number, unit = 'Count'): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const command = new PutMetricDataCommand({
        Namespace: this.config.metricNamespace,
        MetricData: [
          {
            MetricName: name,
            Value: value,
            Unit: unit,
            Timestamp: new Date()
          }
        ]
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  async recordSecurityEvent(eventType: string, details: Record<string, any>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Record event count
      await this.recordMetric(`SecurityEvent_${eventType}`, 1);

      // Log event details for investigation
      console.log('Security Event:', {
        type: eventType,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (error) {
      console.error('Error recording security event:', error);
    }
  }

  middleware() {
    return async (req: any, res: any, next: any) => {
      if (!this.config.enabled) {
        return next();
      }

      const startTime = Date.now();

      // Record request
      await this.recordMetric('RequestCount', 1);

      // Record response metrics
      res.on('finish', async () => {
        const duration = Date.now() - startTime;

        // Record response time
        await this.recordMetric('ResponseTime', duration, 'Milliseconds');

        // Record status code
        await this.recordMetric(`StatusCode_${res.statusCode}`, 1);

        // Record errors
        if (res.statusCode >= 400) {
          await this.recordSecurityEvent('Error', {
            statusCode: res.statusCode,
            path: req.path,
            method: req.method
          });
        }
      });

      next();
    };
  }
}
