#!/bin/bash

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
PROFILE=${3:-default}
STACK_NAME=${4:-"all"}

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

# Check changes in stack
check_changes() {
    local stack=$1
    log "Checking changes for $stack..."
    
    cdk diff $stack --profile $PROFILE
    if [ $? -ne 0 ]; then
        error "Failed to check changes for $stack"
        exit 1
    }
}

# Update specific stack
update_stack() {
    local stack=$1
    log "Updating $stack..."

    # Backup current state
    cdk synth $stack > cdk.$stack.$(date +%Y%m%d%H%M%S).yaml

    # Deploy updates
    cdk deploy $stack \
        --profile $PROFILE \
        --require-approval never \
        --outputs-file ./cdk-outputs-$stack.json

    if [ $? -ne 0 ]; then
        error "Failed to update $stack"
        exit 1
    }
    log "$stack updated successfully."
}

# Update all stacks
update_all() {
    local stacks=(
        "TaskManagementNetworkStack"
        "TaskManagementDatabaseStack"
        "TaskManagementComputeStack"
        "TaskManagementMonitoringStack"
        "TaskManagementCicdStack"
    )

    for stack in "${stacks[@]}"; do
        check_changes $stack
        update_stack $stack
    done
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check if stack exists
    if [ "$STACK_NAME" != "all" ]; then
        aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --profile $PROFILE \
            --region $REGION &> /dev/null
        
        if [ $? -ne 0 ]; then
            error "Stack $STACK_NAME does not exist"
            exit 1
        }
    fi

    log "Configuration validation passed."
}

# Main execution
main() {
    log "Starting update process..."

    # Validate configuration
    validate_config

    # Build the app
    npm run build
    if [ $? -ne 0 ]; then
        error "Failed to build CDK app"
        exit 1
    }

    # Update infrastructure
    if [ "$STACK_NAME" == "all" ]; then
        update_all
    else
        check_changes $STACK_NAME
        update_stack $STACK_NAME
    fi

    log "Update process completed successfully."
}

# Execute main function
main
