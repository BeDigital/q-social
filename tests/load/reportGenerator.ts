import { LoadTestVisualizer } from './visualization/loadTestVisualizer';
import { LoadTestResult, TestReport } from './types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class LoadTestReportGenerator {
  private static readonly REPORT_DIR = join(__dirname, '../../reports/load-tests');

  static async generateReport(results: LoadTestResult[]): Promise<void> {
    // Create report directory
    mkdirSync(this.REPORT_DIR, { recursive: true });

    // Generate visualizations
    await LoadTestVisualizer.generateReports(results);

    // Generate HTML report
    const html = this.generateHtmlReport(results);
    writeFileSync(join(this.REPORT_DIR, 'report.html'), html);

    // Generate JSON report
    const json = JSON.stringify(this.generateJsonReport(results), null, 2);
    writeFileSync(join(this.REPORT_DIR, 'report.json'), json);
  }

  private static generateHtmlReport(results: LoadTestResult[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .metric-card {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
        }
        .metric-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .recommendation {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
        }
        .error {
            color: #dc3545;
        }
        .success {
            color: #28a745;
        }
    </style>
</head>
<body>
    <h1>Load Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <h2>Summary</h2>
    <div class="metric-card">
        <div class="metric-title">Overall Performance</div>
        <ul>
            <li>Total Requests: ${results.reduce((sum, r) => sum + r.requests, 0).toLocaleString()}</li>
            <li>Total Errors: ${results.reduce((sum, r) => sum + r.errors, 0).toLocaleString()}</li>
            <li>Average Throughput: ${this.average(results.map(r => r.throughput)).toFixed(2)} req/sec</li>
        </ul>
    </div>

    <h2>Performance Charts</h2>
    <div class="chart-container">
        <h3>Response Latency</h3>
        <img src="latency.png" alt="Latency Chart">
    </div>
    <div class="chart-container">
        <h3>Throughput</h3>
        <img src="throughput.png" alt="Throughput Chart">
    </div>
    <div class="chart-container">
        <h3>Error Rate</h3>
        <img src="error-rate.png" alt="Error Rate Chart">
    </div>
    <div class="chart-container">
        <h3>Resource Usage</h3>
        <img src="resource-usage.png" alt="Resource Usage Chart">
    </div>

    <h2>Test Results by Feature</h2>
    ${this.generateFeatureResultsHtml(results)}

    <h2>Performance Issues</h2>
    ${this.generateIssuesHtml(results)}

    <h2>Recommendations</h2>
    ${this.generateRecommendationsHtml(results)}
</body>
</html>`;
  }

  private static generateJsonReport(results: LoadTestResult[]): TestReport {
    return {
      summary: {
        totalRequests: results.reduce((sum, r) => sum + r.requests, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
        duration: results.reduce((sum, r) => sum + r.duration, 0),
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
      },
      results,
      charts: {
        latency: 'latency.png',
        throughput: 'throughput.png',
        errorRate: 'error-rate.png',
        resourceUsage: 'resource-usage.png',
      },
      recommendations: this.generateRecommendations(results),
    };
  }

  private static generateFeatureResultsHtml(results: LoadTestResult[]): string {
    const featureGroups = this.groupByFeature(results);
    let html = '';

    for (const [feature, tests] of Object.entries(featureGroups)) {
      html += `
        <div class="metric-card">
            <div class="metric-title">${feature}</div>
            <table style="width: 100%">
                <tr>
                    <th>Test</th>
                    <th>P95 Latency</th>
                    <th>Throughput</th>
                    <th>Error Rate</th>
                </tr>
                ${tests.map(test => `
                    <tr>
                        <td>${test.testName}</td>
                        <td class="${this.getLatencyClass(test)}">${test.latency.p95.toFixed(2)}ms</td>
                        <td>${test.throughput.toFixed(2)} req/sec</td>
                        <td class="${this.getErrorClass(test)}">${((test.errors / test.requests) * 100).toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </table>
        </div>
      `;
    }

    return html;
  }

  private static generateIssuesHtml(results: LoadTestResult[]): string {
    const issues = results.filter(r =>
      r.latency.p95 > r.thresholds.latency ||
      (r.errors / r.requests) > r.thresholds.errorRate ||
      r.resources.cpu > r.thresholds.cpu ||
      r.resources.memory > r.thresholds.memory
    );

    if (issues.length === 0) {
      return '<div class="success">No significant issues detected.</div>';
    }

    return issues.map(test => `
      <div class="recommendation">
        <strong>${test.testName}</strong>
        <ul>
          ${test.latency.p95 > test.thresholds.latency ?
            `<li class="error">High latency: ${test.latency.p95.toFixed(2)}ms (threshold: ${test.thresholds.latency}ms)</li>` : ''}
          ${(test.errors / test.requests) > test.thresholds.errorRate ?
            `<li class="error">High error rate: ${((test.errors / test.requests) * 100).toFixed(2)}% (threshold: ${test.thresholds.errorRate * 100}%)</li>` : ''}
          ${test.resources.cpu > test.thresholds.cpu ?
            `<li class="error">High CPU usage: ${test.resources.cpu.toFixed(2)}% (threshold: ${test.thresholds.cpu}%)</li>` : ''}
          ${test.resources.memory > test.thresholds.memory ?
            `<li class="error">High memory usage: ${(test.resources.memory / 1024 / 1024).toFixed(2)}MB (threshold: ${test.thresholds.memory / 1024 / 1024}MB)</li>` : ''}
        </ul>
      </div>
    `).join('');
  }

  private static generateRecommendationsHtml(results: LoadTestResult[]): string {
    const recommendations = this.generateRecommendations(results);
    return recommendations.map(rec => `
      <div class="recommendation">
        ${rec}
      </div>
    `).join('');
  }

  private static generateRecommendations(results: LoadTestResult[]): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const highLatencyTests = results.filter(r => r.latency.p95 > r.thresholds.latency);
    if (highLatencyTests.length > 0) {
      recommendations.push(
        'Consider implementing caching for the following endpoints: ' +
        highLatencyTests.map(t => t.testName).join(', ')
      );
    }

    // Error handling recommendations
    const highErrorTests = results.filter(r => (r.errors / r.requests) > r.thresholds.errorRate);
    if (highErrorTests.length > 0) {
      recommendations.push(
        'Implement retry mechanisms and circuit breakers for: ' +
        highErrorTests.map(t => t.testName).join(', ')
      );
    }

    // Resource usage recommendations
    const highResourceTests = results.filter(r => 
      r.resources.cpu > r.thresholds.cpu ||
      r.resources.memory > r.thresholds.memory
    );
    if (highResourceTests.length > 0) {
      recommendations.push(
        'Optimize resource usage and consider scaling for: ' +
        highResourceTests.map(t => t.testName).join(', ')
      );
    }

    return recommendations;
  }

  private static average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
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

  private static getLatencyClass(test: LoadTestResult): string {
    return test.latency.p95 > test.thresholds.latency ? 'error' : 'success';
  }

  private static getErrorClass(test: LoadTestResult): string {
    return (test.errors / test.requests) > test.thresholds.errorRate ? 'error' : 'success';
  }
}
