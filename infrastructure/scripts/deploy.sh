#!/bin/bash

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
PROFILE=${3:-default}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        prod|production)
            DOMAIN="be-digital-q-social"
            CLUSTER="q-social-prod"
            MIN_TASKS=2
            MAX_TASKS=10
            ;;
        staging)
            DOMAIN="staging.be-digital-q-social"
            CLUSTER="q-social-staging"
            MIN_TASKS=1
            MAX_TASKS=4
            ;;
        dev|development)
            DOMAIN="dev.be-digital-q-social"
            CLUSTER="q-social-dev"
            MIN_TASKS=1
            MAX_TASKS=2
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            ;;
    esac
}

# Check WAF configuration
check_waf_config() {
    log "Checking WAF configuration..."
    
    # Get current month since project start
    MONTHS_SINCE_START=$(( ($(date +%s) - $(date -d "2023-07-01" +%s)) / (30*24*60*60) ))
    
    # Determine WAF phase
    if [ $MONTHS_SINCE_START -lt 3 ]; then
        ALLOWED_COUNTRIES='["US"]'
    elif [ $MONTHS_SINCE_START -lt 6 ]; then
        ALLOWED_COUNTRIES='["US","GB"]'
    else
        ALLOWED_COUNTRIES='["US","GB","EU"]'
    fi
    
    # Update WAF rules
    aws wafv2 update-web-acl \
        --name "q-social-waf" \
        --scope REGIONAL \
        --region $REGION \
        --allowed-countries "$ALLOWED_COUNTRIES" \
        --profile $PROFILE || error "Failed to update WAF configuration"
}

# Check SSL certificates
check_ssl_certificates() {
    log "Checking SSL certificates..."
    
    # Verify certificate exists
    CERT_ARN=$(aws acm list-certificates \
        --region $REGION \
        --profile $PROFILE \
        --query "CertificateSummaryList[?DomainName=='*.$DOMAIN'].CertificateArn" \
        --output text)
    
    if [ -z "$CERT_ARN" ]; then
        error "SSL certificate not found for *.$DOMAIN"
    fi
    
    # Check expiration
    EXPIRY=$(aws acm describe-certificate \
        --certificate-arn $CERT_ARN \
        --region $REGION \
        --profile $PROFILE \
        --query "Certificate.NotAfter" \
        --output text)
    
    EXPIRY_SECONDS=$(date -d "$EXPIRY" +%s)
    NOW_SECONDS=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_SECONDS - $NOW_SECONDS) / (24*60*60) ))
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        warn "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure..."
    
    cd infrastructure
    
    # Deploy CDK stacks
    cdk deploy \
        --profile $PROFILE \
        --region $REGION \
        --require-approval never \
        --context environment=$ENVIRONMENT \
        --context domain=$DOMAIN \
        --context minTasks=$MIN_TASKS \
        --context maxTasks=$MAX_TASKS \
        "*" || error "Failed to deploy infrastructure"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Build application
    npm run build || error "Failed to build application"
    
    # Build and push Docker images
    docker build -t $DOMAIN/frontend:latest frontend/
    docker build -t $DOMAIN/backend:latest backend/
    
    aws ecr get-login-password --region $REGION --profile $PROFILE | \
        docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com
    
    docker push $DOMAIN/frontend:latest
    docker push $DOMAIN/backend:latest
    
    # Update ECS services
    aws ecs update-service \
        --cluster $CLUSTER \
        --service frontend \
        --force-new-deployment \
        --region $REGION \
        --profile $PROFILE
        
    aws ecs update-service \
        --cluster $CLUSTER \
        --service backend \
        --force-new-deployment \
        --region $REGION \
        --profile $PROFILE
}

# Run post-deployment checks
post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Check service health
    aws ecs describe-services \
        --cluster $CLUSTER \
        --services frontend backend \
        --region $REGION \
        --profile $PROFILE \
        --query 'services[*].[serviceName,status]' \
        --output table
    
    # Check target group health
    aws elbv2 describe-target-health \
        --target-group-arn $TARGET_GROUP_ARN \
        --region $REGION \
        --profile $PROFILE \
        --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' \
        --output table
    
    # Check CloudWatch metrics
    aws cloudwatch get-metric-statistics \
        --namespace AWS/ApplicationELB \
        --metric-name HealthyHostCount \
        --dimensions Name=TargetGroup,Value=$TARGET_GROUP_ARN \
        --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%SZ) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
        --period 300 \
        --statistics Average \
        --region $REGION \
        --profile $PROFILE
}

# Main execution
main() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    # Validate environment
    validate_environment
    
    # Check configurations
    check_waf_config
    check_ssl_certificates
    
    # Deploy
    deploy_infrastructure
    deploy_application
    
    # Post-deployment
    post_deployment_checks
    
    log "Deployment completed successfully"
}

# Execute main function
main
