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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install it first."
        exit 1
    fi

    # Check CDK
    if ! command -v cdk &> /dev/null; then
        error "AWS CDK is not installed. Please install it first."
        exit 1
    }

    # Check AWS credentials
    if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
        error "AWS credentials not configured correctly. Please check your credentials."
        exit 1
    }

    log "Prerequisites check passed."
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        error "Failed to install dependencies"
        exit 1
    }
    log "Dependencies installed successfully."
}

# Build the CDK app
build_app() {
    log "Building CDK app..."
    npm run build
    if [ $? -ne 0 ]; then
        error "Failed to build CDK app"
        exit 1
    }
    log "CDK app built successfully."
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Starting deployment to $ENVIRONMENT environment in $REGION region..."

    # Export environment variables
    export CDK_DEFAULT_REGION=$REGION
    export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)

    # Bootstrap CDK if needed
    log "Checking CDK bootstrap..."
    cdk bootstrap --profile $PROFILE
    if [ $? -ne 0 ]; then
        error "Failed to bootstrap CDK"
        exit 1
    }

    # Deploy stacks in order
    local stacks=(
        "TaskManagementNetworkStack"
        "TaskManagementDatabaseStack"
        "TaskManagementComputeStack"
        "TaskManagementMonitoringStack"
        "TaskManagementCicdStack"
    )

    for stack in "${stacks[@]}"; do
        log "Deploying $stack..."
        cdk deploy $stack \
            --profile $PROFILE \
            --require-approval never \
            --outputs-file ./cdk-outputs-$stack.json
        
        if [ $? -ne 0 ]; then
            error "Failed to deploy $stack"
            exit 1
        }
        log "$stack deployed successfully."
    done

    log "Infrastructure deployment completed successfully."
}

# Main execution
main() {
    log "Starting deployment process..."

    # Check prerequisites
    check_prerequisites

    # Install dependencies
    install_dependencies

    # Build the app
    build_app

    # Deploy infrastructure
    deploy_infrastructure

    log "Deployment process completed successfully."
}

# Execute main function
main
