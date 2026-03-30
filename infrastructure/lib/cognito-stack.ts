import * as cdk from 'aws-cdk-lib'
import { aws_cognito as cognito } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class CognitoStack extends cdk.Stack {
  // Expose these so other stacks (backend) can reference them
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // User Pool — the actual user directory
    this.userPool = new cognito.UserPool(this, 'EverythingLLMUserPool', {
      userPoolName: 'everythingllm-users',

      // Allow users to sign in with email
      signInAliases: { email: true },

      // Auto-verify email addresses
      autoVerify: { email: true },

      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },

      // Account recovery via email
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Keep the pool on stack deletion (safety — change to DESTROY for dev if needed)
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // App Client — what the frontend uses to authenticate
    this.userPoolClient = new cognito.UserPoolClient(this, 'EverythingLLMWebClient', {
      userPool: this.userPool,
      userPoolClientName: 'everythingllm-web',

      // Enable SRP auth (standard secure remote password — used by Amplify)
      authFlows: {
        userSrp: true,
        userPassword: true,   // also allow direct password for dev/testing
      },

      // No client secret — browser apps can't keep secrets
      generateSecret: false,

      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    })

    // Output the values you'll need for .env files
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID → set as COGNITO_USER_POOL_ID in backend .env and VITE_COGNITO_USER_POOL_ID in frontend .env',
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID → set as COGNITO_CLIENT_ID in backend .env and VITE_COGNITO_CLIENT_ID in frontend .env',
    })
  }
}
