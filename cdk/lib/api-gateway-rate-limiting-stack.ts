import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ApiGatewayRateLimitingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Existing backend Lambda ──────────────────────────────────────────────
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });

    // ── World Capitals Quiz Lambda (Claude-powered) ──────────────────────────
    const quizLambda = new lambda.Function(this, 'WorldCapitalsQuizLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'quiz.handler',
      code: lambda.Code.fromAsset('../lambda'),
      // Claude API calls can take a few seconds, so allow generous timeout
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: {
        // ANTHROPIC_API_KEY is injected at deploy time via an environment
        // variable or AWS Secrets Manager.  Set it before deploying:
        //   export ANTHROPIC_API_KEY=sk-ant-...
        //   cdk deploy
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
      },
      description:
        'World Capitals Quiz – uses the Claude AI model to generate questions and evaluate answers.',
    });

    const apiGatewayRole = iam.Role.fromRoleName(this, 'ApiGatewayRole', 'api-gateway-role');

    // ── API Gateway ──────────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'RateLimitedApi', {
      restApiName: 'Rate Limited API',
      description: 'API Gateway with rate limiting enabled, including a World Capitals Quiz.',
      deployOptions: {
        stageName: 'prod',
        methodOptions: {
          '/*/*': {
            throttlingRateLimit: 100,  // 100 requests per second
            throttlingBurstLimit: 200, // Burst capacity
          },
        },
      },
    });

    // ── /test route (existing) ───────────────────────────────────────────────
    const testResource = api.root.addResource('test');
    testResource.addMethod('GET', new apigateway.LambdaIntegration(backendLambda));

    // ── /quiz routes (new) ───────────────────────────────────────────────────
    const quizIntegration = new apigateway.LambdaIntegration(quizLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    const quizResource = api.root.addResource('quiz');
    quizResource.addMethod('GET', quizIntegration);         // GET /quiz  – API info
    quizResource.addCorsPreflight({ allowOrigins: apigateway.Cors.ALL_ORIGINS });

    const questionResource = quizResource.addResource('question');
    questionResource.addMethod('GET', quizIntegration);    // GET /quiz/question
    questionResource.addCorsPreflight({ allowOrigins: apigateway.Cors.ALL_ORIGINS });

    const answerResource = quizResource.addResource('answer');
    answerResource.addMethod('POST', quizIntegration);     // POST /quiz/answer
    answerResource.addCorsPreflight({ allowOrigins: apigateway.Cors.ALL_ORIGINS });

    const sessionResource = quizResource.addResource('session');
    sessionResource.addMethod('GET', quizIntegration);     // GET /quiz/session
    sessionResource.addCorsPreflight({ allowOrigins: apigateway.Cors.ALL_ORIGINS });

    // ── Outputs ──────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'Base URL of the API Gateway',
    });

    new cdk.CfnOutput(this, 'QuizApiInfoUrl', {
      value: `${api.url}quiz`,
      description: 'GET this URL to see all quiz endpoints',
    });

    new cdk.CfnOutput(this, 'QuizQuestionUrl', {
      value: `${api.url}quiz/question?difficulty=easy`,
      description: 'GET a random world-capitals question (difficulty: easy | medium | hard)',
    });

    new cdk.CfnOutput(this, 'QuizAnswerUrl', {
      value: `${api.url}quiz/answer`,
      description: 'POST { country, correctAnswer, userAnswer } to evaluate your answer',
    });

    new cdk.CfnOutput(this, 'QuizSessionUrl', {
      value: `${api.url}quiz/session?count=10&difficulty=easy`,
      description: 'GET a full quiz session (count: 3-20, difficulty: easy | medium | hard)',
    });
  }
}
