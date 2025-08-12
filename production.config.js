// Production Configuration
module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: 'production',
    corsOrigin: process.env.CLIENT_URL || 'https://localhost:3000',
    
    // Security
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.openai.com"],
        },
      },
    },
    
    // Rate Limiting
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: {
        analysis: 5,
        bulkAnalysis: 2,
        apiKeys: 20,
        adminLogin: 10,
        general: 100
      }
    },
    
    // File Upload
    upload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['pdf', 'doc', 'docx'],
      uploadDir: './uploads'
    }
  },
  
  // Client Configuration
  client: {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    version: '1.0.0',
    environment: 'production'
  },
  
  // AI Configuration
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.3
  },
  
  // Admin Configuration
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Monitoring
  monitoring: {
    healthCheck: {
      enabled: true,
      endpoint: '/api/health',
      interval: 30000 // 30 seconds
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE_ENABLED === 'true'
    }
  }
};
