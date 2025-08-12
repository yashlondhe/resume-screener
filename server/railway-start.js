#!/usr/bin/env node

// Railway-specific startup script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Railway startup script');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

// Build React frontend in production
if (process.env.NODE_ENV === 'production') {
  console.log('🔨 Building React frontend...');
  try {
    const clientPath = path.join(__dirname, '../client');
    if (fs.existsSync(clientPath)) {
      process.chdir(clientPath);
      execSync('npm install', { stdio: 'inherit' });
      execSync('npm run build', { stdio: 'inherit' });
      process.chdir(__dirname);
      console.log('✅ React frontend built successfully');
    } else {
      console.log('⚠️  Client directory not found, skipping frontend build');
    }
  } catch (error) {
    console.log('⚠️  Frontend build failed:', error.message);
    console.log('Continuing with backend-only deployment...');
  }
}

// Create necessary directories
const dirs = ['config', 'data', 'logs', 'uploads'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      console.log(`⚠️  Could not create directory ${dir}:`, error.message);
    }
  }
});

// Check environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:', missingVars);
  console.log('The application will use fallback analysis for resume screening.');
}

// Start the main application
console.log('🚀 Starting main application...');
require('./index.js');
