import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    this.vpc = new ec2.Vpc(this, 'TaskManagementVPC', {
      maxAzs: 3,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // VPC Flow Logs
    const logGroup = new cdk.aws_logs.LogGroup(this, 'VPCFlowLogs', {
      retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });

    this.vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // Security Groups
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    const appSg = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Services',
      allowAllOutbound: true,
    });

    const dbSg = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Database',
      allowAllOutbound: false,
    });

    // Security Group Rules
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    appSg.addIngressRule(
      albSg,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    dbSg.addIngressRule(
      appSg,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL traffic from App'
    );

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'TaskManagementVpcId',
    });

    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: albSg.securityGroupId,
      description: 'ALB Security Group ID',
      exportName: 'TaskManagementAlbSgId',
    });

    new cdk.CfnOutput(this, 'AppSecurityGroupId', {
      value: appSg.securityGroupId,
      description: 'App Security Group ID',
      exportName: 'TaskManagementAppSgId',
    });

    new cdk.CfnOutput(this, 'DbSecurityGroupId', {
      value: dbSg.securityGroupId,
      description: 'DB Security Group ID',
      exportName: 'TaskManagementDbSgId',
    });
  }
}
