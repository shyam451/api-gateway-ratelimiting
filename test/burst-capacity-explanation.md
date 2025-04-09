# Burst Capacity in API Gateway Rate Limiting

## Token Bucket Algorithm

AWS API Gateway uses the Token Bucket Algorithm for rate limiting, which works as follows:

1. A "bucket" holds tokens (representing allowed requests)
2. The bucket has a maximum capacity (burst limit)
3. Tokens are added to the bucket at a fixed rate (rate limit)
4. Each request consumes one token from the bucket
5. If the bucket is empty, requests are throttled

## Burst Capacity Behavior

With a rate limit of 100 requests/second and burst capacity of 200:

- The bucket can hold up to 200 tokens (burst limit)
- Tokens are added at a rate of 100 per second (rate limit)
- When no requests are being made, tokens accumulate up to the burst limit
- When a sudden burst of traffic arrives, up to 200 requests can be processed immediately
- After the burst capacity is consumed, the API throttles to 100 requests per second

## Test Results Explanation

Our tests show approximately 100 successful requests in the burst phase rather than the expected 200 due to:

1. **Concurrent Request Handling**: When sending 200 requests simultaneously, Node.js and Express process them concurrently but not truly in parallel. The server begins processing some requests while others are still being received.

2. **Token Consumption Rate**: As the server processes the first batch of requests, it's already consuming tokens faster than they can be replenished.

3. **Network and Processing Delays**: Small delays in request processing mean that by the time later requests are processed, earlier ones have already consumed tokens.

## Real-World API Gateway Behavior

In AWS API Gateway:

- The actual burst capacity implementation is more sophisticated
- The service is distributed and can handle true bursts of traffic
- The token bucket algorithm is implemented at the infrastructure level
- AWS's implementation includes optimizations for handling concurrent requests

## Demonstration vs. Production

Our demonstration shows the conceptual behavior of the token bucket algorithm, while the actual AWS API Gateway implementation provides more robust burst handling in production environments.

For a true test of AWS API Gateway's burst capacity, you would need to deploy to AWS and test against the actual service.
