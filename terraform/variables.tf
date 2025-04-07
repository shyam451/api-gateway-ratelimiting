variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "ApiGatewayRateLimitingLambda"
}

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "Rate Limited API"
}

variable "rate_limit" {
  description = "Rate limit for API Gateway (requests per second)"
  type        = number
  default     = 100
}

variable "burst_limit" {
  description = "Burst limit for API Gateway"
  type        = number
  default     = 200
}

variable "lambda_role_arn" {
  description = "ARN of the IAM role for Lambda"
  type        = string
  default     = "arn:aws:iam::641002720432:role/ec2-role"
}
