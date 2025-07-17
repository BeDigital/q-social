import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseCluster;
  public readonly databaseSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create Database Secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'admin',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    // Create Aurora Serverless v2 Cluster
    this.database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_6,
      }),
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      instanceProps: {
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MEDIUM
        ),
      },
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader1'),
        rds.ClusterInstance.serverlessV2('Reader2'),
      ],
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.seconds(60),
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      parameterGroup: new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_14_6,
        }),
        parameters: {
          'timezone': 'UTC',
          'shared_preload_libraries': 'pg_stat_statements',
          'pg_stat_statements.track': 'ALL',
          'log_statement': 'all',
          'log_min_duration_statement': '1000',
        },
      }),
    });

    // Create Database Proxy
    const proxy = new rds.DatabaseProxy(this, 'DatabaseProxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(this.database),
      secrets: [this.databaseSecret],
      vpc: props.vpc,
      securityGroups: this.database.connections.securityGroups,
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(5),
      maxConnectionsPercent: 90,
      debugLogging: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'Database Endpoint',
      exportName: 'TaskManagementDbEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseProxyEndpoint', {
      value: proxy.endpoint,
      description: 'Database Proxy Endpoint',
      exportName: 'TaskManagementDbProxyEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database Secret ARN',
      exportName: 'TaskManagementDbSecretArn',
    });
  }
}
