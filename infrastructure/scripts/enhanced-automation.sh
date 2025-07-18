#!/bin/bash

# Enhanced Deployment Automation for Q-Social

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
DOMAIN="be-digital-q-social"
PROFILE=${3:-default}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }

# 1. Security Checks
run_security_checks() {
    log "Running security checks..."

    # Dependencies audit
    npm audit || warn "Security vulnerabilities found in dependencies"
    
    # SAST scanning
    sonar-scanner \
        -Dsonar.projectKey=q-social \
        -Dsonar.sources=. \
        -Dsonar.host.url=https://sonar.be-digital-q-social || warn "SAST scan issues found"
    
    # Container scanning
    trivy image ${ECR_REPO}:latest || warn "Container vulnerabilities found"
    
    # Infrastructure scanning
    checkov -d infrastructure/ || warn "Infrastructure security issues found"
    
    # Secret scanning
    gitleaks detect --source . || warn "Potential secrets found in codebase"
}

# 2. Configuration Validation
validate_configurations() {
    log "Validating configurations..."

    # Environment variables
    ./scripts/validate-env.sh $ENVIRONMENT || error "Environment validation failed"
    
    # CDK validation
    cdk synth || error "CDK synthesis failed"
    cdk diff || warn "Infrastructure drift detected"
    
    # WAF configuration
    aws wafv2 get-web-acl \
        --name "q-social-waf" \
        --scope REGIONAL \
        --region $REGION \
        --profile $PROFILE || error "WAF configuration invalid"
}

# 3. Database Operations
handle_database_operations() {
    log "Managing database operations..."

    # Backup current state
    ./scripts/db-backup.sh || error "Database backup failed"
    
    # Validate migrations
    npm run typeorm:migration:verify || error "Migration verification failed"
    
    # Generate rollback scripts
    npm run typeorm:migration:generate-rollback || warn "Rollback generation issues"
    
    # Run migrations
    npm run typeorm:migration:run || error "Migration execution failed"
}

# 4. Health Checks
verify_system_health() {
    log "Verifying system health..."

    # API health
    curl -f https://api.${DOMAIN}/health || error "API health check failed"
    
    # Database connectivity
    npm run db:health || error "Database health check failed"
    
    # Cache system
    redis-cli -h ${REDIS_HOST} ping || error "Cache system check failed"
    
    # Message queue
    aws sqs get-queue-attributes \
        --queue-url ${SQS_QUEUE_URL} \
        --region $REGION \
        --profile $PROFILE || error "Queue check failed"
}

# 5. Geographic Access Verification
verify_geographic_access() {
    log "Verifying geographic access..."

    # Test US access
    curl --location US https://${DOMAIN}/health || error "US access failed"
    
    # Test UK access (if in Phase 2 or 3)
    if [[ $DEPLOYMENT_PHASE -ge 2 ]]; then
        curl --location UK https://${DOMAIN}/health || warn "UK access issues"
    fi
    
    # Test EU access (if in Phase 3)
    if [[ $DEPLOYMENT_PHASE -eq 3 ]]; then
        curl --location DE https://${DOMAIN}/health || warn "EU access issues"
    fi
}

# 6. Monitoring Setup
setup_monitoring() {
    log "Configuring monitoring..."

    # Update CloudWatch dashboards
    aws cloudwatch put-dashboard \
        --dashboard-name "Q-Social-${ENVIRONMENT}" \
        --dashboard-body file://monitoring/dashboards/${ENVIRONMENT}.json \
        --region $REGION \
        --profile $PROFILE || warn "Dashboard update failed"
    
    # Configure alerts
    ./scripts/setup-alerts.sh $ENVIRONMENT || warn "Alert configuration issues"
    
    # Set up log aggregation
    ./scripts/configure-logging.sh || warn "Log aggregation setup issues"
}

# 7. Performance Testing
run_performance_tests() {
    log "Running performance tests..."

    # Load testing
    artillery run tests/performance/load-test.yml || warn "Load test issues"
    
    # Stress testing
    k6 run tests/performance/stress-test.js || warn "Stress test issues"
    
    # Endpoint latency
    ./scripts/check-latency.sh || warn "Latency issues detected"
}

# 8. Cleanup Operations
perform_cleanup() {
    log "Performing cleanup operations..."

    # Remove old deployments
    ./scripts/cleanup-deployments.sh || warn "Deployment cleanup issues"
    
    # Clear test data
    ./scripts/cleanup-test-data.sh || warn "Test data cleanup issues"
    
    # Prune old images
    ./scripts/prune-images.sh || warn "Image cleanup issues"
}

# Main deployment orchestration
main() {
    log "Starting enhanced deployment process for $ENVIRONMENT..."

    # Pre-deployment
    run_security_checks
    validate_configurations
    handle_database_operations

    # Deployment
    log "Executing main deployment..."
    ./deploy.sh $ENVIRONMENT $REGION $PROFILE || error "Deployment failed"

    # Post-deployment
    verify_system_health
    verify_geographic_access
    setup_monitoring
    run_performance_tests
    perform_cleanup

    log "Enhanced deployment completed successfully"
}

# Execute main function
main
