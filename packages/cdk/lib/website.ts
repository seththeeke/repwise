import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

/**
 * Static website (S3 + CloudFront) for the Repwise frontend (Vite/React SPA).
 * Deploys contents of packages/web/dist. Run `pnpm --filter web build` before deploy.
 */
export class WebsiteConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.IBucket;
  public readonly url: string;
  public readonly domainName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
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

    const webDistPath = path.join(__dirname, '../../web/dist');
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      sources: [s3deploy.Source.asset(webDistPath)],
      memoryLimit: 1024,
    });

    this.distribution = distribution;
    this.bucket = bucket;
    this.domainName = distribution.distributionDomainName;
    this.url = `https://${distribution.distributionDomainName}`;
  }
}
