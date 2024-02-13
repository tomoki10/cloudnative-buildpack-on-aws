#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EcsStack } from "../lib/ecs-stack";
import { EcrAndGithubIntegrationStack } from "../lib/ecr-and-github-integration-stack";

const app = new cdk.App();

const repositoryName = "cloudnative-buildpack-sample";
const imageTag = app.node.tryGetContext("imageTag") ?? "latest";

new EcrAndGithubIntegrationStack(app, "EcrAndGithubIntegrationStack", {
  repositoryName,
  gitHubOwner: "tomoki10",
  gitHubRepo: "cloudnative-buildpack-on-aws",
});
// MEMO: EcrAndGithubIntegrationStackをデプロイして、ECRにイメージをpush後にデプロイ
new EcsStack(app, "EcsStack", {
  repositoryName,
  imageTag,
});
