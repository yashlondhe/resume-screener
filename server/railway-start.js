#!/usr/bin/env node

// Railway-specific startup script
const fs = require('fs');
const path = require('path');

console.log('🚀 Railway startup script initializing...');
console.log('📊 Environment Details:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   - PORT: ${process.env.PORT || 'not set'}`);
console.log(`   - Working Directory: ${process.cwd()}`);
console.log(`   - Script Location: ${__dirname}`);

// Create necessary directories
const dirs = ['config', 'data', 'logs', 'uploads'];
console.log('📁 Creating necessary directories...');
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ Created directory: ${dir}`);
    } catch (error) {
      console.log(`   ⚠️  Could not create directory ${dir}:`, error.message);
    }
  } else {
    console.log(`   ✅ Directory exists: ${dir}`);
  }
});

// Check environment variables
console.log('🔍 Checking environment variables...');
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('   ⚠️  Missing environment variables:', missingVars);
  console.log('   📝 The application will use fallback analysis for resume screening.');
} else {
  console.log('   ✅ All required environment variables are set');
}

// Check if client build exists
const possibleClientPaths = [
  path.join(__dirname, '../client/build'),
  path.join(process.cwd(), 'client/build'),
  path.join('/app', 'client/build')
];

let clientBuildPath = null;
for (const buildPath of possibleClientPaths) {
  if (fs.existsSync(buildPath)) {
    clientBuildPath = buildPath;
    console.log(`   ✅ React frontend build found at: ${buildPath}`);
    break;
  }
}

if (!clientBuildPath) {
  console.log('   ⚠️  React frontend build not found in any of these locations:');
  possibleClientPaths.forEach(p => console.log(`      - ${p}`));
  console.log('   📝 Frontend serving may not work properly');
}

// Start the main application
console.log('🎯 Starting main application...');
try {
  require('./index.js');
} catch (error) {
  console.error('❌ Failed to start main application:', error);
  process.exit(1);
}
