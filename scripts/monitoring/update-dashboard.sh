#!/bin/bash

# Dashboard Update Script for Q-Social Security Monitoring
# Usage: ./update-dashboard.sh <environment> <region>

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
STACK_NAME="q-social-security-${ENVIRONMENT}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }

# Update dashboard
update_dashboard() {
    log "Updating security dashboard..."
    
    # Replace region in dashboard template
    sed "s/\${AWS_REGION}/$REGION/g" \
        config/monitoring/security-dashboard.json > /tmp/dashboard.json

    # Update dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --dashboard-body file:///tmp/dashboard.json \
        --region $REGION \
        || error "Failed to update dashboard"

    log "Dashboard updated successfully"
}

# Verify metrics
verify_metrics() {
    log "Verifying metrics..."
    
    # List available metrics
    aws cloudwatch list-metrics \
        --namespace "Q-Social/WAF" \
        --region $REGION \
        || error "Failed to verify WAF metrics"

    aws cloudwatch list-metrics \
        --namespace "Q-Social/Monitoring" \
        --region $REGION \
        || error "Failed to verify monitoring metrics"

    log "Metrics verified successfully"
}

# Main process
main() {
    log "Starting dashboard update for ${ENVIRONMENT} environment..."
    
    # Update dashboard
    update_dashboard
    
    # Verify metrics
    verify_metrics
    
    log "Dashboard update completed successfully"
}

# Execute main function
main
