#!/bin/bash

# Security Deployment Script for Q-Social Phase 1
# Usage: ./deploy-security.sh <environment> <region>

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
STACK_NAME="q-social-security-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }

# Validate AWS credentials
validate_aws() {
    log "Validating AWS credentials..."
    aws sts get-caller-identity > /dev/null 2>&1 || error "Invalid AWS credentials"
}

# Deploy WAF configuration
deploy_waf() {
    log "Deploying WAF configuration..."
    
    # Create WAF web ACL
    aws wafv2 create-web-acl \
        --name "${STACK_NAME}-waf" \
        --scope REGIONAL \
        --region $REGION \
        --default-action Allow={} \
        --rules file://config/security/waf-essential.yaml \
        --visibility-config \
            SampledRequestsEnabled=true,\
            CloudWatchMetricsEnabled=true,\
            MetricName="${STACK_NAME}-metrics" \
        || error "Failed to create WAF web ACL"

    # Get web ACL ID
    WEB_ACL_ID=$(aws wafv2 list-web-acls \
        --scope REGIONAL \
        --region $REGION \
        --query "WebACLs[?Name=='${STACK_NAME}-waf'].Id" \
        --output text)

    # Associate with ALB
    ALB_ARN=$(aws elbv2 describe-load-balancers \
        --region $REGION \
        --query "LoadBalancers[?contains(LoadBalancerName, 'q-social')].LoadBalancerArn" \
        --output text)

    aws wafv2 associate-web-acl \
        --web-acl-arn "arn:aws:wafv2:${REGION}:${AWS_ACCOUNT_ID}:regional/webacl/${STACK_NAME}-waf/${WEB_ACL_ID}" \
        --resource-arn $ALB_ARN \
        --region $REGION \
        || warn "Failed to associate WAF with ALB"
}

# Create CloudWatch dashboard
create_dashboard() {
    log "Creating CloudWatch dashboard..."
    
    # Create dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --dashboard-body file://config/monitoring/security-dashboard.json \
        || warn "Failed to create CloudWatch dashboard"

    # Create alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "${STACK_NAME}-blocked-requests" \
        --alarm-description "Alert on high number of blocked requests" \
        --metric-name BlockedRequests \
        --namespace "Q-Social/WAF" \
        --statistic Sum \
        --period 300 \
        --threshold 100 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions ${SNS_TOPIC_ARN} \
        --region $REGION \
        || warn "Failed to create blocked requests alarm"

    aws cloudwatch put-metric-alarm \
        --alarm-name "${STACK_NAME}-error-rate" \
        --alarm-description "Alert on high error rate" \
        --metric-name ErrorCount \
        --namespace "Q-Social/Monitoring" \
        --statistic Sum \
        --period 300 \
        --threshold 50 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions ${SNS_TOPIC_ARN} \
        --region $REGION \
        || warn "Failed to create error rate alarm"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    # Check WAF
    aws wafv2 get-web-acl \
        --name "${STACK_NAME}-waf" \
        --scope REGIONAL \
        --region $REGION \
        || error "WAF verification failed"

    # Check dashboard
    aws cloudwatch get-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --region $REGION \
        || warn "Dashboard verification failed"

    # Test WAF rules
    log "Testing WAF rules..."
    curl -s -o /dev/null -w "%{http_code}" \
        -H "X-Country-Code: CN" \
        https://${DOMAIN_NAME}/api/health

    # Verify metrics
    aws cloudwatch list-metrics \
        --namespace "Q-Social/WAF" \
        --region $REGION \
        || warn "Metrics verification failed"
}

# Main deployment process
main() {
    log "Starting security deployment for ${ENVIRONMENT} environment..."

    # Validate AWS credentials
    validate_aws

    # Deploy components
    deploy_waf
    create_dashboard

    # Verify deployment
    verify_deployment

    log "Security deployment completed successfully"
}

# Execute main function
main
