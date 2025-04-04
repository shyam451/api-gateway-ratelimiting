# API Gateway Rate Limiting POC

This project demonstrates AWS API Gateway with rate limiting enabled. It uses TypeScript for infrastructure code and AWS CDK for deployment.

## Features

- API Gateway with rate limiting (100 requests per second)
- Burst capacity enabled for handling traffic spikes
- Lambda function backend for testing
- Test script to verify rate limiting functionality

## Architecture

The architecture consists of:

1. AWS API Gateway with rate limiting configured
2. AWS Lambda function as the backend service
3. IAM role for API Gateway permissions

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS CDK installed globally

## Project Structure

- `/cdk` - CDK infrastructure code
- `/lambda` - Lambda function code
- `/test` - Test scripts for verifying rate limiting

## Deployment

1. Install dependencies:

```bash
cd cdk
npm install
```

2. Deploy the stack:

```bash
npm run deploy
```

3. Note the API Gateway URL from the output.

## Testing Rate Limiting

Run the test script to verify rate limiting:

```bash
cd test
node rate-limit-test.js <API_GATEWAY_URL>
```

The test script will send 150 requests in parallel and report how many were successful vs. throttled.

## Rate Limiting Configuration

- Rate limit: 100 requests per second
- Burst limit: 200 requests

This configuration allows for handling traffic spikes while still enforcing the overall rate limit.
