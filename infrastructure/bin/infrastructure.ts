#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { VpcStack } from '../lib/vpc-stack'
import { CognitoStack } from '../lib/cognito-stack'
import { BackendStack } from '../lib/backend-stack'
import { DatabaseStack } from '../lib/database-stack'
import { FrontendStack } from '../lib/frontend-stack'

const app = new cdk.App()

const env = {
  account: '273354624122',
  region: 'us-east-1',
}

// Deploy order matters — stacks that depend on others are declared after

const vpcStack = new VpcStack(app, 'EverythingLLM-VPC', { env })

const cognitoStack = new CognitoStack(app, 'EverythingLLM-Cognito', { env })

const backendStack = new BackendStack(app, 'EverythingLLM-Backend', {
  env,
  vpc: vpcStack.vpc,
})

const databaseStack = new DatabaseStack(app, 'EverythingLLM-Database', {
  env,
  vpc: vpcStack.vpc,
  backendSecurityGroup: backendStack.securityGroup,
})

const frontendStack = new FrontendStack(app, 'EverythingLLM-Frontend', { env })

// Make cross-stack dependencies explicit
backendStack.addDependency(vpcStack)
databaseStack.addDependency(backendStack)
