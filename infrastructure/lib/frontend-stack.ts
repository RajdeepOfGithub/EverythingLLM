import * as cdk from 'aws-cdk-lib'
import {
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // S3 bucket — stores the built React app (not publicly accessible directly)
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `everythingllm-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // CloudFront only
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // CloudFront distribution — serves the frontend globally with HTTPS
    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },

      // SPA routing — send all 404s back to index.html so React Router handles them
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],

      defaultRootObject: 'index.html',
    })

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for the frontend — use until custom domain is set up',
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name — deploy with: aws s3 sync dist/ s3://BUCKET_NAME',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID — needed to invalidate cache after deploy',
    })
  }
}
