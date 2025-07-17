#!/bin/bash

# Function to generate certificates for an environment
generate_certs() {
    local ENV=$1
    local DOMAIN=$2
    local CERT_DIR="certs/$ENV"
    
    echo "Generating certificates for $ENV environment..."
    
    # Generate private key
    openssl genrsa -out "$CERT_DIR/key.pem" 2048
    
    # Generate CSR
    openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/csr.pem" -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in "$CERT_DIR/csr.pem" -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem"
    
    # Remove CSR as it's no longer needed
    rm "$CERT_DIR/csr.pem"
    
    echo "Certificates generated for $ENV environment"
}

# Generate certificates for each environment
generate_certs "dev" "localhost"
generate_certs "staging" "staging.example.com"
generate_certs "prod" "example.com"

echo "All certificates generated successfully"
