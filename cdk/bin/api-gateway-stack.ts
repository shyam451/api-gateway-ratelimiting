#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayRateLimitingStack } from '../lib/api-gateway-rate-limiting-stack';

const app = new cdk.App();
new ApiGatewayRateLimitingStack(app, 'ApiGatewayRateLimitingStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
});
