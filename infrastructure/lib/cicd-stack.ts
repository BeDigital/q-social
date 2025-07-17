import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface CicdStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
}

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    // Create CodeCommit Repositories
    const apiRepo = new codecommit.Repository(this, 'ApiRepository', {
      repositoryName: 'task-management-api',
      description: 'API code repository',
    });

    const webRepo = new codecommit.Repository(this, 'WebRepository', {
      repositoryName: 'task-management-web',
      description: 'Web frontend code repository',
    });

    // Create CodeBuild Projects
    const apiCodeBuildProject = new codebuild.PipelineProject(this, 'ApiCodeBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI',
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'echo Building the Docker image...',
              'docker build -t $ECR_REPOSITORY_URI:$IMAGE_TAG .',
              'docker tag $ECR_REPOSITORY_URI:$IMAGE_TAG $ECR_REPOSITORY_URI:latest',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker image...',
              'docker push $ECR_REPOSITORY_URI:$IMAGE_TAG',
              'docker push $ECR_REPOSITORY_URI:latest',
              'echo Writing image definitions file...',
              'printf \'{"ImageURI":"%s"}\' $ECR_REPOSITORY_URI:$IMAGE_TAG > imageDefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imageDefinitions.json'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        ECR_REPOSITORY_URI: {
          value: `${this.account}.dkr.ecr.${this.region}.amazonaws.com/task-management/api`,
        },
      },
      vpc: props.vpc,
    });

    const webCodeBuildProject = new codebuild.PipelineProject(this, 'WebCodeBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI',
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'echo Building the Docker image...',
              'docker build -t $ECR_REPOSITORY_URI:$IMAGE_TAG .',
              'docker tag $ECR_REPOSITORY_URI:$IMAGE_TAG $ECR_REPOSITORY_URI:latest',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker image...',
              'docker push $ECR_REPOSITORY_URI:$IMAGE_TAG',
              'docker push $ECR_REPOSITORY_URI:latest',
              'echo Writing image definitions file...',
              'printf \'{"ImageURI":"%s"}\' $ECR_REPOSITORY_URI:$IMAGE_TAG > imageDefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imageDefinitions.json'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        ECR_REPOSITORY_URI: {
          value: `${this.account}.dkr.ecr.${this.region}.amazonaws.com/task-management/web`,
        },
      },
      vpc: props.vpc,
    });

    // Create Pipelines
    const apiPipeline = new codepipeline.Pipeline(this, 'ApiPipeline', {
      pipelineName: 'TaskManagement-Api-Pipeline',
    });

    const webPipeline = new codepipeline.Pipeline(this, 'WebPipeline', {
      pipelineName: 'TaskManagement-Web-Pipeline',
    });

    // Add Pipeline Stages
    // API Pipeline
    apiPipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeCommitSourceAction({
          actionName: 'CodeCommit_Source',
          repository: apiRepo,
          output: new codepipeline.Artifact(),
          branch: 'main',
        }),
      ],
    });

    apiPipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CodeBuild',
          project: apiCodeBuildProject,
          input: new codepipeline.Artifact(),
          outputs: [new codepipeline.Artifact()],
        }),
      ],
    });

    apiPipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'Deploy',
          service: props.cluster.defaultService!,
          imageFile: new codepipeline.ArtifactPath(
            new codepipeline.Artifact(),
            'imageDefinitions.json'
          ),
        }),
      ],
    });

    // Web Pipeline
    webPipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeCommitSourceAction({
          actionName: 'CodeCommit_Source',
          repository: webRepo,
          output: new codepipeline.Artifact(),
          branch: 'main',
        }),
      ],
    });

    webPipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CodeBuild',
          project: webCodeBuildProject,
          input: new codepipeline.Artifact(),
          outputs: [new codepipeline.Artifact()],
        }),
      ],
    });

    webPipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'Deploy',
          service: props.cluster.defaultService!,
          imageFile: new codepipeline.ArtifactPath(
            new codepipeline.Artifact(),
            'imageDefinitions.json'
          ),
        }),
      ],
    });

    // Add necessary permissions
    apiCodeBuildProject.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECR_FullAccess')
    );

    webCodeBuildProject.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECR_FullAccess')
    );

    // Outputs
    new cdk.CfnOutput(this, 'ApiRepositoryCloneUrlHttp', {
      value: apiRepo.repositoryCloneUrlHttp,
      description: 'API Repository Clone URL (HTTPS)',
      exportName: 'TaskManagementApiRepoCloneUrl',
    });

    new cdk.CfnOutput(this, 'WebRepositoryCloneUrlHttp', {
      value: webRepo.repositoryCloneUrlHttp,
      description: 'Web Repository Clone URL (HTTPS)',
      exportName: 'TaskManagementWebRepoCloneUrl',
    });

    new cdk.CfnOutput(this, 'ApiPipelineConsoleUrl', {
      value: `https://console.aws.amazon.com/codepipeline/home?region=${this.region}#/view/${apiPipeline.pipelineName}`,
      description: 'API Pipeline Console URL',
      exportName: 'TaskManagementApiPipelineUrl',
    });

    new cdk.CfnOutput(this, 'WebPipelineConsoleUrl', {
      value: `https://console.aws.amazon.com/codepipeline/home?region=${this.region}#/view/${webPipeline.pipelineName}`,
      description: 'Web Pipeline Console URL',
      exportName: 'TaskManagementWebPipelineUrl',
    });
  }
}
