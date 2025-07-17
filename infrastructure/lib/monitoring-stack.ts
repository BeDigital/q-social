import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  database: rds.DatabaseCluster;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS Topic for Alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      displayName: 'Task Management Alerts',
    });

    // Add Email Subscription
    alertTopic.addSubscription(
      new subscriptions.EmailSubscription('alerts@taskmanagement.com')
    );

    // Create Slack Integration
    const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      slackChannelConfigurationName: 'task-management-alerts',
      slackWorkspaceId: 'T0123456789', // Replace with actual workspace ID
      slackChannelId: 'C0123456789', // Replace with actual channel ID
    });

    // Add SNS Topic to Slack Channel
    slackChannel.addNotificationTopic(alertTopic);

    // Create Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'TaskManagementDashboard', {
      dashboardName: 'TaskManagement',
    });

    // Application Metrics
    const apiRequestsMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: props.cluster.loadBalancer?.loadBalancerName || '',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    });

    const apiLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'TargetResponseTime',
      dimensionsMap: {
        LoadBalancer: props.cluster.loadBalancer?.loadBalancerName || '',
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    // Database Metrics
    const dbCpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        DBClusterIdentifier: props.database.clusterIdentifier,
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    const dbConnectionsMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      dimensionsMap: {
        DBClusterIdentifier: props.database.clusterIdentifier,
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    // Add Widgets to Dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Requests',
        left: [apiRequestsMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [apiLatencyMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'Database CPU',
        left: [dbCpuMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [dbConnectionsMetric],
      })
    );

    // Create Alarms
    // High API Latency
    new cloudwatch.Alarm(this, 'HighApiLatency', {
      metric: apiLatencyMetric,
      threshold: 1,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'API latency is above 1 second',
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic));

    // High Database CPU
    new cloudwatch.Alarm(this, 'HighDatabaseCpu', {
      metric: dbCpuMetric,
      threshold: 80,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Database CPU is above 80%',
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic));

    // High Database Connections
    new cloudwatch.Alarm(this, 'HighDatabaseConnections', {
      metric: dbConnectionsMetric,
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Database has more than 100 connections',
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic));

    // Create Log Metric Filters
    const errorLogGroup = new cdk.aws_logs.LogGroup(this, 'ErrorLogGroup', {
      retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });

    new cdk.aws_logs.MetricFilter(this, 'ErrorFilter', {
      logGroup: errorLogGroup,
      filterPattern: cdk.aws_logs.FilterPattern.literal('ERROR'),
      metricNamespace: 'TaskManagement',
      metricName: 'ErrorCount',
      defaultValue: 0,
    });

    // Create Composite Alarms
    new cloudwatch.CompositeAlarm(this, 'SystemHealthAlarm', {
      alarmRule: cloudwatch.AlarmRule.anyOf(
        cloudwatch.AlarmRule.fromAlarm(
          new cloudwatch.Alarm(this, 'ApiHealthAlarm', {
            metric: apiLatencyMetric,
            threshold: 1,
            evaluationPeriods: 3,
            datapointsToAlarm: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          }),
          cloudwatch.AlarmState.ALARM
        ),
        cloudwatch.AlarmRule.fromAlarm(
          new cloudwatch.Alarm(this, 'DbHealthAlarm', {
            metric: dbCpuMetric,
            threshold: 80,
            evaluationPeriods: 3,
            datapointsToAlarm: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          }),
          cloudwatch.AlarmState.ALARM
        )
      ),
      alarmDescription: 'System health composite alarm',
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic));

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: 'TaskManagementDashboardUrl',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'Alert SNS Topic ARN',
      exportName: 'TaskManagementAlertTopicArn',
    });
  }
}
