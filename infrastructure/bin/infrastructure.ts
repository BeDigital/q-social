#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();

// VPC and Network Infrastructure
const networkStack = new NetworkStack(app, 'TaskManagementNetworkStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Database Infrastructure
const databaseStack = new DatabaseStack(app, 'TaskManagementDatabaseStack', {
  vpc: networkStack.vpc,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Compute Infrastructure
const computeStack = new ComputeStack(app, 'TaskManagementComputeStack', {
  vpc: networkStack.vpc,
  database: databaseStack.database,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Monitoring Infrastructure
const monitoringStack = new MonitoringStack(app, 'TaskManagementMonitoringStack', {
  vpc: networkStack.vpc,
  cluster: computeStack.cluster,
  database: databaseStack.database,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// CI/CD Pipeline
const cicdStack = new CicdStack(app, 'TaskManagementCicdStack', {
  vpc: networkStack.vpc,
  cluster: computeStack.cluster,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Add dependencies
databaseStack.addDependency(networkStack);
computeStack.addDependency(databaseStack);
monitoringStack.addDependency(computeStack);
cicdStack.addDependency(computeStack);
