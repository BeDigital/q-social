# Deployment Guide

## Overview

This guide covers the deployment process for Q-Social, including environment setup, security configurations, and monitoring.

## Prerequisites

- Node.js 18.x or higher
- SQLite 3.x
- NGINX 1.20.x or higher
- Let's Encrypt for SSL certificates
- AWS Account (for production deployment)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/example/q-social.git
cd q-social
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create environment-specific .env files:

```bash
# .env.development
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# .env.production
NODE_ENV=production
PORT=3000
API_URL=https://api.example.com
FRONTEND_URL=https://example.com
```

## Database Setup

### 1. Initialize Database

```bash
# Create database directories
mkdir -p data/{dev,staging,prod}

# Run migrations
npm run db:migrate

# Seed development data (development only)
npm run db:seed
```

### 2. Database Backup Configuration

```bash
# Create backup script
cat > scripts/backup-db.sh << EOL
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
sqlite3 data/prod.sqlite ".backup 'backups/\$DATE.sqlite'"
find backups/ -type f -mtime +30 -delete
EOL

# Make script executable
chmod +x scripts/backup-db.sh

# Add to crontab
0 0 * * * /path/to/scripts/backup-db.sh
```

## Security Configuration

### 1. SSL Certificate Setup

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d example.com -d www.example.com

# Configure auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. NGINX Configuration

```nginx
# /etc/nginx/sites-available/q-social
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';";

    # Root directory
    root /var/www/q-social;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Static file serving
    location / {
        try_files $uri $uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
```

## Application Deployment

### 1. Build Application

```bash
# Install dependencies
npm ci

# Build frontend
npm run build

# Copy static files
sudo cp -r dist/* /var/www/q-social/
```

### 2. Process Management

Create systemd service:

```bash
# /etc/systemd/system/q-social.service
[Unit]
Description=Q-Social API Server
After=network.target

[Service]
Type=simple
User=q-social
WorkingDirectory=/opt/q-social
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
sudo systemctl enable q-social
sudo systemctl start q-social
```

## Monitoring Setup

### 1. Application Monitoring

```bash
# Install PM2
npm install -g pm2

# Start application with PM2
pm2 start npm --name "q-social" -- start

# Monitor application
pm2 monit

# Set up PM2 startup script
pm2 startup
pm2 save
```

### 2. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/q-social

/var/log/q-social/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 q-social q-social
    sharedscripts
    postrotate
        systemctl reload q-social
    endscript
}
```

### 3. Performance Monitoring

```bash
# Install monitoring tools
npm install -g clinic

# Run performance analysis
clinic doctor -- node server.js
```

## Backup and Recovery

### 1. Database Backups

```bash
# Manual backup
sqlite3 data/prod.sqlite ".backup 'backup.sqlite'"

# Restore from backup
sqlite3 data/prod.sqlite ".restore 'backup.sqlite'"
```

### 2. Media Backups

```bash
# Backup media files
rsync -av --delete /var/www/q-social/uploads/ /backup/media/

# Restore media files
rsync -av --delete /backup/media/ /var/www/q-social/uploads/
```

## Scaling Considerations

### 1. Load Balancing

```nginx
# /etc/nginx/conf.d/upstream.conf
upstream q-social {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### 2. Caching

```nginx
# /etc/nginx/conf.d/cache.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=q_social_cache:10m max_size=10g inactive=60m use_temp_path=off;

location /api {
    proxy_cache q_social_cache;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    proxy_cache_valid 200 60m;
    proxy_cache_valid 404 1m;
}
```

## Troubleshooting

### Common Issues

1. Database Connection Issues
```bash
# Check database file permissions
ls -l data/prod.sqlite
sudo chown -R q-social:q-social data/

# Check database integrity
sqlite3 data/prod.sqlite "PRAGMA integrity_check;"
```

2. NGINX Issues
```bash
# Test NGINX configuration
sudo nginx -t

# Check NGINX logs
sudo tail -f /var/log/nginx/error.log
```

3. Application Issues
```bash
# Check application logs
tail -f /var/log/q-social/app.log

# Check system resources
htop
```

## Maintenance

### Regular Tasks

1. Certificate Renewal
```bash
# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal
```

2. Database Maintenance
```bash
# Run vacuum
sqlite3 data/prod.sqlite "VACUUM;"

# Check for orphaned records
sqlite3 data/prod.sqlite "PRAGMA foreign_key_check;"
```

3. Log Rotation
```bash
# Force log rotation
logrotate -f /etc/logrotate.d/q-social
```

### Emergency Procedures

1. Quick Rollback
```bash
# Revert to previous version
git checkout <previous-tag>
npm ci
npm run build
sudo systemctl restart q-social
```

2. Database Recovery
```bash
# Restore from latest backup
./scripts/restore-db.sh latest
```

## Security Auditing

### Regular Checks

1. Dependency Audit
```bash
npm audit
npm outdated
```

2. SSL Configuration Test
```bash
curl https://www.ssllabs.com/ssltest/analyze.html?d=example.com
```

3. Security Headers Check
```bash
curl -I https://example.com
```
