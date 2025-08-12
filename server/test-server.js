#!/usr/bin/env node

// Minimal test server for Railway debugging
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting minimal test server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${PORT}`);

// Basic middleware
app.use(express.json());

// Simple test routes
app.get('/ping', (req, res) => {
  console.log('📍 Ping request received');
  res.json({ 
    status: 'pong', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  console.log('🏥 Health check request received');
  res.json({ 
    status: 'OK', 
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/', (req, res) => {
  console.log('🏠 Root request received');
  res.json({
    message: 'Resume Screener Test Server',
    status: 'running',
    endpoints: {
      ping: '/ping',
      health: '/api/health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Test server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log('✅ Ready for requests!');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
