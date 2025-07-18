#!/bin/bash

# Environment Deployment Script for Q-Social
# Usage: ./deploy-environment.sh <environment> <region> <version>

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
VERSION=${3:-latest}
DOMAIN="be-digital-q-social"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        int|integration)
            export ENV_NAME="integration"
            export MIN_TASKS=1
            export MAX_TASKS=2
            export DOMAIN_PREFIX="int"
            ;;
        qa|staging)
            export ENV_NAME="qa"
            export MIN_TASKS=2
            export MAX_TASKS=4
            export DOMAIN_PREFIX="qa"
            ;;
        prod|production)
            export ENV_NAME="production"
            export MIN_TASKS=3
            export MAX_TASKS=20
            export DOMAIN_PREFIX=""
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            ;;
    esac
}

# Pre-deployment checks
run_pre_deployment_checks() {
    log "Running pre-deployment checks for $ENVIRONMENT..."

    # Check AWS credentials
    aws sts get-caller-identity --region $REGION || error "AWS credentials check failed"

    # Check required tools
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required"
    command -v docker >/dev/null 2>&1 || error "docker is required"

    # Environment-specific checks
    case $ENV_NAME in
        integration)
            npm run test:unit || warn "Unit tests have failures"
            npm run lint || warn "Linting issues found"
            ;;
        qa)
            npm run test:unit || error "Unit tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run lint || error "Linting failed"
            ;;
        production)
            npm run test:unit || error "Unit tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run test:e2e || error "E2E tests failed"
            npm run lint || error "Linting failed"
            npm audit || error "Security audit failed"
            ;;
    esac
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure for $ENVIRONMENT..."

    # Deploy CDK stacks
    cdk deploy \
        --context environment=$ENV_NAME \
        --context minTasks=$MIN_TASKS \
        --context maxTasks=$MAX_TASKS \
        --require-approval never \
        "*${ENV_NAME}*" || error "Infrastructure deployment failed"
}

# Deploy application
deploy_application() {
    log "Deploying application version $VERSION to $ENVIRONMENT..."

    # Build and push Docker images
    docker build -t ${DOMAIN}/frontend:${VERSION} frontend/
    docker build -t ${DOMAIN}/backend:${VERSION} backend/

    aws ecr get-login-password --region $REGION | \
        docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com

    docker push ${DOMAIN}/frontend:${VERSION}
    docker push ${DOMAIN}/backend:${VERSION}

    # Update ECS services
    aws ecs update-service \
        --cluster q-social-${ENV_NAME} \
        --service frontend \
        --force-new-deployment \
        --region $REGION

    aws ecs update-service \
        --cluster q-social-${ENV_NAME} \
        --service backend \
        --force-new-deployment \
        --region $REGION
}

# Configure WAF rules
configure_waf() {
    log "Configuring WAF rules for $ENVIRONMENT..."

    case $ENV_NAME in
        integration)
            # Basic WAF rules for integration
            aws wafv2 update-web-acl \
                --name "q-social-${ENV_NAME}-waf" \
                --scope REGIONAL \
                --region $REGION \
                --rules file://config/waf/integration-rules.json
            ;;
        qa)
            # Enhanced WAF rules for QA
            aws wafv2 update-web-acl \
                --name "q-social-${ENV_NAME}-waf" \
                --scope REGIONAL \
                --region $REGION \
                --rules file://config/waf/qa-rules.json
            ;;
        production)
            # Production WAF rules with geographic restrictions
            aws wafv2 update-web-acl \
                --name "q-social-${ENV_NAME}-waf" \
                --scope REGIONAL \
                --region $REGION \
                --rules file://config/waf/production-rules.json
            ;;
    esac
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment for $ENVIRONMENT..."

    # Check service health
    aws ecs describe-services \
        --cluster q-social-${ENV_NAME} \
        --services frontend backend \
        --region $REGION

    # Check endpoints
    curl -f https://${DOMAIN_PREFIX}.${DOMAIN}/health || error "Health check failed"

    # Environment-specific checks
    case $ENV_NAME in
        integration)
            npm run test:smoke || warn "Smoke tests have failures"
            ;;
        qa)
            npm run test:smoke || error "Smoke tests failed"
            npm run test:integration || error "Integration tests failed"
            ;;
        production)
            npm run test:smoke || error "Smoke tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run test:e2e || error "E2E tests failed"
            ;;
    esac
}

# Main deployment process
main() {
    log "Starting deployment process for $ENVIRONMENT..."

    # Validate environment
    validate_environment

    # Run pre-deployment checks
    run_pre_deployment_checks

    # Deploy
    deploy_infrastructure
    deploy_application
    configure_waf

    # Verify deployment
    verify_deployment

    log "Deployment completed successfully for $ENVIRONMENT"
}

# Execute main function
main
