#!/bin/bash

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-west-2}
PROFILE=${3:-default}
COMMAND=${4:-"status"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check stack status
check_stack_status() {
    local stacks=(
        "TaskManagementNetworkStack"
        "TaskManagementDatabaseStack"
        "TaskManagementComputeStack"
        "TaskManagementMonitoringStack"
        "TaskManagementCicdStack"
    )

    log "Checking stack status..."
    
    for stack in "${stacks[@]}"; do
        local status=$(aws cloudformation describe-stacks \
            --stack-name $stack \
            --profile $PROFILE \
            --region $REGION \
            --query 'Stacks[0].StackStatus' \
            --output text 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            info "$stack: $status"
        else
            warn "$stack: NOT_FOUND"
        fi
    done
}

# Check ECS services
check_ecs_services() {
    log "Checking ECS services..."
    
    local cluster="TaskManagementCluster"
    local services=$(aws ecs list-services \
        --cluster $cluster \
        --profile $PROFILE \
        --region $REGION \
        --query 'serviceArns[]' \
        --output text)

    if [ -n "$services" ]; then
        aws ecs describe-services \
            --cluster $cluster \
            --services $services \
            --profile $PROFILE \
            --region $REGION \
            --query 'services[].[serviceName,status,runningCount,desiredCount]' \
            --output table
    else
        warn "No ECS services found"
    fi
}

# Check database status
check_database() {
    log "Checking database status..."
    
    aws rds describe-db-clusters \
        --profile $PROFILE \
        --region $REGION \
        --query 'DBClusters[?contains(DBClusterIdentifier, `taskmanagement`)].[DBClusterIdentifier,Status,Engine,EngineVersion]' \
        --output table
}

# Check alarms
check_alarms() {
    log "Checking CloudWatch alarms..."
    
    aws cloudwatch describe-alarms \
        --profile $PROFILE \
        --region $REGION \
        --query 'MetricAlarms[?contains(AlarmName, `TaskManagement`)].[AlarmName,StateValue,StateReason]' \
        --output table
}

# Check recent errors
check_errors() {
    log "Checking recent errors..."
    
    local log_groups=$(aws logs describe-log-groups \
        --profile $PROFILE \
        --region $REGION \
        --query 'logGroups[?contains(logGroupName, `TaskManagement`)].logGroupName' \
        --output text)

    for group in $log_groups; do
        info "Checking errors in $group..."
        aws logs filter-log-events \
            --log-group-name $group \
            --filter-pattern "ERROR" \
            --start-time $(( $(date +%s) - 3600 ))000 \
            --profile $PROFILE \
            --region $REGION \
            --query 'events[].[timestamp,message]' \
            --output table
    done
}

# Check metrics
check_metrics() {
    log "Checking key metrics..."
    
    local metrics=(
        "CPUUtilization"
        "MemoryUtilization"
        "DatabaseConnections"
        "FreeableMemory"
    )

    for metric in "${metrics[@]}"; do
        info "Getting $metric statistics..."
        aws cloudwatch get-metric-statistics \
            --namespace AWS/ECS \
            --metric-name $metric \
            --dimensions Name=ClusterName,Value=TaskManagementCluster \
            --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
            --period 300 \
            --statistics Average \
            --profile $PROFILE \
            --region $REGION \
            --query 'Datapoints[*].[Timestamp,Average]' \
            --output table
    done
}

# Show help
show_help() {
    echo "Usage: $0 [environment] [region] [profile] [command]"
    echo
    echo "Commands:"
    echo "  status    - Show overall status (default)"
    echo "  services  - Check ECS services"
    echo "  database  - Check database status"
    echo "  alarms    - Check CloudWatch alarms"
    echo "  errors    - Check recent errors"
    echo "  metrics   - Check key metrics"
    echo "  all       - Run all checks"
    echo
    echo "Example:"
    echo "  $0 prod us-west-2 production services"
}

# Main execution
main() {
    case $COMMAND in
        "status")
            check_stack_status
            ;;
        "services")
            check_ecs_services
            ;;
        "database")
            check_database
            ;;
        "alarms")
            check_alarms
            ;;
        "errors")
            check_errors
            ;;
        "metrics")
            check_metrics
            ;;
        "all")
            check_stack_status
            check_ecs_services
            check_database
            check_alarms
            check_errors
            check_metrics
            ;;
        "help")
            show_help
            ;;
        *)
            error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main
