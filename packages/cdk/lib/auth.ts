import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** Apple Developer: Services ID, Team ID, Key ID, and contents of the Sign in with Apple .p8 key. */
export interface AppleSignInConfig {
  readonly servicesId: string;
  readonly teamId: string;
  readonly keyId: string;
  /** PEM text of the private key (use \\n in env for newlines). */
  readonly privateKeyPem: string;
}

export interface AuthConstructProps {
  readonly postConfirmLambda: lambda.Function;
  /** If set, registers Sign in with Apple as a federated IdP on the user pool. */
  readonly appleSignIn?: AppleSignInConfig;
}

/**
 * Cognito user pool + app client with SRP + OAuth (Hosted UI / Amplify signInWithRedirect).
 * Managed Cognito domain is created for OAuth; optional custom domain remains manual (see README).
 */
export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  /** Hosted UI hostname only, e.g. `repwise123456789012.auth.us-east-1.amazoncognito.com` (no scheme). */
  public readonly cognitoOAuthDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const { postConfirmLambda, appleSignIn } = props;

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

    const account = cdk.Stack.of(this).account;
    const domainPrefix = `repwise${account}`;
    this.cognitoOAuthDomain = this.userPool.addDomain('HostedUIDomain', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    let appleProvider: cognito.UserPoolIdentityProviderApple | undefined;
    if (appleSignIn) {
      appleProvider = new cognito.UserPoolIdentityProviderApple(this, 'Apple', {
        clientId: appleSignIn.servicesId,
        teamId: appleSignIn.teamId,
        keyId: appleSignIn.keyId,
        privateKeyValue: SecretValue.unsafePlainText(appleSignIn.privateKeyPem),
        userPool: this.userPool,
        scopes: ['email', 'name'],
      });
    }

    const supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];
    if (appleProvider) {
      supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.APPLE);
    }

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: { userSrp: true },
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:5173/',
          'https://repwisefit.com/',
          'com.repwisefit.app://callback',
          'com.repwise.app://callback',
        ],
        logoutUrls: [
          'http://localhost:5173/',
          'https://repwisefit.com/',
          'com.repwisefit.app://callback',
          'com.repwise.app://callback',
        ],
      },
      supportedIdentityProviders,
    });

    this.userPoolClient.node.addDependency(this.cognitoOAuthDomain);
    if (appleProvider) {
      this.userPoolClient.node.addDependency(appleProvider);
    }

    new cognito.CfnUserPoolGroup(this, 'BuilderAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'builder-admin',
      description: 'Admin access to Repwise workout builder AI configuration',
      precedence: 1,
    });
  }
}
