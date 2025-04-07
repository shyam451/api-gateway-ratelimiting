# API Gateway Rate Limiting POC

This project demonstrates AWS API Gateway with rate limiting enabled. It uses Terraform for infrastructure code and deployment.

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
- Terraform installed locally (for local testing)

## Project Structure

- `/terraform` - Terraform infrastructure code
- `/lambda` - Lambda function code
- `/test` - Test scripts for verifying rate limiting
- `/.github/workflows` - GitHub Actions workflow configuration

## Deployment

### Local Deployment

1. Prepare the Lambda function:

```bash
cd lambda
zip -r function.zip index.js
cd ..
```

2. Initialize and apply Terraform:

```bash
cd terraform
terraform init
terraform apply
```

3. Note the API Gateway URL from the output.

### GitHub Actions Deployment

The project includes a GitHub Actions workflow that automatically:
1. Validates the Terraform configuration
2. Deploys the infrastructure to AWS
3. Runs tests to verify rate limiting functionality
4. Destroys the infrastructure after testing

To use GitHub Actions:
1. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as repository secrets
2. Push changes to the repository
3. GitHub Actions will automatically run the workflow

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
