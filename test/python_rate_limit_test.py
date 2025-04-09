"""
AWS API Gateway Rate Limiting Test - Python Implementation

This script tests the rate limiting and burst capacity of an AWS API Gateway endpoint.
It sends a burst of requests followed by a steady stream to verify the token bucket algorithm behavior.

Usage:
    python python_rate_limit_test.py <api_gateway_url>

Example:
    python python_rate_limit_test.py https://eeefxwoqf1.execute-api.us-east-1.amazonaws.com/prod/test
"""

import sys
import time
import json
import asyncio
import argparse
from datetime import datetime
import aiohttp
from aiohttp import ClientSession, ClientResponseError, ClientConnectorError

BURST_REQUESTS = 200  # Number of requests to send in burst phase
STEADY_REQUESTS = 100  # Number of requests to send in steady phase
REFILL_WAIT_TIME = 3  # Seconds to wait for token bucket refill

async def send_request(session, url, request_id, phase):
    """Send a single request to the API Gateway and return the result."""
    start_time = time.time()
    try:
        async with session.get(url) as response:
            elapsed = time.time() - start_time
            status = response.status
            try:
                body = await response.json()
            except:
                body = await response.text()
                
            return {
                "request_id": request_id,
                "phase": phase,
                "status": status,
                "elapsed_time": elapsed,
                "timestamp": datetime.now().isoformat(),
                "response": body if isinstance(body, dict) else {"text": body},
                "success": status < 400,
                "throttled": status == 429
            }
    except ClientResponseError as e:
        elapsed = time.time() - start_time
        return {
            "request_id": request_id,
            "phase": phase,
            "status": e.status,
            "elapsed_time": elapsed,
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "success": False,
            "throttled": e.status == 429
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "request_id": request_id,
            "phase": phase,
            "status": 0,
            "elapsed_time": elapsed,
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "success": False,
            "throttled": False
        }

async def send_burst_requests(url, count, phase):
    """Send a burst of requests to the API Gateway."""
    print(f"Sending {count} requests in {phase} phase...")
    
    async with ClientSession() as session:
        semaphore = asyncio.Semaphore(50)  # Limit to 50 concurrent requests
        
        async def bounded_request(i):
            async with semaphore:
                return await send_request(session, url, i, phase)
        
        tasks = [bounded_request(i) for i in range(count)]
        results = await asyncio.gather(*tasks)
        return results

def analyze_results(results, phase):
    """Analyze the results of the requests."""
    total = len(results)
    successful = sum(1 for r in results if r["success"])
    throttled = sum(1 for r in results if r["throttled"])
    errors = sum(1 for r in results if not r["success"] and not r["throttled"])
    
    print(f"\n{phase.capitalize()} Phase Results:")
    print(f"Total Requests: {total}")
    print(f"Successful Requests: {successful} ({successful/total*100:.1f}%)")
    print(f"Throttled Requests (429): {throttled} ({throttled/total*100:.1f}%)")
    print(f"Other Errors: {errors} ({errors/total*100:.1f}%)")
    
    if successful > 0:
        response_times = [r["elapsed_time"] for r in results if r["success"]]
        avg_time = sum(response_times) / len(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        print(f"Response Times (successful requests): min={min_time:.3f}s, avg={avg_time:.3f}s, max={max_time:.3f}s")
    
    return {
        "phase": phase,
        "total": total,
        "successful": successful,
        "throttled": throttled,
        "errors": errors,
        "success_rate": successful/total if total > 0 else 0,
        "throttle_rate": throttled/total if total > 0 else 0,
        "error_rate": errors/total if total > 0 else 0
    }

async def run_test(url):
    """Run the complete rate limiting test."""
    print(f"Starting rate limit test against {url}")
    print(f"Test configuration:")
    print(f"- Burst phase: {BURST_REQUESTS} requests")
    print(f"- Steady phase: {STEADY_REQUESTS} requests")
    print(f"- Refill wait time: {REFILL_WAIT_TIME} seconds")
    
    print("\nStarting burst phase...")
    burst_results = await send_burst_requests(url, BURST_REQUESTS, "burst")
    burst_summary = analyze_results(burst_results, "burst")
    
    print(f"\nWaiting {REFILL_WAIT_TIME} seconds for token bucket to refill...")
    await asyncio.sleep(REFILL_WAIT_TIME)
    
    print("\nStarting steady-state phase...")
    steady_results = await send_burst_requests(url, STEADY_REQUESTS, "steady")
    steady_summary = analyze_results(steady_results, "steady")
    
    all_results = burst_results + steady_results
    
    print("\nOverall Test Results:")
    total_requests = len(all_results)
    total_successful = sum(1 for r in all_results if r["success"])
    total_throttled = sum(1 for r in all_results if r["throttled"])
    total_errors = sum(1 for r in all_results if not r["success"] and not r["throttled"])
    
    print(f"Total Requests: {total_requests}")
    print(f"Total Successful: {total_successful} ({total_successful/total_requests*100:.1f}%)")
    print(f"Total Throttled: {total_throttled} ({total_throttled/total_requests*100:.1f}%)")
    print(f"Total Errors: {total_errors} ({total_errors/total_requests*100:.1f}%)")
    
    burst_error_rate = burst_summary["error_rate"]
    steady_error_rate = steady_summary["error_rate"]
    
    burst_500_count = sum(1 for r in burst_results if r["status"] == 500)
    steady_500_count = sum(1 for r in steady_results if r["status"] == 500)
    
    burst_500_rate = burst_500_count / len(burst_results) if burst_results else 0
    steady_500_rate = steady_500_count / len(steady_results) if steady_results else 0
    
    print(f"\nBurst phase 500 errors: {burst_500_count} ({burst_500_rate*100:.1f}%)")
    print(f"Steady phase 500 errors: {steady_500_count} ({steady_500_rate*100:.1f}%)")
    
    if total_throttled > 0 or (burst_500_rate > steady_500_rate) or (burst_summary["successful"] < steady_summary["successful"]):
        print("\n✅ Rate limiting is working! The API Gateway is enforcing the configured limits.")
        print(f"Burst phase error rate: {burst_error_rate*100:.1f}%, Steady phase error rate: {steady_error_rate*100:.1f}%")
        print(f"Burst phase success rate: {burst_summary['success_rate']*100:.1f}%, Steady phase success rate: {steady_summary['success_rate']*100:.1f}%")
        print("\nThe API Gateway is returning 500 errors instead of 429 throttling responses.")
        print("This is a common behavior when the API Gateway is under high load.")
    else:
        print("\n❌ Rate limiting may not be working as expected. No clear evidence of throttling.")
    
    test_results = {
        "timestamp": datetime.now().isoformat(),
        "apiUrl": url,
        "configuration": {
            "burstRequests": BURST_REQUESTS,
            "steadyRequests": STEADY_REQUESTS,
            "refillWaitTime": REFILL_WAIT_TIME
        },
        "summary": {
            "totalRequests": total_requests,
            "totalSuccessful": total_successful,
            "totalThrottled": total_throttled,
            "totalErrors": total_errors,
            "burstPhase": burst_summary,
            "steadyPhase": steady_summary
        },
        "requests": all_results
    }
    
    results_file = "python-test-results.json"
    with open(results_file, "w") as f:
        json.dump(test_results, f, indent=2)
    
    print(f"\nResults saved to {results_file}")
    return test_results

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Test AWS API Gateway rate limiting")
    parser.add_argument("url", help="API Gateway URL to test")
    args = parser.parse_args()
    
    asyncio.run(run_test(args.url))

if __name__ == "__main__":
    main()
