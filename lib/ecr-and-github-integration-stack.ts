import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";

const CDK_QUALIFIER = "hnb659fds"; // 既定の CDK Bootstrap Stack 識別子

interface EcrAndGithubIntegrationStackProps extends cdk.StackProps {
  gitHubOwner: string;
  gitHubRepo: string;
  repositoryName: string;
}

export class EcrAndGithubIntegrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcrAndGithubIntegrationStackProps) {
    super(scope, id, props);

    // ECRの作成
    const repository = new ecr.Repository(this, "Ecr", {
      repositoryName: props.repositoryName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GitHub OIDCの設定
    new iam.OpenIdConnectProvider(this, "GithubActionsOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const { gitHubOwner, gitHubRepo } = props;
    const awsAccountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const gitHubActionsOidcRole = new iam.Role(this, "GitHubActionsOidcRole", {
      assumedBy: new iam.FederatedPrincipal(
        `arn:aws:iam::${awsAccountId}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": `repo:${gitHubOwner}/${gitHubRepo}:ref:refs/heads/main`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // AssumeRole に必要なポリシーを作成
    const cdkDeployPolicy = new iam.Policy(this, "CdkDeployPolicy", {
      policyName: "CdkDeployPolicy",
      statements: [
        // ECR Login用
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ecr:GetAuthorizationToken"],
          resources: ["*"],
        }),
        // ECRへのimage push用
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ecr:*"],
          resources: [`arn:aws:ecr:${region}:${awsAccountId}:repository/${props.repositoryName}`],
        }),
        // 以下CDK用の設定
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:getBucketLocation", "s3:List*"],
          resources: ["arn:aws:s3:::*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "cloudformation:CreateStack",
            "cloudformation:CreateChangeSet",
            "cloudformation:DeleteChangeSet",
            "cloudformation:DescribeChangeSet",
            "cloudformation:DescribeStacks",
            "cloudformation:DescribeStackEvents",
            "cloudformation:ExecuteChangeSet",
            "cloudformation:GetTemplate",
          ],
          resources: [`arn:aws:cloudformation:${region}:${awsAccountId}:stack/*/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:PutObject", "s3:GetObject"],
          resources: [`arn:aws:s3:::cdk-${CDK_QUALIFIER}-assets-${awsAccountId}-${region}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ssm:GetParameter"],
          resources: [`arn:aws:ssm:${region}:${awsAccountId}:parameter/cdk-bootstrap/${CDK_QUALIFIER}/version`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["iam:PassRole"],
          resources: [`arn:aws:iam::${awsAccountId}:role/cdk-${CDK_QUALIFIER}-cfn-exec-role-${awsAccountId}-${region}`],
        }),
      ],
    });

    gitHubActionsOidcRole.attachInlinePolicy(cdkDeployPolicy);
  }
}
