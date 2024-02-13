import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";

interface EcsStackProps extends cdk.StackProps {
  repositoryName: string;
  imageTag: string;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      natGateways: 1,
    });
    const cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc,
    });

    const loadBalancedEcsService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "EcsService", {
      cluster,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(
          ecr.Repository.fromRepositoryName(this, "Ecr", props.repositoryName),
          props.imageTag
        ),
        containerPort: 3000,
      },
      desiredCount: 1,
    });
  }
}
