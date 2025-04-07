#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayRateLimitingStack } from '../lib/api-gateway-rate-limiting-stack';

const app = new cdk.App();
new ApiGatewayRateLimitingStack(app, 'ApiGatewayRateLimitingStack', {
  env: { 
    account: '641002720432', 
    region: 'us-east-1'
  },
  synthesizer: new cdk.DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
  }),
});
