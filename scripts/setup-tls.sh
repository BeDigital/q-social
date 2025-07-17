#!/bin/bash

# Configuration
DOMAIN="example.com"
EMAIL="admin@example.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
NGINX_CONF="/etc/nginx/sites-available/q-social"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo "Please run as root"
        exit 1
    fi
}

# Function to install required packages
install_packages() {
    apt-get update
    apt-get install -y certbot python3-certbot-nginx nginx
}

# Function to generate strong DH parameters
generate_dhparam() {
    if [ ! -f /etc/nginx/dhparam.pem ]; then
        openssl dhparam -out /etc/nginx/dhparam.pem 4096
    fi
}

# Function to obtain SSL certificate
get_certificate() {
    certbot certonly --nginx \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --rsa-key-size 4096
}

# Function to configure NGINX with secure SSL settings
configure_nginx() {
    cat > "$NGINX_CONF" <<EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;

    # HSTS (uncomment if you're sure)
    add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # DH parameters
    ssl_dhparam /etc/nginx/dhparam.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; object-src 'none'";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";

    # Root directory and index files
    root /var/www/q-social;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static file handling
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Deny access to . files
    location ~ /\\. {
        deny all;
    }
}
EOL

    # Create symbolic link
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

    # Test NGINX configuration
    nginx -t

    # Reload NGINX
    systemctl reload nginx
}

# Function to set up automatic renewal
setup_auto_renewal() {
    # Create renewal script
    cat > /etc/cron.daily/certbot-renew <<EOL
#!/bin/bash
certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOL

    # Make it executable
    chmod +x /etc/cron.daily/certbot-renew
}

# Function to set up monitoring
setup_monitoring() {
    # Create monitoring script
    cat > /usr/local/bin/check-ssl <<EOL
#!/bin/bash
DOMAIN="$DOMAIN"
EXPIRY=\$(openssl s_client -connect \${DOMAIN}:443 -servername \${DOMAIN} 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=\$(date -d "\${EXPIRY}" +%s)
NOW_EPOCH=\$(date +%s)
DAYS_REMAINING=\$(( (\$EXPIRY_EPOCH - \$NOW_EPOCH) / 86400 ))

if [ \$DAYS_REMAINING -lt 30 ]; then
    echo "WARNING: SSL certificate for \${DOMAIN} expires in \${DAYS_REMAINING} days"
    # Add notification logic here (e.g., email, Slack, etc.)
fi
EOL

    # Make it executable
    chmod +x /usr/local/bin/check-ssl

    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 0 * * * /usr/local/bin/check-ssl") | crontab -
}

# Main execution
echo "Starting TLS setup..."
check_root
install_packages
generate_dhparam
get_certificate
configure_nginx
setup_auto_renewal
setup_monitoring
echo "TLS setup completed successfully!"
