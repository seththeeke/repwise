import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { ApiConstruct } from './api';
import { AuthConstruct } from './auth';
import { TablesConstruct } from './tables';

/**
 * Repwise stack. Tables, auth, API, and Lambdas per specs/backend-spec.md.
 * Integration test users are created manually in the User Pool (see README).
 */
export class RepwiseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      },
    });
    tables.workoutsTable.grantReadWriteData(workoutLambda);
    tables.metricsTable.grantReadData(workoutLambda);

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

    const api = new ApiConstruct(this, 'Api', auth.userPool, auth.userPoolClient);
    api.addRoute(apigwv2.HttpMethod.GET, '/users/me', userLambda, true);
    api.addRoute(apigwv2.HttpMethod.PATCH, '/users/me', userLambda, true);
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
      value: api.api.apiEndpoint ?? '',
      description: 'API Gateway URL for integration tests (.env.test API_BASE_URL) and frontend',
      exportName: 'RepwiseApiUrl',
    });
  }
}
