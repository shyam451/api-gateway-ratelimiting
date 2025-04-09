const https = require('https');
const fs = require('fs');

const apiUrl = 'https://eeefxwoqf1.execute-api.us-east-1.amazonaws.com/prod/test';
const url = new URL(apiUrl);

const burstSize = 200;  // Initial burst of requests
const steadyRequests = 100; // Steady stream after burst
const totalRequests = burstSize + steadyRequests;

let successCount = 0;
let throttledCount = 0;
let otherErrorCount = 0;
let completedRequests = 0;
let burstSuccessCount = 0;
let burstThrottledCount = 0;
let burstOtherErrorCount = 0;
let steadySuccessCount = 0;
let steadyThrottledCount = 0;
let steadyOtherErrorCount = 0;

const responseDetails = {
  burst: [],
  steady: []
};

console.log(`Starting AWS API Gateway burst capacity test against ${apiUrl}`);
console.log(`Sending ${burstSize} requests in burst, followed by ${steadyRequests} steady requests...`);

function makeRequest(index, phase) {
  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'AWS-API-Gateway-Test-Client',
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        completedRequests++;
        
        const responseInfo = {
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.length < 1000 ? data : data.substring(0, 1000) + '...',
          requestIndex: index
        };
        
        if (phase === 'burst') {
          responseDetails.burst.push(responseInfo);
        } else {
          responseDetails.steady.push(responseInfo);
        }
        
        if (res.statusCode === 200) {
          successCount++;
          if (phase === 'burst') {
            burstSuccessCount++;
          } else {
            steadySuccessCount++;
          }
        } else if (res.statusCode === 429) {
          throttledCount++;
          if (phase === 'burst') {
            burstThrottledCount++;
          } else {
            steadyThrottledCount++;
          }
        } else {
          otherErrorCount++;
          if (phase === 'burst') {
            burstOtherErrorCount++;
          } else {
            steadyOtherErrorCount++;
          }
          console.error(`Request ${index} failed with status code ${res.statusCode}`);
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      completedRequests++;
      otherErrorCount++;
      
      const errorInfo = {
        error: error.message,
        requestIndex: index
      };
      
      if (phase === 'burst') {
        responseDetails.burst.push(errorInfo);
        burstOtherErrorCount++;
      } else {
        responseDetails.steady.push(errorInfo);
        steadyOtherErrorCount++;
      }
      
      console.error(`Request ${index} error: ${error.message}`);
      resolve();
    });
    
    req.end();
  });
}

function printResults() {
  console.log('\nAWS API Gateway Burst Capacity Test Results:');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Successful Requests: ${successCount}`);
  console.log(`Total Throttled Requests (429): ${throttledCount}`);
  console.log(`Other Errors: ${otherErrorCount}`);
  
  console.log('\nBurst Phase (First 200 requests):');
  console.log(`Successful: ${burstSuccessCount}`);
  console.log(`Throttled: ${burstThrottledCount}`);
  console.log(`Other Errors: ${burstOtherErrorCount}`);
  
  console.log('\nSteady Phase (Next 100 requests):');
  console.log(`Successful: ${steadySuccessCount}`);
  console.log(`Throttled: ${steadyThrottledCount}`);
  console.log(`Other Errors: ${steadyOtherErrorCount}`);
  
  const errorSamples = responseDetails.burst
    .filter(r => r.statusCode && r.statusCode !== 200 && r.statusCode !== 429)
    .slice(0, 3);
  
  if (errorSamples.length > 0) {
    console.log('\nError Response Samples:');
    errorSamples.forEach((sample, i) => {
      console.log(`Sample ${i+1}:`);
      console.log(`  Status Code: ${sample.statusCode}`);
      console.log(`  Headers: ${JSON.stringify(sample.headers)}`);
      console.log(`  Data: ${sample.data}`);
    });
  }
  
  if (burstSuccessCount > 100) {
    console.log('\n✅ Burst capacity appears to be working! More than 100 initial requests were allowed.');
  } else if (burstSuccessCount <= 100) {
    console.log('\n❓ Burst capacity results are inconclusive. Only standard rate limit observed or errors occurred.');
  }
  
  if (burstOtherErrorCount > 0) {
    console.log('\n⚠️ Some errors occurred that might be related to throttling but not returning 429 status codes.');
    console.log('   This is common with API Gateway when using the default throttling response template.');
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    apiUrl,
    totalRequests,
    successCount,
    throttledCount,
    otherErrorCount,
    burstPhase: {
      requests: burstSize,
      successful: burstSuccessCount,
      throttled: burstThrottledCount,
      errors: burstOtherErrorCount
    },
    steadyPhase: {
      requests: steadyRequests,
      successful: steadySuccessCount,
      throttled: steadyThrottledCount,
      errors: steadyOtherErrorCount
    },
    errorSamples: errorSamples
  };
  
  fs.writeFileSync('aws-api-gateway-test-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to aws-api-gateway-test-results.json');
}

async function runTest() {
  console.log('Sending burst requests in batches...');
  const batchSize = 20;
  const batchDelay = 50; // ms
  
  for (let batch = 0; batch < burstSize / batchSize; batch++) {
    console.log(`Sending burst batch ${batch+1}/${burstSize/batchSize}...`);
    const promises = [];
    
    for (let i = 0; i < batchSize; i++) {
      const requestIndex = batch * batchSize + i;
      promises.push(makeRequest(requestIndex, 'burst'));
    }
    
    await Promise.all(promises);
    
    if (batch < (burstSize / batchSize) - 1) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  console.log('Waiting before sending steady stream requests...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Sending steady stream requests...');
  const steadyBatchSize = 10;
  
  for (let batch = 0; batch < steadyRequests / steadyBatchSize; batch++) {
    console.log(`Sending steady batch ${batch+1}/${steadyRequests/steadyBatchSize}...`);
    const promises = [];
    
    for (let i = 0; i < steadyBatchSize; i++) {
      const requestIndex = burstSize + (batch * steadyBatchSize) + i;
      promises.push(makeRequest(requestIndex, 'steady'));
    }
    
    await Promise.all(promises);
    
    if (batch < (steadyRequests / steadyBatchSize) - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  printResults();
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
