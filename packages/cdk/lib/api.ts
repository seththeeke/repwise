import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface ApiConstructProps {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  /** CORS `allowOrigins` (often `['*']` so Capacitor native shells work; API Gateway rejects capacitor://). */
  readonly corsAllowOrigins: string[];
  /** Optional: api.repwisefit.com with ACM + Route53 alias. */
  readonly customApiDomain?: {
    readonly domainName: string;
    readonly certificate: acm.ICertificate;
    readonly hostedZone: route53.IHostedZone;
  };
}

export class ApiConstruct extends Construct {
  public readonly api: apigwv2.HttpApi;
  public readonly authorizer: HttpJwtAuthorizer;
  /** Public base URL for clients (custom domain when configured). */
  public readonly publicBaseUrl: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { userPool, userPoolClient, corsAllowOrigins, customApiDomain } = props;

    this.api = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'repwise-api',
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: corsAllowOrigins,
      },
    });

    const region = this.api.env.region;
    const issuerUrl = `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`;
    this.authorizer = new HttpJwtAuthorizer('JwtAuthorizer', issuerUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });

    if (customApiDomain) {
      const dn = new apigwv2.DomainName(this, 'HttpApiDomain', {
        domainName: customApiDomain.domainName,
        certificate: customApiDomain.certificate,
      });

      new apigwv2.ApiMapping(this, 'HttpApiMapping', {
        api: this.api,
        domainName: dn,
      });

      new route53.ARecord(this, 'ApiDns', {
        zone: customApiDomain.hostedZone,
        recordName: 'api',
        target: route53.RecordTarget.fromAlias(
          new targets.ApiGatewayv2DomainProperties(
            dn.regionalDomainName,
            dn.regionalHostedZoneId
          )
        ),
      });

      this.publicBaseUrl = `https://${customApiDomain.domainName}`;
    } else {
      this.publicBaseUrl = this.api.apiEndpoint ?? '';
    }
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
