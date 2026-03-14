import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class ApiConstruct extends Construct {
  public readonly api: apigwv2.HttpApi;
  public readonly authorizer: HttpJwtAuthorizer;

  constructor(
    scope: Construct,
    id: string,
    userPool: cognito.UserPool,
    userPoolClient: cognito.UserPoolClient
  ) {
    super(scope, id);

    this.api = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'repwise-api',
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    const region = this.api.env.region;
    const issuerUrl = `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`;
    this.authorizer = new HttpJwtAuthorizer('JwtAuthorizer', issuerUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });
  }

  addRoute(
    method: apigwv2.HttpMethod,
    path: string,
    handler: lambda.Function,
    auth: boolean
  ): void {
    this.api.addRoutes({
      path,
      methods: [method],
      integration: new integrations.HttpLambdaIntegration(
        `${method}-${path.replace(/\//g, '-')}`,
        handler
      ),
      authorizer: auth ? this.authorizer : undefined,
    });
  }
}
