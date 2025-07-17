import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseCluster;
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'TaskManagementCluster', {
      vpc: props.vpc,
      containerInsights: true,
    });

    // Create ECR Repositories
    const apiRepository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'task-management/api',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 5,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    const webRepository = new ecr.Repository(this, 'WebRepository', {
      repositoryName: 'task-management/web',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 5,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
    });

    // Create ALB Listener
    const httpsListener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      certificates: [/* Add ACM certificate here */],
    });

    // Create ECS Task Role
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add permissions to task role
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    // Create API Service
    const apiTaskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      taskRole,
    });

    const apiContainer = apiTaskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepository),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api',
        logRetention: logs.RetentionDays.ONE_MONTH,
      }),
      environment: {
        NODE_ENV: 'production',
        DB_HOST: props.database.clusterEndpoint.hostname,
        DB_PORT: '5432',
        DB_NAME: 'taskmanagement',
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(props.database.secret!, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.database.secret!, 'password'),
      },
    });

    apiContainer.addPortMappings({
      containerPort: 3000,
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster: this.cluster,
      taskDefinition: apiTaskDefinition,
      desiredCount: 2,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Create Web Service
    const webTaskDefinition = new ecs.FargateTaskDefinition(this, 'WebTaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      taskRole,
    });

    const webContainer = webTaskDefinition.addContainer('WebContainer', {
      image: ecs.ContainerImage.fromEcrRepository(webRepository),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'web',
        logRetention: logs.RetentionDays.ONE_MONTH,
      }),
      environment: {
        NODE_ENV: 'production',
        API_URL: 'https://api.taskmanagement.com',
      },
    });

    webContainer.addPortMappings({
      containerPort: 80,
    });

    const webService = new ecs.FargateService(this, 'WebService', {
      cluster: this.cluster,
      taskDefinition: webTaskDefinition,
      desiredCount: 2,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Create ALB Target Groups
    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTargetGroup', {
      vpc: props.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    const webTargetGroup = new elbv2.ApplicationTargetGroup(this, 'WebTargetGroup', {
      vpc: props.vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Add ALB Routing
    httpsListener.addTargetGroups('ApiTargetGroup', {
      targetGroups: [apiTargetGroup],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*']),
      ],
      priority: 1,
    });

    httpsListener.addTargetGroups('WebTargetGroup', {
      targetGroups: [webTargetGroup],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/*']),
      ],
      priority: 2,
    });

    // Associate services with target groups
    apiService.attachToApplicationTargetGroup(apiTargetGroup);
    webService.attachToApplicationTargetGroup(webTargetGroup);

    // Auto Scaling
    const apiScaling = apiService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    apiScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    apiScaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const webScaling = webService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    webScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: 'TaskManagementLbDns',
    });

    new cdk.CfnOutput(this, 'ApiRepositoryUri', {
      value: apiRepository.repositoryUri,
      description: 'API Repository URI',
      exportName: 'TaskManagementApiRepoUri',
    });

    new cdk.CfnOutput(this, 'WebRepositoryUri', {
      value: webRepository.repositoryUri,
      description: 'Web Repository URI',
      exportName: 'TaskManagementWebRepoUri',
    });
  }
}
