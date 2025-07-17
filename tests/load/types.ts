export interface LoadTestResult {
  testName: string;
  timestamp: string;
  duration: number;
  requests: number;
  errors: number;
  timeouts: number;
  latency: {
    min: number;
    max: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  resources: {
    cpu: number;
    memory: number;
    disk: {
      read: number;
      write: number;
    };
    network: {
      rx: number;
      tx: number;
    };
  };
  thresholds: {
    latency: number;
    errorRate: number;
    cpu: number;
    memory: number;
    throughput: number;
  };
}

export interface TestReport {
  summary: {
    totalRequests: number;
    totalErrors: number;
    duration: number;
    averageLatency: {
      p50: number;
      p95: number;
      p99: number;
    };
    averageThroughput: number;
    peakResourceUsage: {
      cpu: number;
      memory: number;
    };
  };
  results: LoadTestResult[];
  charts: {
    latency: string;
    throughput: string;
    errorRate: string;
    resourceUsage: string;
  };
  recommendations: string[];
}

export interface ChartOptions {
  width: number;
  height: number;
  backgroundColor: string;
  responsive: boolean;
  animation: boolean;
  plugins: {
    title: {
      display: boolean;
      text: string;
    };
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
    };
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
  }>;
}
