import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
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
  }
}
