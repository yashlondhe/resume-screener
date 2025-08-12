const Queue = require('bull');
const path = require('path');

class JobQueueService {
  constructor() {
    // Initialize job queues with Redis URL support (including authentication)
    let redisConfig;
    
    if (process.env.REDIS_URL) {
      // Use Redis URL directly (supports redis://username:password@host:port format)
      redisConfig = process.env.REDIS_URL;
      console.log('Using Redis URL with authentication');
    } else {
      // Fallback to individual Redis configuration
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined
      };
      console.log('Using Redis individual configuration');
    }

    this.resumeQueue = new Queue('resume analysis', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep only 10 completed jobs
        removeOnFail: 50,     // Keep 50 failed jobs for debugging
        attempts: 3,          // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupJobProcessors();
    this.setupEventListeners();
  }

  setupJobProcessors() {
    // Process resume analysis jobs
    this.resumeQueue.process('analyze', 5, async (job) => {
      const { fileData, jobId } = job.data;
      
      try {
        // Import here to avoid circular dependencies
        const resumeAnalyzer = require('./resumeAnalyzer');
        const cacheService = require('./cacheService');
        
        // Update job progress
        job.progress(10);
        
        // Create temporary file for processing
        const fs = require('fs');
        const tempFilePath = path.join(__dirname, '../temp', `${jobId}_${Date.now()}`);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Write file data to temp file
        fs.writeFileSync(tempFilePath, Buffer.from(fileData.buffer));
        
        const tempFile = {
          path: tempFilePath,
          originalname: fileData.originalname,
          mimetype: fileData.mimetype,
          size: fileData.size
        };
        
        job.progress(30);
        
        // Perform analysis
        const analysis = await resumeAnalyzer.analyzeResume(tempFile);
        
        job.progress(90);
        
        // Cache the results
        const fileText = await resumeAnalyzer.extractTextFromFile(tempFile);
        await cacheService.cacheResumeAnalysis(fileText, analysis);
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        job.progress(100);
        
        return {
          success: true,
          analysis,
          filename: fileData.originalname,
          jobId
        };
        
      } catch (error) {
        console.error('Job processing error:', error);
        throw error;
      }
    });

    // Process bulk analysis jobs
    this.resumeQueue.process('bulk-analyze', 2, async (job) => {
      const { files, jobId } = job.data;
      const results = [];
      
      try {
        const resumeAnalyzer = require('./resumeAnalyzer');
        
        for (let i = 0; i < files.length; i++) {
          const fileData = files[i];
          const progress = Math.round(((i + 1) / files.length) * 100);
          
          job.progress(progress);
          
          // Process each file
          const fs = require('fs');
          const tempFilePath = path.join(__dirname, '../temp', `${jobId}_${i}_${Date.now()}`);
          
          const tempDir = path.dirname(tempFilePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          fs.writeFileSync(tempFilePath, Buffer.from(fileData.buffer));
          
          const tempFile = {
            path: tempFilePath,
            originalname: fileData.originalname,
            mimetype: fileData.mimetype,
            size: fileData.size
          };
          
          try {
            const analysis = await resumeAnalyzer.analyzeResume(tempFile);
            results.push({
              filename: fileData.originalname,
              analysis,
              success: true
            });
          } catch (error) {
            results.push({
              filename: fileData.originalname,
              error: error.message,
              success: false
            });
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
        }
        
        return {
          success: true,
          results,
          totalFiles: files.length,
          successCount: results.filter(r => r.success).length,
          jobId
        };
        
      } catch (error) {
        console.error('Bulk job processing error:', error);
        throw error;
      }
    });
  }

  setupEventListeners() {
    // Job completion events
    this.resumeQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.resumeQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err.message);
    });

    this.resumeQueue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });

    // Queue events
    this.resumeQueue.on('error', (error) => {
      console.error('Queue error:', error);
    });
  }

  // Add resume analysis job
  async addResumeAnalysisJob(fileData, priority = 'normal') {
    const jobId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await this.resumeQueue.add('analyze', {
      fileData: {
        buffer: fileData.buffer,
        originalname: fileData.originalname,
        mimetype: fileData.mimetype,
        size: fileData.size
      },
      jobId
    }, {
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
      delay: 0
    });

    return {
      jobId: job.id,
      customJobId: jobId,
      status: 'queued'
    };
  }

  // Add bulk analysis job
  async addBulkAnalysisJob(filesData, priority = 'normal') {
    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = await this.resumeQueue.add('bulk-analyze', {
      files: filesData.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      })),
      jobId
    }, {
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
      delay: 0
    });

    return {
      jobId: job.id,
      customJobId: jobId,
      status: 'queued',
      totalFiles: filesData.length
    };
  }

  // Get job status
  async getJobStatus(jobId) {
    try {
      const job = await this.resumeQueue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress();
      
      let result = null;
      if (state === 'completed') {
        result = job.returnvalue;
      } else if (state === 'failed') {
        result = { error: job.failedReason };
      }

      return {
        status: state,
        progress: progress,
        result: result,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null
      };
    } catch (error) {
      console.error('Error getting job status:', error);
      return { status: 'error', error: error.message };
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const waiting = await this.resumeQueue.getWaiting();
      const active = await this.resumeQueue.getActive();
      const completed = await this.resumeQueue.getCompleted();
      const failed = await this.resumeQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { error: error.message };
    }
  }

  // Clean up old jobs
  async cleanup() {
    try {
      await this.resumeQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
      await this.resumeQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
      console.log('Job queue cleanup completed');
    } catch (error) {
      console.error('Job queue cleanup error:', error);
    }
  }

  // Pause/Resume queue
  async pauseQueue() {
    await this.resumeQueue.pause();
  }

  async resumeQueue() {
    await this.resumeQueue.resume();
  }

  // Close queue connections
  async close() {
    await this.resumeQueue.close();
  }
}

// Export singleton instance
module.exports = new JobQueueService();
