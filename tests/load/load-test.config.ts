import { LoadTestConfig } from 'autocannon';

export const loadTestConfig: LoadTestConfig = {
  // Authentication Load Test Configuration
  auth: {
    login: {
      connections: 100,
      duration: 30,
      workers: 4,
      maxResponseTime: 200, // 200ms max
      errorRate: 0.01, // 1% max error rate
      minRequestsPerSecond: 1000
    },
    tokenVerification: {
      connections: 200,
      duration: 30,
      maxResponseTime: 50, // 50ms max
      minRequestsPerSecond: 5000
    }
  },

  // Post Management Load Test Configuration
  posts: {
    creation: {
      connections: 50,
      duration: 30,
      maxResponseTime: 300, // 300ms max
      errorRate: 0,
      minRequestsPerSecond: 500
    },
    feed: {
      connections: 500,
      duration: 30,
      workers: 8,
      maxResponseTime: 500, // 500ms max
      minRequestsPerSecond: 1000
    }
  },

  // Media Upload Load Test Configuration
  media: {
    upload: {
      connections: 20,
      duration: 30,
      maxResponseTime: 1000, // 1s max
      errorRate: 0.02, // 2% max error rate
      minRequestsPerSecond: 100
    }
  },

  // Real-time Updates Load Test Configuration
  realtime: {
    websocket: {
      connections: 1000,
      messageRate: 100, // messages per second
      maxLatency: 100, // 100ms max
      errorRate: 0
    },
    notifications: {
      batchSize: 10000,
      maxProcessingTime: 5000, // 5s max
      errorRate: 0
    }
  },

  // Search Load Test Configuration
  search: {
    complex: {
      connections: 50,
      duration: 30,
      maxResponseTime: 500, // 500ms max
      minRequestsPerSecond: 100
    }
  },

  // Data Export Load Test Configuration
  export: {
    concurrent: {
      connections: 20,
      duration: 30,
      maxResponseTime: 5000, // 5s max
      errorRate: 0
    }
  },

  // Error Handling Load Test Configuration
  errors: {
    storm: {
      errorCount: 5000,
      maxProcessingTime: 2000, // 2s max
      errorRate: 0
    }
  },

  // System Limits
  limits: {
    cpu: {
      maxUsage: 80, // 80% max CPU usage
      warningThreshold: 70
    },
    memory: {
      maxUsage: 85, // 85% max memory usage
      warningThreshold: 75
    },
    disk: {
      maxUsage: 90, // 90% max disk usage
      warningThreshold: 80
    },
    network: {
      maxBandwidth: '1GB/s',
      warningThreshold: '800MB/s'
    }
  },

  // Monitoring Configuration
  monitoring: {
    metrics: [
      'cpu',
      'memory',
      'disk',
      'network',
      'errorRate',
      'responseTime',
      'throughput'
    ],
    interval: 1000, // 1 second
    retention: '1h'
  },

  // Report Configuration
  reporting: {
    format: 'html',
    saveToFile: true,
    includeMetrics: true,
    includeLogs: true,
    includeCharts: true
  }
};
