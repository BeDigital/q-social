#!/bin/bash

# Exit on error
set -e

# Configuration
APP_NAME="q-social"
DEPLOY_USER="q-social"
DEPLOY_PATH="/opt/$APP_NAME"
BACKUP_PATH="/opt/backups/$APP_NAME"
LOG_PATH="/var/log/$APP_NAME"
NGINX_PATH="/etc/nginx/sites-available"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root"
    exit 1
fi

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_PATH/$TIMESTAMP"
    
    # Backup database
    if [ -f "$DEPLOY_PATH/data/prod.sqlite" ]; then
        sqlite3 "$DEPLOY_PATH/data/prod.sqlite" ".backup '$BACKUP_PATH/$TIMESTAMP/prod.sqlite'"
    fi
    
    # Backup uploads
    if [ -d "$DEPLOY_PATH/uploads" ]; then
        tar -czf "$BACKUP_PATH/$TIMESTAMP/uploads.tar.gz" -C "$DEPLOY_PATH" uploads
    fi
    
    # Backup env file
    if [ -f "$DEPLOY_PATH/.env" ]; then
        cp "$DEPLOY_PATH/.env" "$BACKUP_PATH/$TIMESTAMP/"
    fi
    
    log "Backup created at $BACKUP_PATH/$TIMESTAMP"
}

# Verify environment
verify_environment() {
    log "Verifying environment..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    }
    
    # Check required directories
    mkdir -p "$DEPLOY_PATH"
    mkdir -p "$LOG_PATH"
    mkdir -p "$DEPLOY_PATH/data"
    mkdir -p "$DEPLOY_PATH/uploads"
    
    # Set permissions
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$LOG_PATH"
    
    log "Environment verified"
}

# Deploy application
deploy_application() {
    log "Starting deployment..."
    
    # Stop application
    if systemctl is-active --quiet q-social; then
        log "Stopping application..."
        systemctl stop q-social
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    cd "$DEPLOY_PATH"
    sudo -u "$DEPLOY_USER" npm ci --production
    
    # Build application
    log "Building application..."
    sudo -u "$DEPLOY_USER" npm run build
    
    # Copy production environment file
    cp config/production.env .env
    
    # Update permissions
    chown -R "$DEPLOY_USER:$DEPLOY_USER" .
    
    # Run database migrations
    log "Running database migrations..."
    sudo -u "$DEPLOY_USER" npm run db:migrate
    
    # Start application
    log "Starting application..."
    systemctl start q-social
    
    log "Deployment completed"
}

# Configure NGINX
configure_nginx() {
    log "Configuring NGINX..."
    
    # Check if NGINX is installed
    if ! command -v nginx &> /dev/null; then
        error "NGINX is not installed"
        exit 1
    }
    
    # Copy NGINX configuration
    cp "$DEPLOY_PATH/config/nginx.conf" "$NGINX_PATH/$APP_NAME"
    
    # Create symbolic link if not exists
    if [ ! -L "/etc/nginx/sites-enabled/$APP_NAME" ]; then
        ln -s "$NGINX_PATH/$APP_NAME" "/etc/nginx/sites-enabled/"
    fi
    
    # Test NGINX configuration
    nginx -t
    
    # Reload NGINX
    systemctl reload nginx
    
    log "NGINX configured"
}

# Monitor deployment
monitor_deployment() {
    log "Monitoring deployment..."
    
    # Check if application is running
    if ! systemctl is-active --quiet q-social; then
        error "Application failed to start"
        exit 1
    }
    
    # Check application logs for errors
    if grep -i "error" "$LOG_PATH/error.log" > /dev/null; then
        warn "Errors found in application logs"
    fi
    
    # Check application health
    if ! curl -s http://localhost:3000/health | grep -q "healthy"; then
        error "Application health check failed"
        exit 1
    }
    
    log "Deployment monitoring completed"
}

# Rollback function
rollback() {
    error "Deployment failed, rolling back..."
    
    # Restore latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_PATH" | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        # Restore database
        if [ -f "$BACKUP_PATH/$LATEST_BACKUP/prod.sqlite" ]; then
            sqlite3 "$DEPLOY_PATH/data/prod.sqlite" ".restore '$BACKUP_PATH/$LATEST_BACKUP/prod.sqlite'"
        fi
        
        # Restore uploads
        if [ -f "$BACKUP_PATH/$LATEST_BACKUP/uploads.tar.gz" ]; then
            tar -xzf "$BACKUP_PATH/$LATEST_BACKUP/uploads.tar.gz" -C "$DEPLOY_PATH"
        fi
        
        # Restore env file
        if [ -f "$BACKUP_PATH/$LATEST_BACKUP/.env" ]; then
            cp "$BACKUP_PATH/$LATEST_BACKUP/.env" "$DEPLOY_PATH/"
        fi
        
        systemctl restart q-social
        log "Rollback completed"
    else
        error "No backup found for rollback"
        exit 1
    fi
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    # Create backup
    create_backup
    
    # Verify environment
    verify_environment
    
    # Deploy application
    if ! deploy_application; then
        rollback
        exit 1
    fi
    
    # Configure NGINX
    if ! configure_nginx; then
        rollback
        exit 1
    fi
    
    # Monitor deployment
    monitor_deployment
    
    log "Deployment process completed successfully"
}

# Run main function
main
