const https = require('https');
const http = require('http');
const fs = require('fs');


const apiUrl = process.argv[2];
if (!apiUrl) {
  console.error('Please provide the API Gateway URL as an argument');
  process.exit(1);
}

const url = new URL(apiUrl);
const options = {
  hostname: url.hostname,
  port: url.protocol === 'https:' ? 443 : (url.port ? parseInt(url.port) : 80),
  path: url.pathname,
  method: 'GET',
};

const totalRequests = 150;
let successCount = 0;
let throttledCount = 0;
let otherErrorCount = 0;
let completedRequests = 0;

console.log(`Starting rate limit test against ${apiUrl}`);
console.log(`Sending ${totalRequests} requests...`);

function makeRequest(index) {
  const requestModule = url.protocol === 'https:' ? https : http;
  
  const req = requestModule.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      completedRequests++;
      
      if (res.statusCode === 200) {
        successCount++;
      } else if (res.statusCode === 429) {
        throttledCount++;
      } else {
        otherErrorCount++;
        console.error(`Request ${index} failed with status code ${res.statusCode}`);
      }
      
      if (completedRequests === totalRequests) {
        printResults();
      }
    });
  });
  
  req.on('error', (error) => {
    completedRequests++;
    otherErrorCount++;
    console.error(`Request ${index} error: ${error.message}`);
    
    if (completedRequests === totalRequests) {
      printResults();
    }
  });
  
  req.end();
}

function printResults() {
  console.log('\nTest Results:');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful Requests: ${successCount}`);
  console.log(`Throttled Requests (429): ${throttledCount}`);
  console.log(`Other Errors: ${otherErrorCount}`);
  
  if (throttledCount > 0) {
    console.log('\nRate limiting is working! Some requests were throttled.');
  } else {
    console.log('\nRate limiting might not be working correctly. No requests were throttled.');
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    apiUrl,
    totalRequests,
    successCount,
    throttledCount,
    otherErrorCount,
  };
  
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to test-results.json');
}

console.log('Sending requests in parallel...');
for (let i = 0; i < totalRequests; i++) {
  makeRequest(i);
}
