output "api_gateway_url" {
  description = "URL of the deployed API Gateway"
  value       = "${aws_api_gateway_deployment.api_deployment.invoke_url}/test"
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.api.id
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api_backend.function_name
}

output "rate_limit" {
  description = "Configured rate limit (requests per second)"
  value       = var.rate_limit
}

output "burst_limit" {
  description = "Configured burst limit"
  value       = var.burst_limit
}
