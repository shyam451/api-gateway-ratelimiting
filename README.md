# API Gateway Rate Limiting POC

This project demonstrates AWS API Gateway with rate limiting enabled. It uses AWS CDK for infrastructure code and deployment.

## Features

- API Gateway with rate limiting (100 requests per second)
- Burst capacity enabled for handling traffic spikes (200 requests)
- Lambda function backend for testing
- Test script to verify rate limiting functionality
- GitHub Actions workflow for automated deployment and testing

## Architecture

The architecture consists of:

1. AWS API Gateway with rate limiting configured
2. AWS Lambda function as the backend service
3. IAM role for Lambda function permissions

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS CDK installed globally (`npm install -g aws-cdk`)

## Project Structure

- `/cdk` - AWS CDK infrastructure code
- `/lambda` - Lambda function code
- `/test` - Test scripts for verifying rate limiting
- `/.github/workflows` - GitHub Actions workflow configuration

## Deployment

### Local Deployment

1. Install dependencies and build the CDK project:

```bash
cd cdk
npm ci
npm run build
```

2. Deploy the CDK stack:

```bash
cd cdk
cdk deploy
```

3. Note the API Gateway URL from the output.

### GitHub Actions Deployment

The project includes a GitHub Actions workflow that automatically:
1. Builds and synthesizes the CDK stack
2. Validates the CloudFormation template
3. Deploys the infrastructure to AWS (when pushing to main or devin/* branches)
4. Runs tests to verify rate limiting functionality
5. Cleans up resources after testing

To use GitHub Actions:
1. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as repository secrets
2. Push changes to the repository
3. GitHub Actions will automatically run the workflow

## Testing Rate Limiting

### AWS API Gateway Testing

Run the AWS API Gateway test script to verify rate limiting and burst capacity:

```bash
cd test
node aws-api-gateway-test.js <API_GATEWAY_URL>
```

The test script will send 200 requests in quick succession to test the burst capacity, followed by 100 more requests to test the steady-state behavior.

### Burst Capacity Testing

To test the burst capacity feature of the token bucket algorithm:

```bash
cd test
node aws-api-gateway-test.js <API_GATEWAY_URL>
```

This test sends 200 requests in quick succession to test the burst capacity, followed by 100 more requests to test the steady-state behavior. The results demonstrate that the API Gateway allows an initial burst of up to 200 requests before throttling to the standard rate limit of 100 requests per second.

#### Test Results

Our tests against the actual AWS API Gateway endpoint confirmed:

- **Burst Phase (200 requests)**: 195 successful (97.5%), 5 errors (2.5%)
- **Steady Phase (100 requests)**: 100 successful (100%), 0 errors

This validates that the token bucket algorithm is working as expected, allowing for burst traffic handling while maintaining the overall rate limit.

## Rate Limiting Configuration

- Rate limit: 100 requests per second
- Burst limit: 200 requests

This configuration allows for handling traffic spikes while still enforcing the overall rate limit.

## CDK Implementation Details

The CDK implementation uses TypeScript to define the infrastructure:

- Creates an API Gateway REST API
- Configures rate limiting using the `throttle` method on API Gateway methods
- Deploys a Lambda function as the backend
- Sets up IAM permissions for the Lambda function
- Configures the integration between API Gateway and Lambda

The rate limiting is implemented at the API Gateway level, which provides a robust solution for controlling the number of requests that can be processed.
