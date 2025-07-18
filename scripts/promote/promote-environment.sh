#!/bin/bash

# Environment Promotion Script for Q-Social
# Usage: ./promote-environment.sh <source_env> <target_env> <version>

# Configuration
SOURCE_ENV=${1}
TARGET_ENV=${2}
VERSION=${3}
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

# Validate promotion path
validate_promotion() {
    case "${SOURCE_ENV}-${TARGET_ENV}" in
        "integration-qa"|"int-qa")
            export PROMOTION_PATH="INT_TO_QA"
            export APPROVAL_REQUIRED="false"
            ;;
        "qa-production"|"qa-prod"|"staging-production"|"staging-prod")
            export PROMOTION_PATH="QA_TO_PROD"
            export APPROVAL_REQUIRED="true"
            ;;
        *)
            error "Invalid promotion path: ${SOURCE_ENV} to ${TARGET_ENV}"
            ;;
    esac
}

# Check promotion requirements
check_promotion_requirements() {
    log "Checking promotion requirements..."

    case $PROMOTION_PATH in
        INT_TO_QA)
            # Check integration requirements
            npm run test:unit || error "Unit tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run lint || error "Linting failed"
            npm audit || warn "Security audit has warnings"
            
            # Check code coverage
            npm run test:coverage || warn "Code coverage below threshold"
            ;;

        QA_TO_PROD)
            # Check QA requirements
            npm run test:unit || error "Unit tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run test:e2e || error "E2E tests failed"
            npm run lint || error "Linting failed"
            npm audit || error "Security audit failed"
            
            # Check code coverage
            npm run test:coverage || error "Code coverage below threshold"
            
            # Check performance tests
            npm run test:performance || error "Performance tests failed"
            
            # Check security scan
            npm run security:scan || error "Security scan failed"
            ;;
    esac
}

# Get approvals if required
get_approvals() {
    if [ "$APPROVAL_REQUIRED" = "true" ]; then
        log "Getting required approvals..."
        
        # Create approval request
        APPROVAL_ID=$(aws sns publish \
            --topic-arn ${APPROVAL_TOPIC_ARN} \
            --message "Promotion approval required for ${SOURCE_ENV} to ${TARGET_ENV}" \
            --query 'MessageId' --output text)
            
        # Wait for approval
        while true; do
            APPROVAL_STATUS=$(aws dynamodb get-item \
                --table-name approvals \
                --key "{\"id\": {\"S\": \"${APPROVAL_ID}\"}}" \
                --query 'Item.status.S' --output text)
                
            if [ "$APPROVAL_STATUS" = "APPROVED" ]; then
                log "Promotion approved"
                break
            elif [ "$APPROVAL_STATUS" = "REJECTED" ]; then
                error "Promotion rejected"
            fi
            
            sleep 30
        done
    fi
}

# Backup target environment
backup_environment() {
    log "Backing up target environment ${TARGET_ENV}..."

    # Backup database
    aws rds create-db-snapshot \
        --db-instance-identifier q-social-${TARGET_ENV} \
        --db-snapshot-identifier q-social-${TARGET_ENV}-pre-promotion-${VERSION}

    # Backup configurations
    aws s3 cp \
        s3://${DOMAIN}-${TARGET_ENV}-configs/ \
        s3://${DOMAIN}-${TARGET_ENV}-configs-backup-${VERSION}/ \
        --recursive
}

# Promote configuration
promote_configuration() {
    log "Promoting configuration from ${SOURCE_ENV} to ${TARGET_ENV}..."

    # Update environment variables
    aws s3 cp \
        s3://${DOMAIN}-${SOURCE_ENV}-configs/env.yaml \
        s3://${DOMAIN}-${TARGET_ENV}-configs/env.yaml

    # Update CDK context
    aws s3 cp \
        s3://${DOMAIN}-${SOURCE_ENV}-configs/cdk.context.json \
        s3://${DOMAIN}-${TARGET_ENV}-configs/cdk.context.json

    # Update WAF rules
    case $TARGET_ENV in
        qa)
            aws s3 cp \
                config/waf/qa-rules.json \
                s3://${DOMAIN}-${TARGET_ENV}-configs/waf-rules.json
            ;;
        production)
            aws s3 cp \
                config/waf/production-rules.json \
                s3://${DOMAIN}-${TARGET_ENV}-configs/waf-rules.json
            ;;
    esac
}

# Promote application
promote_application() {
    log "Promoting application version ${VERSION}..."

    # Tag images for target environment
    aws ecr batch-copy-image \
        --source-repository ${DOMAIN}/frontend \
        --source-image-ids imageTag=${VERSION} \
        --destination-repository ${DOMAIN}/frontend \
        --destination-image-tags ${TARGET_ENV}

    aws ecr batch-copy-image \
        --source-repository ${DOMAIN}/backend \
        --source-image-ids imageTag=${VERSION} \
        --destination-repository ${DOMAIN}/backend \
        --destination-image-tags ${TARGET_ENV}

    # Deploy to target environment
    ./scripts/deploy/deploy-environment.sh ${TARGET_ENV} ${AWS_REGION} ${VERSION}
}

# Verify promotion
verify_promotion() {
    log "Verifying promotion to ${TARGET_ENV}..."

    # Run environment-specific tests
    case $TARGET_ENV in
        qa)
            npm run test:smoke || error "Smoke tests failed"
            npm run test:integration || error "Integration tests failed"
            ;;
        production)
            npm run test:smoke || error "Smoke tests failed"
            npm run test:integration || error "Integration tests failed"
            npm run test:e2e || error "E2E tests failed"
            npm run test:performance || error "Performance tests failed"
            ;;
    esac

    # Check application health
    curl -f https://${TARGET_ENV}.${DOMAIN}/health || error "Health check failed"

    # Check metrics
    ./scripts/monitor/check-metrics.sh ${TARGET_ENV} || warn "Metric check has warnings"
}

# Update documentation
update_documentation() {
    log "Updating documentation..."

    # Update version documentation
    echo "${VERSION}" > docs/versions/${TARGET_ENV}.txt

    # Update changelog
    cat << EOF >> docs/changelog.md
## ${VERSION} - $(date +%Y-%m-%d)
- Promoted from ${SOURCE_ENV} to ${TARGET_ENV}
- Approval ID: ${APPROVAL_ID}
- Promotion path: ${PROMOTION_PATH}
EOF

    # Commit documentation updates
    git add docs/versions/${TARGET_ENV}.txt docs/changelog.md
    git commit -m "docs: Update version documentation for ${TARGET_ENV} promotion to ${VERSION}"
    git push
}

# Main promotion process
main() {
    log "Starting promotion from ${SOURCE_ENV} to ${TARGET_ENV}..."

    # Validate promotion path
    validate_promotion

    # Check requirements
    check_promotion_requirements

    # Get approvals if needed
    get_approvals

    # Execute promotion
    backup_environment
    promote_configuration
    promote_application

    # Verify and document
    verify_promotion
    update_documentation

    log "Promotion completed successfully"
}

# Execute main function
main
