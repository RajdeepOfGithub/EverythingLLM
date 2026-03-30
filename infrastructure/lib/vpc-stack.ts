import * as cdk from 'aws-cdk-lib'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Single VPC shared by EC2 and RDS
    // 2 AZs — minimum for RDS, costs nothing extra on t2.micro
    this.vpc = new ec2.Vpc(this, 'EverythingLLMVpc', {
      vpcName: 'everythingllm-vpc',
      maxAzs: 2,
      natGateways: 1,   // 1 NAT gateway for private subnet outbound traffic
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    })

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    })
  }
}
