// Dashboard state
let currentData = null;
let charts = {};
let updateInterval = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    loadData();
    setupEventListeners();
    startAutoRefresh();
});

// Initialize all charts
function initializeCharts() {
    // Latency Chart
    charts.latency = new Chart(document.getElementById('latencyChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'P95 Latency',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Response Time (ms)'
                    }
                }
            }
        }
    });

    // Throughput Chart
    charts.throughput = new Chart(document.getElementById('throughputChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests/Second',
                data: [],
                backgroundColor: 'rgb(54, 162, 235)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.parsed.y} req/s`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Requests/Second'
                    }
                }
            }
        }
    });

    // Error Rate Chart
    charts.error = new Chart(document.getElementById('errorChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Error Rate',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                fill: true,
                backgroundColor: 'rgba(255, 99, 132, 0.2)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Error Rate (%)'
                    }
                }
            }
        }
    });

    // Resource Usage Chart
    charts.resource = new Chart(document.getElementById('resourceChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU Usage',
                    data: [],
                    borderColor: 'rgb(255, 159, 64)',
                    yAxisID: 'cpu'
                },
                {
                    label: 'Memory Usage',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    yAxisID: 'memory'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                cpu: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'CPU Usage (%)'
                    }
                },
                memory: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Memory Usage (MB)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Load and process data
async function loadData() {
    try {
        const response = await fetch('/api/load-test/results');
        currentData = await response.json();
        updateDashboard();
    } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load dashboard data');
    }
}

// Update dashboard with current data
function updateDashboard() {
    if (!currentData) return;

    // Update summary metrics
    updateSummaryMetrics();

    // Update charts
    updateCharts();

    // Update feature cards
    updateFeatureCards();

    // Update alerts and recommendations
    updateAlerts();
}

// Update summary metrics
function updateSummaryMetrics() {
    const summary = currentData.summary;

    // Total Requests
    document.getElementById('totalRequests').textContent = 
        summary.totalRequests.toLocaleString();

    // Average Response Time
    document.getElementById('avgResponseTime').textContent = 
        `${summary.averageLatency.p95.toFixed(2)}ms`;

    // Error Rate
    document.getElementById('errorRate').textContent = 
        `${((summary.totalErrors / summary.totalRequests) * 100).toFixed(2)}%`;

    // System Health
    updateSystemHealth(summary);
}

// Update system health indicator
function updateSystemHealth(summary) {
    const healthElement = document.getElementById('systemHealth');
    const indicator = healthElement.querySelector('.status-indicator');
    
    let status = 'good';
    let text = 'Healthy';

    if (summary.errorRate > 5 || summary.averageLatency.p95 > 1000) {
        status = 'error';
        text = 'Critical';
    } else if (summary.errorRate > 1 || summary.averageLatency.p95 > 500) {
        status = 'warning';
        text = 'Degraded';
    }

    indicator.className = `status-indicator status-${status}`;
    healthElement.textContent = text;
}

// Update all charts
function updateCharts() {
    const results = currentData.results;

    // Update Latency Chart
    updateLatencyChart(results);

    // Update Throughput Chart
    updateThroughputChart(results);

    // Update Error Rate Chart
    updateErrorChart(results);

    // Update Resource Usage Chart
    updateResourceChart(results);
}

// Update feature performance cards
function updateFeatureCards() {
    const container = document.getElementById('featureCards');
    container.innerHTML = '';

    const features = groupByFeature(currentData.results);

    for (const [feature, tests] of Object.entries(features)) {
        const card = createFeatureCard(feature, tests);
        container.appendChild(card);
    }
}

// Create feature performance card
function createFeatureCard(feature, tests) {
    const avgLatency = average(tests.map(t => t.latency.p95));
    const avgThroughput = average(tests.map(t => t.throughput));
    const errorRate = (sum(tests.map(t => t.errors)) / sum(tests.map(t => t.requests))) * 100;

    const div = document.createElement('div');
    div.className = 'col-md-4';
    div.innerHTML = `
        <div class="dashboard-card feature-card" onclick="showFeatureDetails('${feature}')">
            <h5>${feature}</h5>
            <div class="row">
                <div class="col-4">
                    <div class="metric-label">Latency</div>
                    <div class="metric-value">${avgLatency.toFixed(2)}ms</div>
                </div>
                <div class="col-4">
                    <div class="metric-label">Throughput</div>
                    <div class="metric-value">${avgThroughput.toFixed(2)}/s</div>
                </div>
                <div class="col-4">
                    <div class="metric-label">Errors</div>
                    <div class="metric-value">${errorRate.toFixed(2)}%</div>
                </div>
            </div>
        </div>
    `;
    return div;
}

// Update alerts and recommendations
function updateAlerts() {
    const container = document.getElementById('alertsList');
    container.innerHTML = '';

    const alerts = generateAlerts();
    const recommendations = generateRecommendations();

    alerts.forEach(alert => {
        container.appendChild(createAlertElement(alert));
    });

    recommendations.forEach(rec => {
        container.appendChild(createRecommendationElement(rec));
    });
}

// Event Listeners
function setupEventListeners() {
    // Time range selector
    document.getElementById('timeRange').addEventListener('change', (e) => {
        updateTimeRange(e.target.value);
    });

    // Feature filters
    const features = [...new Set(currentData.results.map(r => r.testName.split('/')[0]))];
    const featureFilters = document.getElementById('featureFilters');
    features.forEach(feature => {
        const checkbox = document.createElement('div');
        checkbox.className = 'form-check';
        checkbox.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${feature}" 
                   id="feature_${feature}" checked>
            <label class="form-check-label" for="feature_${feature}">
                ${feature}
            </label>
        `;
        featureFilters.appendChild(checkbox);
    });
}

// Auto-refresh
function startAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(loadData, 30000); // Refresh every 30 seconds
}

// Utility functions
function average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function sum(numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}

function groupByFeature(results) {
    return results.reduce((groups, result) => {
        const feature = result.testName.split('/')[0];
        if (!groups[feature]) {
            groups[feature] = [];
        }
        groups[feature].push(result);
        return groups;
    }, {});
}

function showError(message) {
    // Implement error notification
    console.error(message);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateDashboard,
        updateCharts,
        updateSummaryMetrics,
        updateFeatureCards,
        updateAlerts
    };
}
