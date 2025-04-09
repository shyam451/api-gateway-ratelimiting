const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { 
    status: 429, 
    message: 'Too many requests, please try again later.' 
  }
});

app.use(limiter);

app.get('/test', (req, res) => {
  res.json({
    message: 'Hello from Lambda!',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(2, 15),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
});
