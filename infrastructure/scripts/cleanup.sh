#!/bin/bash

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
PROFILE=${3:-default}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Confirm destruction
confirm_destruction() {
    read -p "Are you sure you want to destroy the infrastructure in $ENVIRONMENT environment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Destruction cancelled."
        exit 0
    fi
}

# Backup configuration
backup_config() {
    local backup_dir="backups/$(date +%Y%m%d%H%M%S)"
    log "Backing up configuration to $backup_dir..."
    
    mkdir -p $backup_dir
    
    # Backup CDK outputs
    cp cdk-outputs-*.json $backup_dir/ 2>/dev/null || true
    
    # Backup CloudFormation templates
    for stack in $(aws cloudformation list-stacks \
        --profile $PROFILE \
        --region $REGION \
        --query 'StackSummaries[?contains(StackName, `TaskManagement`)].StackName' \
        --output text); do
        aws cloudformation get-template \
            --stack-name $stack \
            --profile $PROFILE \
            --region $REGION \
            --query 'TemplateBody' \
            --output text > "$backup_dir/$stack.yaml"
    done

    log "Configuration backed up successfully."
}

# Destroy infrastructure
destroy_infrastructure() {
    log "Starting infrastructure destruction..."

    # Destroy stacks in reverse order
    local stacks=(
        "TaskManagementCicdStack"
        "TaskManagementMonitoringStack"
        "TaskManagementComputeStack"
        "TaskManagementDatabaseStack"
        "TaskManagementNetworkStack"
    )

    for stack in "${stacks[@]}"; do
        log "Destroying $stack..."
        cdk destroy $stack \
            --profile $PROFILE \
            --force
        
        if [ $? -ne 0 ]; then
            error "Failed to destroy $stack"
            exit 1
        }
        log "$stack destroyed successfully."
    done

    log "Infrastructure destruction completed successfully."
}

# Cleanup resources
cleanup_resources() {
    log "Cleaning up resources..."

    # Clean up ECR repositories
    for repo in $(aws ecr describe-repositories \
        --profile $PROFILE \
        --region $REGION \
        --query 'repositories[?contains(repositoryName, `task-management`)].repositoryName' \
        --output text); do
        warn "Deleting ECR repository: $repo"
        aws ecr delete-repository \
            --repository-name $repo \
            --force \
            --profile $PROFILE \
            --region $REGION
    done

    # Clean up CloudWatch log groups
    for log_group in $(aws logs describe-log-groups \
        --profile $PROFILE \
        --region $REGION \
        --query 'logGroups[?contains(logGroupName, `TaskManagement`)].logGroupName' \
        --output text); do
        warn "Deleting log group: $log_group"
        aws logs delete-log-group \
            --log-group-name $log_group \
            --profile $PROFILE \
            --region $REGION
    done

    # Clean up S3 buckets
    for bucket in $(aws s3api list-buckets \
        --profile $PROFILE \
        --query 'Buckets[?contains(Name, `taskmanagement`)].Name' \
        --output text); do
        warn "Emptying and deleting S3 bucket: $bucket"
        aws s3 rm s3://$bucket --recursive --profile $PROFILE
        aws s3api delete-bucket --bucket $bucket --profile $PROFILE --region $REGION
    done

    log "Resource cleanup completed."
}

# Main execution
main() {
    log "Starting cleanup process..."

    # Confirm destruction
    confirm_destruction

    # Backup configuration
    backup_config

    # Destroy infrastructure
    destroy_infrastructure

    # Cleanup resources
    cleanup_resources

    log "Cleanup process completed successfully."
}

# Execute main function
main
