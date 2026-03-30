import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface WebsiteDomainProps {
  readonly hostedZone: route53.IHostedZone;
  readonly certificate: acm.ICertificate;
  /** Apex hostname, e.g. repwisefit.com */
  readonly apexDomainName: string;
}

/**
 * Static website (S3 + CloudFront) for the Repwise frontend (Vite/React SPA).
 * Deploys contents of packages/web/dist. Run `pnpm --filter web build` before deploy.
 */
export class WebsiteConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.IBucket;
  /** Public URL (custom domain when configured). */
  public readonly url: string;
  public readonly domainName: string;

  constructor(scope: Construct, id: string, domain?: WebsiteDomainProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      ...(domain
        ? {
            domainNames: [domain.apexDomainName, `www.${domain.apexDomainName}`],
            certificate: domain.certificate,
          }
        : {}),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    if (domain) {
      new route53.ARecord(this, 'SiteAlias', {
        zone: domain.hostedZone,
        recordName: '',
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
      new route53.ARecord(this, 'SiteWwwAlias', {
        zone: domain.hostedZone,
        recordName: 'www',
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    }

    const webDistPath = path.join(__dirname, '../../web/dist');
    /** iOS Password AutoFill / app–site association (Capacitor hostname must match apex domain). */
    const appleTeamId = '2C568CVX27';
    const sources: s3deploy.ISource[] = [s3deploy.Source.asset(webDistPath)];
    if (domain) {
      sources.push(
        s3deploy.Source.jsonData('.well-known/apple-app-site-association', {
          applinks: {
            details: [
              {
                appID: `${appleTeamId}.com.repwisefit.app`,
                paths: ['*'],
              },
            ],
          },
        })
      );
    }
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      sources,
      memoryLimit: 1024,
    });

    this.distribution = distribution;
    this.bucket = bucket;
    if (domain) {
      this.domainName = domain.apexDomainName;
      this.url = `https://${domain.apexDomainName}`;
    } else {
      this.domainName = distribution.distributionDomainName;
      this.url = `https://${distribution.distributionDomainName}`;
    }
  }
}
