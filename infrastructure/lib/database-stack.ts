import * as cdk from 'aws-cdk-lib'
import { aws_ec2 as ec2, aws_rds as rds, aws_secretsmanager as sm } from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc
  backendSecurityGroup: ec2.SecurityGroup
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance
  public readonly dbSecret: sm.ISecret

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props)

    // Security group — only allow connections from the backend EC2
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: props.vpc,
      description: 'Allow PostgreSQL access from backend only',
      allowAllOutbound: false,
    })

    dbSecurityGroup.addIngressRule(
      props.backendSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from backend EC2'
    )

    // RDS PostgreSQL instance — db.t3.micro (free tier eligible)
    this.dbInstance = new rds.DatabaseInstance(this, 'EverythingLLMDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],

      databaseName: 'everythingllm',
      credentials: rds.Credentials.fromGeneratedSecret('everythingllm_db_user'),

      // Free tier: 20GB storage
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,

      // Don't keep on stack deletion for dev — change to RETAIN for prod
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,

      // Disable multi-AZ for free tier
      multiAz: false,
    })

    this.dbSecret = this.dbInstance.secret!

    new cdk.CfnOutput(this, 'DBEndpoint', {
      value: this.dbInstance.dbInstanceEndpointAddress,
      description: 'RDS endpoint — used to build DATABASE_URL in backend .env',
    })

    new cdk.CfnOutput(this, 'DBSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Secrets Manager ARN — retrieve DB credentials from here',
    })
  }
}
