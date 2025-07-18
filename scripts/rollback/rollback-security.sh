#!/bin/bash

# Security Rollback Script for Q-Social
# Usage: ./rollback-security.sh <environment> <region> <version>

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
VERSION=${3:-previous}
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

# Backup current configuration
backup_current_config() {
    log "Backing up current configuration..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/q-social/backups/security/${ENVIRONMENT}/${TIMESTAMP}"
    
    # Create backup directory
    mkdir -p $BACKUP_DIR

    # Backup WAF configuration
    aws wafv2 get-web-acl \
        --name "${STACK_NAME}-waf" \
        --scope REGIONAL \
        --region $REGION \
        > "${BACKUP_DIR}/waf-config.json" \
        || warn "Failed to backup WAF configuration"

    # Backup CloudWatch dashboard
    aws cloudwatch get-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --region $REGION \
        > "${BACKUP_DIR}/dashboard-config.json" \
        || warn "Failed to backup dashboard configuration"

    # Backup alarms
    aws cloudwatch describe-alarms \
        --alarm-names "${STACK_NAME}-blocked-requests" "${STACK_NAME}-error-rate" \
        --region $REGION \
        > "${BACKUP_DIR}/alarms-config.json" \
        || warn "Failed to backup alarms configuration"

    log "Backup completed: ${BACKUP_DIR}"
}

# Rollback WAF configuration
rollback_waf() {
    log "Rolling back WAF configuration..."

    # Get current Web ACL ID
    WEB_ACL_ID=$(aws wafv2 list-web-acls \
        --scope REGIONAL \
        --region $REGION \
        --query "WebACLs[?Name=='${STACK_NAME}-waf'].Id" \
        --output text)

    # Get ALB ARN
    ALB_ARN=$(aws elbv2 describe-load-balancers \
        --region $REGION \
        --query "LoadBalancers[?contains(LoadBalancerName, 'q-social')].LoadBalancerArn" \
        --output text)

    # Disassociate WAF from ALB
    aws wafv2 disassociate-web-acl \
        --resource-arn $ALB_ARN \
        --region $REGION \
        || warn "Failed to disassociate WAF from ALB"

    # Delete current WAF configuration
    aws wafv2 delete-web-acl \
        --name "${STACK_NAME}-waf" \
        --scope REGIONAL \
        --region $REGION \
        --lock-token $WEB_ACL_ID \
        || warn "Failed to delete current WAF configuration"

    # Create WAF with previous configuration
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
        || error "Failed to create rollback WAF configuration"

    # Re-associate WAF with ALB
    NEW_WEB_ACL_ID=$(aws wafv2 list-web-acls \
        --scope REGIONAL \
        --region $REGION \
        --query "WebACLs[?Name=='${STACK_NAME}-waf'].Id" \
        --output text)

    aws wafv2 associate-web-acl \
        --web-acl-arn "arn:aws:wafv2:${REGION}:${AWS_ACCOUNT_ID}:regional/webacl/${STACK_NAME}-waf/${NEW_WEB_ACL_ID}" \
        --resource-arn $ALB_ARN \
        --region $REGION \
        || warn "Failed to re-associate WAF with ALB"
}

# Rollback monitoring configuration
rollback_monitoring() {
    log "Rolling back monitoring configuration..."

    # Delete current dashboard
    aws cloudwatch delete-dashboards \
        --dashboard-names "${STACK_NAME}-security" \
        --region $REGION \
        || warn "Failed to delete current dashboard"

    # Create dashboard with previous configuration
    aws cloudwatch put-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --dashboard-body file://config/monitoring/security-dashboard.json \
        || warn "Failed to create rollback dashboard"

    # Delete current alarms
    aws cloudwatch delete-alarms \
        --alarm-names "${STACK_NAME}-blocked-requests" "${STACK_NAME}-error-rate" \
        --region $REGION \
        || warn "Failed to delete current alarms"

    # Create alarms with previous configuration
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
        || warn "Failed to create rollback blocked requests alarm"

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
        || warn "Failed to create rollback error rate alarm"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."

    # Check WAF
    aws wafv2 get-web-acl \
        --name "${STACK_NAME}-waf" \
        --scope REGIONAL \
        --region $REGION \
        || error "WAF rollback verification failed"

    # Check dashboard
    aws cloudwatch get-dashboard \
        --dashboard-name "${STACK_NAME}-security" \
        --region $REGION \
        || warn "Dashboard rollback verification failed"

    # Check alarms
    aws cloudwatch describe-alarms \
        --alarm-names "${STACK_NAME}-blocked-requests" "${STACK_NAME}-error-rate" \
        --region $REGION \
        || warn "Alarms rollback verification failed"

    # Test WAF rules
    log "Testing WAF rules..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-Country-Code: US" \
        https://${DOMAIN_NAME}/api/health)

    if [ "$RESPONSE" != "200" ]; then
        warn "WAF rules test failed with response code: ${RESPONSE}"
    fi
}

# Main rollback process
main() {
    log "Starting security rollback for ${ENVIRONMENT} environment..."

    # Validate AWS credentials
    validate_aws

    # Backup current configuration
    backup_current_config

    # Perform rollback
    rollback_waf
    rollback_monitoring

    # Verify rollback
    verify_rollback

    log "Security rollback completed successfully"
}

# Execute main function
main
