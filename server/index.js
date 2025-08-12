const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const resumeAnalyzer = require('./services/resumeAnalyzer');
const cacheService = require('./services/cacheService');
const jobQueue = require('./services/jobQueue');
const fileOptimizer = require('./services/fileOptimizer');
const apiKeyManager = require('./services/apiKeyManager');
const usageTracker = require('./services/usageTracker');
const adminDashboard = require('./services/adminDashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Railway deployment (fixes rate limiting behind proxy)
app.set('trust proxy', 1);

// Serve React frontend static files
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  app.use(express.static(clientBuildPath));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes and admin routes
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Performance middleware
app.use(compression()); // Enable gzip compression
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for admin dashboard
      styleSrc: ["'self'", "'unsafe-inline'", "https:"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
})); // Security headers with CSP configuration

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Enhanced rate limiting with different limits for different endpoints
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

// Different rate limits for different endpoints
app.use('/api/analyze-resume', createRateLimit(15 * 60 * 1000, 5, 'Too many analysis requests. Please try again later.'));
app.use('/api/bulk-analyze', createRateLimit(60 * 60 * 1000, 2, 'Too many bulk analysis requests. Please try again later.'));
// Rate limit only admin login for security
app.use('/api/admin/login', createRateLimit(15 * 60 * 1000, 10, 'Too many login attempts. Please try again later.'));
// More permissive rate limiting for API key operations (user registration/management)
app.use('/api/keys', createRateLimit(15 * 60 * 1000, 20, 'Too many API key requests. Please try again later.'));
// General API rate limit (lower priority, applies to remaining endpoints)
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'Too many API requests. Please try again later.'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (admin dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');
[uploadsDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enhanced multer configuration with file optimization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const validation = fileOptimizer.validateFile(file);
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.errors.join('; ')), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files for bulk upload
  }
});

// Middleware to track processing time
const trackProcessingTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// API Key validation middleware
const validateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const validation = apiKeyManager.validateAPIKey(apiKey);
  
  if (!validation.valid) {
    usageTracker.logUsage('api_key_invalid', { apiKey, reason: validation.error });
    return res.status(401).json({ error: validation.error });
  }
  
  req.apiKey = apiKey;
  req.userTier = validation.keyData.tier;
  req.userId = validation.keyData.userId;
  next();
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const auth = adminDashboard.authenticateAdmin(username, password);
  
  if (!auth.success) {
    return res.status(401).json({ error: auth.error });
  }
  
  req.adminUser = auth.user;
  next();
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Resume Screener API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: fileOptimizer.getMemoryUsage()
  });
});

// Enhanced resume analysis endpoint with caching
app.post('/api/analyze-resume', validateAPIKey, trackProcessingTime, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processingStartTime = Date.now();
    console.log('Processing file:', req.file.originalname);

    // Optimize file
    const optimization = await fileOptimizer.optimizeFile(req.file);
    if (!optimization.success) {
      return res.status(400).json({ error: optimization.error });
    }

    // Extract text for cache key generation
    const text = await resumeAnalyzer.extractTextFromFile(req.file);
    
    // Check cache first
    const cachedAnalysis = await cacheService.getCachedResumeAnalysis(text);
    if (cachedAnalysis) {
      console.log('Cache hit for file:', req.file.originalname);
      
      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });

      const processingTime = Date.now() - processingStartTime;
      const stats = fileOptimizer.getProcessingStats(req.file, processingTime);
      
      return res.json({
        success: true,
        filename: req.file.originalname,
        analysis: cachedAnalysis,
        cached: true,
        processingStats: stats,
        optimization: optimization
      });
    }

    // Perform analysis
    const analysis = await resumeAnalyzer.analyzeResume(req.file);
    
    // Cache the results
    await cacheService.cacheResumeAnalysis(text, analysis);
    
    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    const processingTime = Date.now() - processingStartTime;
    const stats = fileOptimizer.getProcessingStats(req.file, processingTime);

    // Optimize response
    const optimizedResponse = fileOptimizer.compressResponse({
      success: true,
      filename: req.file.originalname,
      analysis: analysis,
      cached: false,
      processingStats: stats,
      optimization: optimization
    });

    usageTracker.logUsage('analysis_request', {
      apiKey: req.apiKey,
      userId: req.userId,
      tier: req.userTier,
      fileSize: req.file.size
    });

    // Record usage after successful analysis
    await apiKeyManager.recordUsage(req.apiKey);
    
    usageTracker.logUsage('analysis_success', {
      apiKey: req.apiKey,
      userId: req.userId,
      industry: analysis.industryAnalysis?.detectedIndustry,
      atsScore: analysis.atsCompatibility?.score,
      processingTime: processingTime,
      fileSize: req.file.size
    });

    res.json(optimizedResponse.data);

  } catch (error) {
    const processingTime = Date.now() - Date.now();
    
    usageTracker.logUsage('analysis_failure', {
      apiKey: req.apiKey,
      userId: req.userId,
      errorType: error.message,
      processingTime: processingTime
    });

    console.error('Error analyzing resume:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({
      error: 'Failed to analyze resume',
      message: error.message
    });
  }
});

// Bulk analysis endpoint with job queue
app.post('/api/bulk-analyze', trackProcessingTime, upload.array('resumes', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Validate batch
    const validation = fileOptimizer.validateBatchFiles(req.files);
    if (!validation.isValidBatch) {
      // Clean up uploaded files
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });

      return res.status(400).json({
        error: 'Batch validation failed',
        details: validation.invalid,
        batchSizeError: validation.batchSizeError
      });
    }

    // Add to job queue for background processing
    const filesData = req.files.map(file => ({
      buffer: fs.readFileSync(file.path),
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    const jobInfo = await jobQueue.addBulkAnalysisJob(filesData, 'normal');

    // Clean up uploaded files (they're now in job queue)
    req.files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    });

    res.json({
      success: true,
      message: 'Bulk analysis job queued',
      jobId: jobInfo.jobId,
      customJobId: jobInfo.customJobId,
      totalFiles: req.files.length,
      estimatedProcessingTime: `${req.files.length * 30} seconds`
    });

  } catch (error) {
    console.error('Error in bulk analysis:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      error: 'Failed to queue bulk analysis',
      message: error.message
    });
  }
});

// Job status endpoint
app.get('/api/job-status/:jobId', async (req, res) => {
  try {
    const status = await jobQueue.getJobStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

// Performance monitoring endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    const queueStats = await jobQueue.getQueueStats();
    const memoryUsage = fileOptimizer.getMemoryUsage();

    res.json({
      cache: cacheStats,
      queue: queueStats,
      memory: memoryUsage,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

// Cache management endpoints
app.post('/api/cache/flush', async (req, res) => {
  try {
    await cacheService.flush();
    res.json({ success: true, message: 'Cache flushed successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to flush cache',
      message: error.message
    });
  }
});

// Queue management endpoints
app.post('/api/queue/pause', async (req, res) => {
  try {
    await jobQueue.pauseQueue();
    res.json({ success: true, message: 'Queue paused successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to pause queue',
      message: error.message
    });
  }
});

app.post('/api/queue/resume', async (req, res) => {
  try {
    await jobQueue.resumeQueue();
    res.json({ success: true, message: 'Queue resumed successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to resume queue',
      message: error.message
    });
  }
});

// Business Feature Endpoints

// API Key Management
app.post('/api/keys/create', (req, res) => {
  try {
    const { name, email, tier = 'free' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const result = apiKeyManager.createAPIKey({ name, email, tier });
    
    usageTracker.logUsage('api_key_created', {
      userId: result.userId,
      tier: tier,
      email: email
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/keys/:apiKey/info', validateAPIKey, (req, res) => {
  try {
    const keyInfo = apiKeyManager.getAPIKeyInfo(req.apiKey);
    res.json(keyInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/keys/:apiKey/upgrade', validateAPIKey, (req, res) => {
  try {
    const { tier } = req.body;
    
    if (!['free', 'premium', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    const success = apiKeyManager.updateTier(req.apiKey, tier);
    
    if (success) {
      usageTracker.logUsage('tier_upgraded', {
        apiKey: req.apiKey,
        userId: req.userId,
        newTier: tier
      });
      
      res.json({ success: true, message: `Upgraded to ${tier} tier` });
    } else {
      res.status(400).json({ error: 'Failed to upgrade tier' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Usage and Analytics
app.get('/api/usage/stats', validateAPIKey, (req, res) => {
  try {
    const stats = usageTracker.getStats();
    const keyInfo = apiKeyManager.getAPIKeyInfo(req.apiKey);
    
    res.json({
      user: {
        tier: keyInfo.tier,
        usage: keyInfo.usage,
        quota: keyInfo.quota,
        resetDate: keyInfo.resetDate
      },
      system: {
        totalRequests: stats.overview.totalRequests,
        successRate: stats.overview.successRate,
        avgProcessingTime: stats.performance.avgProcessingTime
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage/export', validateAPIKey, (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = usageTracker.exportAnalytics(format);
    
    const filename = `analytics_${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Dashboard Endpoints
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const auth = adminDashboard.authenticateAdmin(username, password);
    
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }
    
    res.json({
      success: true,
      user: auth.user,
      message: 'Admin authenticated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/dashboard', (req, res) => {
  try {
    const overview = adminDashboard.getDashboardOverview(apiKeyManager, usageTracker);
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/analytics', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = adminDashboard.getAnalytics(usageTracker, days);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', (req, res) => {
  try {
    const users = adminDashboard.getAllUsers(apiKeyManager);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/keys/create', (req, res) => {
  try {
    const result = adminDashboard.createAPIKeyForUser(apiKeyManager, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/keys/:apiKey/tier', (req, res) => {
  try {
    const { tier } = req.body;
    const result = adminDashboard.updateAPIKeyTier(apiKeyManager, req.params.apiKey, tier);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/maintenance/toggle', (req, res) => {
  try {
    const result = adminDashboard.toggleMaintenanceMode();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/settings', (req, res) => {
  try {
    const result = adminDashboard.updateSystemSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = adminDashboard.exportSystemData(apiKeyManager, usageTracker, format);
    
    const filename = `system_export_${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/backup', (req, res) => {
  try {
    const result = adminDashboard.createSystemBackup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const health = usageTracker.getHealthMetrics();
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      status: health.status,
      system: systemInfo,
      metrics: health.metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  
  res.status(500).json({ 
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Cleanup function
const cleanup = async () => {
  console.log('Performing cleanup...');
  try {
    await cacheService.cleanup();
    await jobQueue.cleanup();
    await jobQueue.close();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Periodic cleanup (every hour)
setInterval(async () => {
  try {
    await jobQueue.cleanup();
    console.log('Periodic cleanup completed');
  } catch (error) {
    console.error('Periodic cleanup error:', error);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Performance features enabled:');
  console.log('- Response compression');
  console.log('- File optimization');
  console.log('- Memory caching');
  console.log('- Background job processing');
  console.log('- Enhanced rate limiting');
});
