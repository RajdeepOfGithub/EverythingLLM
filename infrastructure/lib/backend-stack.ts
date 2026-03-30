import * as cdk from 'aws-cdk-lib'
import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface BackendStackProps extends cdk.StackProps {
  vpc: ec2.Vpc
}

export class BackendStack extends cdk.Stack {
  public readonly instance: ec2.Instance
  public readonly securityGroup: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props)

    // Security group — allow SSH and backend port
    this.securityGroup = new ec2.SecurityGroup(this, 'BackendSG', {
      vpc: props.vpc,
      description: 'EverythingLLM backend security group',
      allowAllOutbound: true,
    })

    // Allow HTTPS from anywhere (frontend calls the API)
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS')

    // Allow HTTP (for initial setup / cert renewal)
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP')

    // Allow SSH — restrict to your IP in production
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH')

    // Allow direct FastAPI port during development
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8000), 'FastAPI dev')

    // IAM role — allows the EC2 to call AWS services (Cognito, Secrets Manager, etc.)
    const role = new iam.Role(this, 'BackendRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'), // SSH via SSM
      ],
    })

    // Allow reading secrets from Secrets Manager (for DB credentials)
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['*'],
    }))

    // EC2 t2.micro — free tier eligible
    this.instance = new ec2.Instance(this, 'BackendInstance', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: this.securityGroup,
      role,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'everythingllm-key'),

      // Bootstrap script — installs Python and sets up the backend
      userData: ec2.UserData.custom(`#!/bin/bash
yum update -y
yum install -y python3.11 python3.11-pip git
pip3.11 install fastapi uvicorn sqlalchemy alembic psycopg2-binary python-jose python-dotenv httpx pydantic
echo "Bootstrap complete" > /home/ec2-user/bootstrap.done
`),
    })

    new cdk.CfnOutput(this, 'BackendPublicIP', {
      value: this.instance.instancePublicIp,
      description: 'EC2 public IP — use this as your API base URL during development',
    })

    new cdk.CfnOutput(this, 'BackendInstanceId', {
      value: this.instance.instanceId,
      description: 'EC2 instance ID',
    })
  }
}
