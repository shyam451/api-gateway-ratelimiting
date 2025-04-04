import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
export class ApiGatewayRateLimitingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });

    const apiGatewayRole = iam.Role.fromRoleName(this, 'ApiGatewayRole', 'api-gateway-role');

    const api = new apigateway.RestApi(this, 'RateLimitedApi', {
      restApiName: 'Rate Limited API',
      description: 'API Gateway with rate limiting enabled',
      deployOptions: {
        stageName: 'prod',
        methodOptions: {
          '/*/*': {  // This applies to all resources and methods
            throttlingRateLimit: 100,  // 100 requests per second
            throttlingBurstLimit: 200, // Burst capacity of 200 requests
          },
        },
      },
    });

    const resource = api.root.addResource('test');
    resource.addMethod('GET', new apigateway.LambdaIntegration(backendLambda));

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });
  }
}
