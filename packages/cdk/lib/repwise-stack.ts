import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { ApiConstruct } from './api';
import { AuthConstruct } from './auth';
import { TablesConstruct } from './tables';
import { WebsiteConstruct } from './website';

/**
 * Repwise stack. Tables, auth, API, and Lambdas per specs/backend-spec.md.
 * Integration test users are created manually in the User Pool (see README).
 */
const ROOT_DOMAIN = 'repwisefit.com';

export class RepwiseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromLookup(this, 'RepwiseHostedZone', {
      domainName: ROOT_DOMAIN,
    });

    const certificate = new acm.Certificate(this, 'RepwiseCertificate', {
      domainName: ROOT_DOMAIN,
      subjectAlternativeNames: [`*.${ROOT_DOMAIN}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // CORS: API Gateway HTTP API and Lambda Function URLs reject custom schemes (e.g. capacitor://localhost).
    // Capacitor iOS/Android use those origins, so an https-only list breaks native apps. Wildcard is required;
    // callers are still authenticated via Cognito JWT (not cookies).
    const corsAllowOrigins = ['*'];

    const tables = new TablesConstruct(this, 'Tables');

    const postConfirmLambda = new NodejsFunction(this, 'CognitoPostConfirm', {
      entry: path.join(__dirname, '../../lambdas/cognito-post-confirm/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        USERS_TABLE: tables.usersTable.tableName,
        METRICS_TABLE: tables.metricsTable.tableName,
      },
    });
    tables.usersTable.grantWriteData(postConfirmLambda);
    tables.metricsTable.grantWriteData(postConfirmLambda);

    const auth = new AuthConstruct(this, 'Auth', postConfirmLambda);

    const userLambda = new NodejsFunction(this, 'UserLambda', {
      entry: path.join(__dirname, '../../lambdas/user/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { USERS_TABLE: tables.usersTable.tableName },
    });
    tables.usersTable.grantReadWriteData(userLambda);

    const cleanupUserDataLambda = new NodejsFunction(this, 'CleanupUserDataLambda', {
      entry: path.join(__dirname, '../../lambdas/cleanup-user-data/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(120),
      environment: {
        USERS_TABLE: tables.usersTable.tableName,
        WORKOUTS_TABLE: tables.workoutsTable.tableName,
        METRICS_TABLE: tables.metricsTable.tableName,
        BUILDER_SESSIONS_TABLE: tables.builderSessionsTable.tableName,
        USER_POOL_ID: auth.userPool.userPoolId,
      },
    });
    tables.usersTable.grantReadWriteData(cleanupUserDataLambda);
    tables.workoutsTable.grantReadWriteData(cleanupUserDataLambda);
    tables.metricsTable.grantReadWriteData(cleanupUserDataLambda);
    tables.builderSessionsTable.grantReadWriteData(cleanupUserDataLambda);
    cleanupUserDataLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminDeleteUser'],
        resources: [auth.userPool.userPoolArn],
      })
    );

    const gymsLambda = new NodejsFunction(this, 'GymsLambda', {
      entry: path.join(__dirname, '../../lambdas/gyms/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { USERS_TABLE: tables.usersTable.tableName },
    });
    tables.usersTable.grantReadWriteData(gymsLambda);

    const goalsAiLambda = new NodejsFunction(this, 'GoalsAiLambda', {
      entry: path.join(__dirname, '../../lambdas/goals-ai/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {},
    });
    goalsAiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
        ],
      })
    );

    const exerciseLambda = new NodejsFunction(this, 'ExerciseLambda', {
      entry: path.join(__dirname, '../../lambdas/exercise/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { WORKOUTS_TABLE: tables.workoutsTable.tableName },
    });
    tables.workoutsTable.grantReadData(exerciseLambda);

    const workoutLambda = new NodejsFunction(this, 'WorkoutLambda', {
      entry: path.join(__dirname, '../../lambdas/workout/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        WORKOUTS_TABLE: tables.workoutsTable.tableName,
        METRICS_TABLE: tables.metricsTable.tableName,
        USERS_TABLE: tables.usersTable.tableName,
      },
    });
    tables.workoutsTable.grantReadWriteData(workoutLambda);
    tables.metricsTable.grantReadData(workoutLambda);
    tables.usersTable.grantReadWriteData(workoutLambda); // read profile; write feed items on completion

    const metricsProcessorLambda = new NodejsFunction(this, 'MetricsProcessorLambda', {
      entry: path.join(__dirname, '../../lambdas/metrics-processor/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        WORKOUTS_TABLE: tables.workoutsTable.tableName,
        METRICS_TABLE: tables.metricsTable.tableName,
      },
    });
    tables.workoutsTable.grantStreamRead(metricsProcessorLambda);
    tables.workoutsTable.grantReadData(metricsProcessorLambda);
    tables.metricsTable.grantReadWriteData(metricsProcessorLambda);
    metricsProcessorLambda.addEventSource(
      new eventsources.DynamoEventSource(tables.workoutsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
      })
    );

    const metricsLambda = new NodejsFunction(this, 'MetricsLambda', {
      entry: path.join(__dirname, '../../lambdas/metrics/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { METRICS_TABLE: tables.metricsTable.tableName },
    });
    tables.metricsTable.grantReadData(metricsLambda);

    const goalsLambda = new NodejsFunction(this, 'GoalsLambda', {
      entry: path.join(__dirname, '../../lambdas/goals/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        METRICS_TABLE: tables.metricsTable.tableName,
        WORKOUTS_TABLE: tables.workoutsTable.tableName,
      },
    });
    tables.metricsTable.grantReadWriteData(goalsLambda);
    tables.workoutsTable.grantReadData(goalsLambda);

    const feedLambda = new NodejsFunction(this, 'FeedLambda', {
      entry: path.join(__dirname, '../../lambdas/feed/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { USERS_TABLE: tables.usersTable.tableName },
    });
    tables.usersTable.grantReadData(feedLambda);

    const aiLambda = new NodejsFunction(this, 'AiLambda', {
      entry: path.join(__dirname, '../../lambdas/ai/src/index.ts'),
      handler: 'streamHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(120),
      bundling: {
        externalModules: ['@aws-sdk/xml-builder'],
      },
      environment: {
        WORKOUTS_TABLE: tables.workoutsTable.tableName,
        METRICS_TABLE: tables.metricsTable.tableName,
        BUILDER_SESSIONS_TABLE: tables.builderSessionsTable.tableName,
        BUILDER_AI_CONFIG_TABLE: tables.builderAiConfigTable.tableName,
        USER_POOL_ID: auth.userPool.userPoolId,
        COGNITO_CLIENT_ID: auth.userPoolClient.userPoolClientId,
      },
    });
    tables.workoutsTable.grantReadData(aiLambda);
    tables.metricsTable.grantReadData(aiLambda);
    tables.builderSessionsTable.grantReadWriteData(aiLambda);
    tables.builderAiConfigTable.grantReadWriteData(aiLambda);
    const bedrockModelIds = [
      'amazon.nova-micro-v1:0',
      'amazon.nova-lite-v1:0',
      'amazon.nova-pro-v1:0',
      'amazon.nova-premier-v1:0',
      'anthropic.claude-3-5-haiku-20241022-v1:0',
      'anthropic.claude-sonnet-4-5-20250929-v1:0',
      'anthropic.claude-opus-4-5-20251101-v1:0',
    ];
    aiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: bedrockModelIds.map(
          (id) => `arn:aws:bedrock:${this.region}::foundation-model/${id}`
        ),
      })
    );

    const aiFunctionUrl = aiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: corsAllowOrigins,
        allowedHeaders: ['Authorization', 'Content-Type'],
        allowedMethods: [lambda.HttpMethod.POST],
      },
    });

    const builderAiConfigLambda = new NodejsFunction(
      this,
      'BuilderAiConfigLambda',
      {
        entry: path.join(__dirname, '../../lambdas/ai/src/index.ts'),
        handler: 'builderAiConfigHandler',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          BUILDER_AI_CONFIG_TABLE: tables.builderAiConfigTable.tableName,
          USER_POOL_ID: auth.userPool.userPoolId,
          COGNITO_CLIENT_ID: auth.userPoolClient.userPoolClientId,
        },
      }
    );
    tables.builderAiConfigTable.grantReadWriteData(builderAiConfigLambda);

    const api = new ApiConstruct(this, 'Api', {
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      corsAllowOrigins,
      customApiDomain: {
        domainName: `api.${ROOT_DOMAIN}`,
        certificate,
        hostedZone,
      },
    });
    api.addRoute(apigwv2.HttpMethod.GET, '/users/me', userLambda, true);
    api.addRoute(apigwv2.HttpMethod.PATCH, '/users/me', userLambda, true);
    api.addRoute(apigwv2.HttpMethod.DELETE, '/users/me', cleanupUserDataLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/users/me/gyms', gymsLambda, true);
    api.addRoute(apigwv2.HttpMethod.POST, '/users/me/gyms', gymsLambda, true);
    api.addRoute(apigwv2.HttpMethod.PATCH, '/users/me/gyms/{gymId}', gymsLambda, true);
    api.addRoute(apigwv2.HttpMethod.DELETE, '/users/me/gyms/{gymId}', gymsLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/users/{username}', userLambda, false);
    api.addRoute(apigwv2.HttpMethod.GET, '/exercises', exerciseLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/exercises/{exerciseId}', exerciseLambda, true);
    api.addRoute(apigwv2.HttpMethod.POST, '/workout-instances', workoutLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/workout-instances', workoutLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/workout-instances/{id}', workoutLambda, true);
    api.addRoute(apigwv2.HttpMethod.PATCH, '/workout-instances/{id}', workoutLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/metrics/me/global', metricsLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/metrics/me/exercises', metricsLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/metrics/me/exercises/{exerciseId}', metricsLambda, true);
    api.addRoute(apigwv2.HttpMethod.GET, '/goals/me', goalsLambda, true);
    api.addRoute(apigwv2.HttpMethod.POST, '/goals/me', goalsLambda, true);
    api.addRoute(apigwv2.HttpMethod.POST, '/goals/me/suggest', goalsAiLambda, true);
    api.addRoute(apigwv2.HttpMethod.DELETE, '/goals/me/{goalId}', goalsLambda, true);
    api.addRoute(
      apigwv2.HttpMethod.GET,
      '/admin/builder-ai-config',
      builderAiConfigLambda,
      true
    );
    api.addRoute(
      apigwv2.HttpMethod.PUT,
      '/admin/builder-ai-config',
      builderAiConfigLambda,
      true
    );
    api.addRoute(
      apigwv2.HttpMethod.GET,
      '/admin/builder-ai-config/usage',
      builderAiConfigLambda,
      true
    );
    api.addRoute(apigwv2.HttpMethod.GET, '/feed', feedLambda, true);

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
      description: 'Cognito User Pool ID for integration tests (.env.test COGNITO_USER_POOL_ID)',
      exportName: 'RepwiseUserPoolId',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for integration tests (.env.test COGNITO_CLIENT_ID)',
      exportName: 'RepwiseUserPoolClientId',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.publicBaseUrl,
      description: 'HTTPS API base URL (custom domain) for integration tests and frontend',
      exportName: 'RepwiseApiUrl',
    });
    new cdk.CfnOutput(this, 'AiWorkoutStreamUrl', {
      value: aiFunctionUrl.url,
      description: 'AI workout generation SSE endpoint (POST with aiPrompt or regenerateContext; send Authorization header)',
      exportName: 'RepwiseAiWorkoutStreamUrl',
    });

    const website = new WebsiteConstruct(this, 'Website', {
      hostedZone,
      certificate,
      apexDomainName: ROOT_DOMAIN,
    });
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: website.url,
      description: `Frontend at https://${ROOT_DOMAIN}. Set VITE_* in packages/web/.env.production before build.`,
      exportName: 'RepwiseWebsiteUrl',
    });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: website.distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: 'RepwiseCloudFrontDistributionId',
    });
  }
}
