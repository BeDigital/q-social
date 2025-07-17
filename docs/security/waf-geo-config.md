# Web Application Firewall - Geographic Access Configuration

## Phase 1: United States Only (Months 0-3)
```yaml
WAF Configuration:
  Name: be-digital-q-social-waf
  Region: us-west-2
  
  Geographic Match Conditions:
    Rule: GeoAllowUS
    Priority: 100
    Action: ALLOW
    CountryCode: US
    
    Override IPs:
      - Type: CIDR
        Value: ${INTERNAL_IP_RANGES}
        Description: "Internal corporate IPs"
      
    Default Action: BLOCK
    
  Block Response:
    StatusCode: 403
    CustomResponse:
      ResponseCode: 403
      ContentType: application/json
      Body: |
        {
          "error": "Access denied by geographic restriction",
          "message": "This service is currently available only in the United States"
        }

  Logging:
    CloudWatch:
      LogGroup: /aws/waf/be-digital-q-social
      RetentionDays: 90
    
    Metrics:
      - GeoBlocked
      - AllowedRequests
      - TotalRequests
```

## Phase 2: UK Expansion (Months 4-6)
```yaml
WAF Configuration:
  Geographic Match Conditions:
    Rule: GeoAllowUSUK
    Priority: 100
    Action: ALLOW
    CountryCodes: 
      - US
      - GB
    
  Rate Limiting:
    UK_Requests:
      Limit: 10000/5min
      Action: COUNT  # Monitor before enforcing
      
  Monitoring:
    UKMetrics:
      - RequestVolume
      - ErrorRates
      - ResponseTimes
```

## Phase 3: EU Expansion (Months 7-9)
```yaml
WAF Configuration:
  Geographic Match Conditions:
    Rule: GeoAllowUSUKEU
    Priority: 100
    Action: ALLOW
    CountryCodes:
      - US
      - GB
      # EU Member States
      - AT  # Austria
      - BE  # Belgium
      - BG  # Bulgaria
      - HR  # Croatia
      - CY  # Cyprus
      - CZ  # Czech Republic
      - DK  # Denmark
      - EE  # Estonia
      - FI  # Finland
      - FR  # France
      - DE  # Germany
      - GR  # Greece
      - HU  # Hungary
      - IE  # Ireland
      - IT  # Italy
      - LV  # Latvia
      - LT  # Lithuania
      - LU  # Luxembourg
      - MT  # Malta
      - NL  # Netherlands
      - PL  # Poland
      - PT  # Portugal
      - RO  # Romania
      - SK  # Slovakia
      - SI  # Slovenia
      - ES  # Spain
      - SE  # Sweden

  Rate Limiting:
    EU_Requests:
      Limit: 50000/5min
      Action: COUNT  # Monitor before enforcing
```

## Implementation Rules

### Base Rules (All Phases)
```yaml
Security Rules:
  SQL_Injection:
    Priority: 10
    Action: BLOCK
    
  XSS_Protection:
    Priority: 20
    Action: BLOCK
    
  Path_Traversal:
    Priority: 30
    Action: BLOCK
    
  Remote_File_Inclusion:
    Priority: 40
    Action: BLOCK

Rate Rules:
  Global_Rate_Limit:
    Priority: 50
    Limit: 2000/min
    Action: BLOCK
```

### Phase-Specific Monitoring
```yaml
Monitoring:
  Phase1_US:
    Metrics:
      - RequestsByState
      - BlockedByGeo
      - AllowedRequests
    Alerts:
      - HighBlockRate
      - UnusualTrafficPattern
      
  Phase2_UK:
    Metrics:
      - RequestsByCountry
      - UKSpecificMetrics
      - ResponseLatency
    Alerts:
      - UKTrafficSpike
      - AnomalousUKPatterns
      
  Phase3_EU:
    Metrics:
      - RequestsByEUCountry
      - EUTrafficDistribution
      - RegionalLatency
    Alerts:
      - EUTrafficSpike
      - RegionalAnomaly
```

## Rollout Plan

### Phase 1: US Only (Months 0-3)
```yaml
Implementation:
  Week 1:
    - Deploy US-only WAF rules
    - Configure logging and monitoring
    - Set up alerts
    
  Week 2:
    - Monitor false positives
    - Tune rate limits
    - Adjust block messages
    
  Weeks 3-12:
    - Collect metrics
    - Optimize rules
    - Prepare UK expansion
```

### Phase 2: UK Addition (Months 4-6)
```yaml
Implementation:
  Week 1:
    - Add UK to allowed countries
    - Deploy UK-specific monitoring
    - Update rate limits
    
  Week 2:
    - Monitor UK traffic patterns
    - Adjust regional settings
    - Update documentation
    
  Weeks 3-12:
    - Fine-tune UK access
    - Prepare EU expansion
    - Update compliance docs
```

### Phase 3: EU Expansion (Months 7-9)
```yaml
Implementation:
  Week 1:
    - Add EU countries
    - Deploy EU monitoring
    - Update rate limits
    
  Week 2:
    - Monitor EU traffic
    - Adjust regional settings
    - Update documentation
    
  Weeks 3-12:
    - Optimize EU access
    - Fine-tune performance
    - Complete compliance docs
```

## Compliance Requirements

### Data Protection
```yaml
GDPR_Compliance:
  Phase2_UK:
    - Data residency verification
    - Cookie consent implementation
    - Privacy policy updates
    - Data processing agreements
    
  Phase3_EU:
    - EU data protection measures
    - Regional privacy requirements
    - Cross-border data transfers
    - EU representative appointment
```

### Monitoring and Reporting
```yaml
Reporting:
  Daily:
    - Geographic access patterns
    - Blocked request summary
    - Performance metrics
    - Security incidents
    
  Weekly:
    - Traffic analysis by region
    - Rule effectiveness
    - False positive review
    - Performance trends
    
  Monthly:
    - Compliance status
    - Regional metrics
    - Security posture
    - Recommendation review
```

## Emergency Procedures
```yaml
Emergency_Response:
  Geographic_Block:
    - Immediate country blocking
    - Traffic rerouting
    - Incident notification
    - Management escalation
    
  Rate_Limit_Adjustment:
    - Dynamic rate limiting
    - Traffic shaping
    - Alert notification
    - Performance monitoring
```
