const http = require('http');

const PORT = process.env.PORT || 5000;

console.log('🚀 Ultra-simple server starting...');
console.log(`Port: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

const server = http.createServer((req, res) => {
  console.log(`📍 Request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const response = {
    status: 'ok',
    message: 'Ultra-simple server is running',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    port: PORT
  };
  
  res.writeHead(200);
  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Ultra-simple server running on port ${PORT}`);
  console.log(`🌐 Ready for requests at http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
