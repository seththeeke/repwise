import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Cognito user pool + client. Custom domain (e.g. auth.repwisefit.com) is not created here — CloudFormation
 * repeatedly returned InvalidRequest for AWS::Cognito::UserPoolDomain; add the domain in the Cognito console
 * after deploy (see packages/cdk/README.md).
 */
export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, postConfirmLambda: lambda.Function) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'repwise-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      lambdaTriggers: {
        postConfirmation: postConfirmLambda,
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: { userSrp: true },
      generateSecret: false,
    });

    new cognito.CfnUserPoolGroup(this, 'BuilderAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'builder-admin',
      description: 'Admin access to Repwise workout builder AI configuration',
      precedence: 1,
    });
  }
}
