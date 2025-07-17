import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { LoadTestResult } from '../types';

export class LoadTestVisualizer {
  private static readonly CHART_WIDTH = 800;
  private static readonly CHART_HEIGHT = 400;
  private static readonly OUTPUT_DIR = join(__dirname, '../../../reports/load-tests');

  private static readonly chartJS = new ChartJSNodeCanvas({
    width: this.CHART_WIDTH,
    height: this.CHART_HEIGHT,
    backgroundColour: 'white',
  });

  static async generateReports(results: LoadTestResult[]): Promise<void> {
    // Create output directory if it doesn't exist
    mkdirSync(this.OUTPUT_DIR, { recursive: true });

    await Promise.all([
      this.generateLatencyChart(results),
      this.generateThroughputChart(results),
      this.generateErrorRateChart(results),
      this.generateResourceUsageChart(results),
      this.generateSummaryReport(results),
    ]);
  }

  private static async generateLatencyChart(results: LoadTestResult[]): Promise<void> {
    const configuration = {
      type: 'line',
      data: {
        labels: results.map(r => r.timestamp),
        datasets: [
          {
            label: 'P95 Latency (ms)',
            data: results.map(r => r.latency.p95),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
          {
            label: 'P99 Latency (ms)',
            data: results.map(r => r.latency.p99),
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Latency (ms)',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Time',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Response Latency Over Time',
          },
        },
      },
    };

    const buffer = await this.chartJS.renderToBuffer(configuration);
    writeFileSync(join(this.OUTPUT_DIR, 'latency.png'), buffer);
  }

  private static async generateThroughputChart(results: LoadTestResult[]): Promise<void> {
    const configuration = {
      type: 'bar',
      data: {
        labels: results.map(r => r.testName),
        datasets: [{
          label: 'Requests/Second',
          data: results.map(r => r.throughput),
          backgroundColor: 'rgb(54, 162, 235)',
        }],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Requests/Second',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Throughput by Test',
          },
        },
      },
    };

    const buffer = await this.chartJS.renderToBuffer(configuration);
    writeFileSync(join(this.OUTPUT_DIR, 'throughput.png'), buffer);
  }

  private static async generateErrorRateChart(results: LoadTestResult[]): Promise<void> {
    const configuration = {
      type: 'line',
      data: {
        labels: results.map(r => r.timestamp),
        datasets: [{
          label: 'Error Rate (%)',
          data: results.map(r => (r.errors / r.requests) * 100),
          borderColor: 'rgb(255, 99, 132)',
          fill: true,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        }],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Error Rate (%)',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Error Rate Over Time',
          },
        },
      },
    };

    const buffer = await this.chartJS.renderToBuffer(configuration);
    writeFileSync(join(this.OUTPUT_DIR, 'error-rate.png'), buffer);
  }

  private static async generateResourceUsageChart(results: LoadTestResult[]): Promise<void> {
    const configuration = {
      type: 'line',
      data: {
        labels: results.map(r => r.timestamp),
        datasets: [
          {
            label: 'CPU Usage (%)',
            data: results.map(r => r.resources.cpu),
            borderColor: 'rgb(255, 159, 64)',
            yAxisID: 'y',
          },
          {
            label: 'Memory Usage (MB)',
            data: results.map(r => r.resources.memory / 1024 / 1024),
            borderColor: 'rgb(75, 192, 192)',
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'CPU Usage (%)',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Memory Usage (MB)',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Resource Usage Over Time',
          },
        },
      },
    };

    const buffer = await this.chartJS.renderToBuffer(configuration);
    writeFileSync(join(this.OUTPUT_DIR, 'resource-usage.png'), buffer);
  }

  private static generateSummaryReport(results: LoadTestResult[]): void {
    const summary = {
      totalRequests: results.reduce((sum, r) => sum + r.requests, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      averageLatency: {
        p50: this.average(results.map(r => r.latency.p50)),
        p95: this.average(results.map(r => r.latency.p95)),
        p99: this.average(results.map(r => r.latency.p99)),
      },
      averageThroughput: this.average(results.map(r => r.throughput)),
      peakResourceUsage: {
        cpu: Math.max(...results.map(r => r.resources.cpu)),
        memory: Math.max(...results.map(r => r.resources.memory)),
      },
      testDuration: this.formatDuration(
        new Date(results[results.length - 1].timestamp).getTime() -
        new Date(results[0].timestamp).getTime()
      ),
    };

    const report = `
# Load Test Summary Report
Generated: ${new Date().toISOString()}

## Overview
- Total Requests: ${summary.totalRequests.toLocaleString()}
- Total Errors: ${summary.totalErrors.toLocaleString()}
- Error Rate: ${((summary.totalErrors / summary.totalRequests) * 100).toFixed(2)}%
- Test Duration: ${summary.testDuration}

## Performance Metrics
### Latency
- P50: ${summary.averageLatency.p50.toFixed(2)}ms
- P95: ${summary.averageLatency.p95.toFixed(2)}ms
- P99: ${summary.averageLatency.p99.toFixed(2)}ms

### Throughput
- Average: ${summary.averageThroughput.toFixed(2)} req/sec

### Resource Usage (Peak)
- CPU: ${summary.peakResourceUsage.cpu.toFixed(2)}%
- Memory: ${(summary.peakResourceUsage.memory / 1024 / 1024).toFixed(2)}MB

## Test Results by Feature

${this.generateFeatureResults(results)}

## Recommendations

${this.generateRecommendations(results)}
`;

    writeFileSync(join(this.OUTPUT_DIR, 'summary.md'), report);
  }

  private static generateFeatureResults(results: LoadTestResult[]): string {
    const featureGroups = this.groupByFeature(results);
    let output = '';

    for (const [feature, tests] of Object.entries(featureGroups)) {
      output += `### ${feature}\n`;
      for (const test of tests) {
        output += `- ${test.testName}:\n`;
        output += `  - Avg Latency: ${test.latency.p95.toFixed(2)}ms (P95)\n`;
        output += `  - Throughput: ${test.throughput.toFixed(2)} req/sec\n`;
        output += `  - Error Rate: ${((test.errors / test.requests) * 100).toFixed(2)}%\n`;
      }
      output += '\n';
    }

    return output;
  }

  private static generateRecommendations(results: LoadTestResult[]): string {
    const recommendations: string[] = [];

    // Analyze latency
    const highLatencyTests = results.filter(r => r.latency.p95 > r.thresholds.latency);
    if (highLatencyTests.length > 0) {
      recommendations.push('### Performance Improvements Needed\n' +
        highLatencyTests.map(test => 
          `- ${test.testName}: Latency exceeds threshold (${test.latency.p95.toFixed(2)}ms > ${test.thresholds.latency}ms)`
        ).join('\n')
      );
    }

    // Analyze error rates
    const highErrorTests = results.filter(r => (r.errors / r.requests) > r.thresholds.errorRate);
    if (highErrorTests.length > 0) {
      recommendations.push('### Error Handling Improvements Needed\n' +
        highErrorTests.map(test =>
          `- ${test.testName}: Error rate exceeds threshold (${((test.errors / test.requests) * 100).toFixed(2)}% > ${test.thresholds.errorRate * 100}%)`
        ).join('\n')
      );
    }

    // Analyze resource usage
    const highResourceTests = results.filter(r => 
      r.resources.cpu > r.thresholds.cpu ||
      r.resources.memory > r.thresholds.memory
    );
    if (highResourceTests.length > 0) {
      recommendations.push('### Resource Optimization Needed\n' +
        highResourceTests.map(test => {
          const issues = [];
          if (test.resources.cpu > test.thresholds.cpu) {
            issues.push(`CPU usage (${test.resources.cpu.toFixed(2)}% > ${test.thresholds.cpu}%)`);
          }
          if (test.resources.memory > test.thresholds.memory) {
            issues.push(`Memory usage (${(test.resources.memory / 1024 / 1024).toFixed(2)}MB > ${test.thresholds.memory / 1024 / 1024}MB)`);
          }
          return `- ${test.testName}: ${issues.join(', ')}`;
        }).join('\n')
      );
    }

    return recommendations.join('\n\n');
  }

  private static average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  private static groupByFeature(results: LoadTestResult[]): Record<string, LoadTestResult[]> {
    return results.reduce((groups, result) => {
      const feature = result.testName.split('/')[0];
      if (!groups[feature]) {
        groups[feature] = [];
      }
      groups[feature].push(result);
      return groups;
    }, {} as Record<string, LoadTestResult[]>);
  }
}
