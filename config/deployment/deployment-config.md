# Q-Social Deployment Configuration

## Environment Configurations

### Production (be-digital-q-social)
```yaml
Environment: production
Domain: be-digital-q-social
Region: us-west-2

Infrastructure:
  ECS:
    Cluster:
      Name: q-social-prod
      MinCapacity: 2
      MaxCapacity: 10
      ContainerInsights: enabled
    
    Services:
      Frontend:
        CPU: 1024
        Memory: 2048
        AutoScaling:
          MinTasks: 2
          MaxTasks: 10
          TargetCPU: 70
          TargetMemory: 70
      
      Backend:
        CPU: 1024
        Memory: 2048
        AutoScaling:
          MinTasks: 2
          MaxTasks: 10
          TargetCPU: 70
          TargetMemory: 70

  Database:
    Type: Aurora Serverless v2
    Engine: PostgreSQL 14.6
    MinCapacity: 2
    MaxCapacity: 32
    AutoPause: disabled
    Backup:
      RetentionDays: 35
      PreferredWindow: "03:00-04:00"

  WAF:
    Geographic:
      Phase1:
        AllowedCountries: ["US"]
        Duration: "Months 0-3"
      Phase2:
        AllowedCountries: ["US", "GB"]
        Duration: "Months 4-6"
      Phase3:
        AllowedCountries: ["US", "GB", "EU"]
        Duration: "Months 7-9"
    
    RateLimiting:
      Default: 2000/5min
      API: 1000/5min
      Auth: 100/5min

  SSL:
    Provider: ACM
    Type: Wildcard
    Domain: "*.be-digital-q-social"
    ValidationMethod: DNS
```

### Staging
```yaml
Environment: staging
Domain: staging.be-digital-q-social
Region: us-west-2

Infrastructure:
  ECS:
    Cluster:
      Name: q-social-staging
      MinCapacity: 1
      MaxCapacity: 4
      ContainerInsights: enabled
    
    Services:
      Frontend:
        CPU: 512
        Memory: 1024
        AutoScaling:
          MinTasks: 1
          MaxTasks: 4
          TargetCPU: 70
          TargetMemory: 70
      
      Backend:
        CPU: 512
        Memory: 1024
        AutoScaling:
          MinTasks: 1
          MaxTasks: 4
          TargetCPU: 70
          TargetMemory: 70

  Database:
    Type: Aurora Serverless v2
    Engine: PostgreSQL 14.6
    MinCapacity: 1
    MaxCapacity: 8
    AutoPause: enabled
    AutoPauseDelay: 30
```

### Development
```yaml
Environment: development
Domain: dev.be-digital-q-social
Region: us-west-2

Infrastructure:
  ECS:
    Cluster:
      Name: q-social-dev
      MinCapacity: 1
      MaxCapacity: 2
      ContainerInsights: enabled
    
    Services:
      Frontend:
        CPU: 256
        Memory: 512
        AutoScaling:
          MinTasks: 1
          MaxTasks: 2
      
      Backend:
        CPU: 256
        Memory: 512
        AutoScaling:
          MinTasks: 1
          MaxTasks: 2

  Database:
    Type: Aurora Serverless v2
    Engine: PostgreSQL 14.6
    MinCapacity: 0.5
    MaxCapacity: 4
    AutoPause: enabled
    AutoPauseDelay: 15
```

## Deployment Procedures

### Production Deployment
```yaml
PreDeployment:
  - Security scan
  - Load testing
  - Backup verification
  - WAF rule verification
  - SSL certificate check

Deployment:
  Strategy: Blue/Green
  Steps:
    1. Deploy infrastructure changes
    2. Deploy database migrations
    3. Deploy new application version
    4. Run smoke tests
    5. Switch traffic
    6. Monitor metrics

PostDeployment:
  - Verify WAF rules
  - Check security headers
  - Validate SSL configuration
  - Monitor error rates
  - Check geographic access
```

### Staging Deployment
```yaml
PreDeployment:
  - Integration tests
  - Security scan
  - Configuration validation

Deployment:
  Strategy: Rolling update
  Steps:
    1. Deploy infrastructure changes
    2. Deploy database migrations
    3. Deploy new application version
    4. Run integration tests

PostDeployment:
  - Verify functionality
  - Check metrics
  - Validate security
```

### Development Deployment
```yaml
PreDeployment:
  - Unit tests
  - Lint checks
  - Build verification

Deployment:
  Strategy: Direct update
  Steps:
    1. Deploy infrastructure changes
    2. Deploy database migrations
    3. Deploy new application version

PostDeployment:
  - Run tests
  - Check logs
  - Verify functionality
```

## CI/CD Configuration

### GitHub Actions Workflow
```yaml
name: Q-Social CI/CD

on:
  push:
    branches: [main, staging, development]
  pull_request:
    branches: [main, staging, development]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run security-scan

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v1
      - run: npm run build
      - run: docker build .
      - run: aws ecr push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v1
      - run: ./scripts/deploy.sh
```

## Monitoring Configuration

### CloudWatch Alarms
```yaml
Alarms:
  HighCPU:
    Threshold: 70
    Period: 300
    EvaluationPeriods: 2

  HighMemory:
    Threshold: 70
    Period: 300
    EvaluationPeriods: 2

  ErrorRate:
    Threshold: 1
    Period: 300
    EvaluationPeriods: 2

  APILatency:
    Threshold: 1000
    Period: 60
    EvaluationPeriods: 3
```

### Geographic Monitoring
```yaml
Metrics:
  - RequestsByCountry
  - BlockedByCountry
  - LatencyByRegion
  - ErrorsByRegion

Dashboards:
  - Geographic Access
  - WAF Effectiveness
  - Regional Performance
  - Error Distribution
```

## Rollback Procedures

### Production Rollback
```yaml
Triggers:
  - Error rate > 5%
  - Latency > 2s
  - Security incident
  - Geographic access failure

Procedure:
  1. Switch to previous version
  2. Revert database migrations
  3. Update DNS if needed
  4. Verify WAF rules
  5. Check security configuration
  6. Monitor metrics
```

### Emergency Procedures
```yaml
Geographic Access:
  - Immediate country blocking
  - Traffic rerouting
  - Incident notification
  - Management escalation

Security Incident:
  - Enable maintenance mode
  - Block suspicious traffic
  - Investigate logs
  - Apply security patches
  - Update WAF rules
```
