const fs = require('fs');
const path = require('path');

class UsageTracker {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.analyticsFile = path.join(this.logsDir, 'analytics.json');
    this.usageLogFile = path.join(this.logsDir, 'usage.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // In-memory counters for real-time tracking
    this.counters = {
      totalRequests: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bulkAnalyses: 0,
      industryDetections: {},
      atsScores: [],
      processingTimes: [],
      fileSizes: [],
      errorTypes: {},
      apiKeyUsage: {},
      hourlyStats: {},
      dailyStats: {}
    };
    
    // Load existing analytics
    this.loadAnalytics();
    
    // Start periodic saves
    this.startPeriodicSave();
  }

  loadAnalytics() {
    try {
      if (fs.existsSync(this.analyticsFile)) {
        const data = fs.readFileSync(this.analyticsFile, 'utf8');
        const analytics = JSON.parse(data);
        
        // Merge with current counters (preserve in-memory data)
        this.counters = { ...analytics.counters, ...this.counters };
        
        console.log('Analytics data loaded successfully');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  saveAnalytics() {
    try {
      const analyticsData = {
        counters: this.counters,
        lastSaved: new Date().toISOString(),
        version: '1.0'
      };
      
      fs.writeFileSync(this.analyticsFile, JSON.stringify(analyticsData, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving analytics:', error);
      return false;
    }
  }

  startPeriodicSave() {
    // Save analytics every 5 minutes
    setInterval(() => {
      this.saveAnalytics();
    }, 5 * 60 * 1000);
    
    // Daily cleanup and aggregation
    setInterval(() => {
      this.performDailyCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  // Log usage event
  logUsage(eventType, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      eventType,
      ...data
    };
    
    // Write to log file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.usageLogFile, logLine);
    
    // Update in-memory counters
    this.updateCounters(eventType, data);
  }

  updateCounters(eventType, data) {
    const now = new Date();
    const hour = now.getHours();
    const date = now.toISOString().split('T')[0];
    
    // Initialize time-based counters
    if (!this.counters.hourlyStats[hour]) {
      this.counters.hourlyStats[hour] = 0;
    }
    if (!this.counters.dailyStats[date]) {
      this.counters.dailyStats[date] = {
        requests: 0,
        successes: 0,
        failures: 0,
        cacheHits: 0
      };
    }

    switch (eventType) {
      case 'analysis_request':
        this.counters.totalRequests++;
        this.counters.hourlyStats[hour]++;
        this.counters.dailyStats[date].requests++;
        
        if (data.apiKey) {
          this.counters.apiKeyUsage[data.apiKey] = (this.counters.apiKeyUsage[data.apiKey] || 0) + 1;
        }
        break;
        
      case 'analysis_success':
        this.counters.successfulAnalyses++;
        this.counters.dailyStats[date].successes++;
        
        if (data.industry) {
          this.counters.industryDetections[data.industry] = (this.counters.industryDetections[data.industry] || 0) + 1;
        }
        
        if (data.atsScore) {
          this.counters.atsScores.push(data.atsScore);
          // Keep only last 1000 scores to prevent memory bloat
          if (this.counters.atsScores.length > 1000) {
            this.counters.atsScores = this.counters.atsScores.slice(-1000);
          }
        }
        
        if (data.processingTime) {
          this.counters.processingTimes.push(data.processingTime);
          if (this.counters.processingTimes.length > 1000) {
            this.counters.processingTimes = this.counters.processingTimes.slice(-1000);
          }
        }
        
        if (data.fileSize) {
          this.counters.fileSizes.push(data.fileSize);
          if (this.counters.fileSizes.length > 1000) {
            this.counters.fileSizes = this.counters.fileSizes.slice(-1000);
          }
        }
        break;
        
      case 'analysis_failure':
        this.counters.failedAnalyses++;
        this.counters.dailyStats[date].failures++;
        
        if (data.errorType) {
          this.counters.errorTypes[data.errorType] = (this.counters.errorTypes[data.errorType] || 0) + 1;
        }
        break;
        
      case 'cache_hit':
        this.counters.cacheHits++;
        this.counters.dailyStats[date].cacheHits++;
        break;
        
      case 'cache_miss':
        this.counters.cacheMisses++;
        break;
        
      case 'bulk_analysis':
        this.counters.bulkAnalyses++;
        break;
    }
  }

  // Get real-time statistics
  getStats() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    // Calculate averages
    const avgAtsScore = this.counters.atsScores.length > 0 
      ? this.counters.atsScores.reduce((a, b) => a + b, 0) / this.counters.atsScores.length 
      : 0;
      
    const avgProcessingTime = this.counters.processingTimes.length > 0
      ? this.counters.processingTimes.reduce((a, b) => a + b, 0) / this.counters.processingTimes.length
      : 0;
      
    const avgFileSize = this.counters.fileSizes.length > 0
      ? this.counters.fileSizes.reduce((a, b) => a + b, 0) / this.counters.fileSizes.length
      : 0;

    // Calculate success rate
    const totalAnalyses = this.counters.successfulAnalyses + this.counters.failedAnalyses;
    const successRate = totalAnalyses > 0 ? (this.counters.successfulAnalyses / totalAnalyses) * 100 : 0;
    
    // Calculate cache hit rate
    const totalCacheRequests = this.counters.cacheHits + this.counters.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? (this.counters.cacheHits / totalCacheRequests) * 100 : 0;

    return {
      overview: {
        totalRequests: this.counters.totalRequests,
        successfulAnalyses: this.counters.successfulAnalyses,
        failedAnalyses: this.counters.failedAnalyses,
        successRate: Math.round(successRate * 100) / 100,
        bulkAnalyses: this.counters.bulkAnalyses
      },
      performance: {
        cacheHits: this.counters.cacheHits,
        cacheMisses: this.counters.cacheMisses,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        avgProcessingTime: Math.round(avgProcessingTime),
        avgFileSize: Math.round(avgFileSize)
      },
      analysis: {
        avgAtsScore: Math.round(avgAtsScore * 100) / 100,
        industryDistribution: this.counters.industryDetections,
        topErrors: this.getTopErrors(),
        recentAtsScores: this.counters.atsScores.slice(-10)
      },
      usage: {
        todayRequests: this.counters.dailyStats[today]?.requests || 0,
        currentHourRequests: this.counters.hourlyStats[currentHour] || 0,
        topApiKeys: this.getTopApiKeys(),
        hourlyDistribution: this.getHourlyDistribution()
      },
      timestamp: new Date().toISOString()
    };
  }

  getTopErrors(limit = 5) {
    return Object.entries(this.counters.errorTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  getTopApiKeys(limit = 10) {
    return Object.entries(this.counters.apiKeyUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([apiKey, count]) => ({ 
        apiKey: apiKey.substring(0, 12) + '...', 
        requests: count 
      }));
  }

  getHourlyDistribution() {
    const distribution = {};
    for (let hour = 0; hour < 24; hour++) {
      distribution[hour] = this.counters.hourlyStats[hour] || 0;
    }
    return distribution;
  }

  // Get detailed analytics for admin dashboard
  getDetailedAnalytics(days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const dailyData = {};
    
    // Generate daily breakdown
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = this.counters.dailyStats[dateStr] || {
        requests: 0,
        successes: 0,
        failures: 0,
        cacheHits: 0
      };
    }

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: days
      },
      dailyBreakdown: dailyData,
      summary: this.getStats(),
      trends: this.calculateTrends(dailyData)
    };
  }

  calculateTrends(dailyData) {
    const values = Object.values(dailyData);
    const requests = values.map(d => d.requests);
    const successes = values.map(d => d.successes);
    
    return {
      requestTrend: this.calculateTrend(requests),
      successTrend: this.calculateTrend(successes),
      avgDailyRequests: requests.reduce((a, b) => a + b, 0) / requests.length,
      avgDailySuccesses: successes.reduce((a, b) => a + b, 0) / successes.length
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    
    if (older === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - older) / older) * 100);
  }

  // Export analytics data
  exportAnalytics(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      stats: this.getStats(),
      detailedAnalytics: this.getDetailedAnalytics(30), // Last 30 days
      rawCounters: this.counters
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  convertToCSV(data) {
    // Simple CSV conversion for daily stats
    const dailyData = data.detailedAnalytics.dailyBreakdown;
    let csv = 'Date,Requests,Successes,Failures,Cache Hits\n';
    
    Object.entries(dailyData).forEach(([date, stats]) => {
      csv += `${date},${stats.requests},${stats.successes},${stats.failures},${stats.cacheHits}\n`;
    });
    
    return csv;
  }

  // Clean up old data
  performDailyCleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    // Clean up daily stats
    Object.keys(this.counters.dailyStats).forEach(date => {
      if (date < cutoffStr) {
        delete this.counters.dailyStats[date];
      }
    });
    
    // Rotate log files if they get too large
    this.rotateLogFiles();
    
    console.log('Daily cleanup completed');
  }

  rotateLogFiles() {
    try {
      const stats = fs.statSync(this.usageLogFile);
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().split('T')[0];
        const archivePath = path.join(this.logsDir, `usage_${timestamp}.log`);
        
        fs.renameSync(this.usageLogFile, archivePath);
        fs.writeFileSync(this.usageLogFile, ''); // Create new empty log file
        
        console.log(`Log file rotated: ${archivePath}`);
      }
    } catch (error) {
      console.error('Error rotating log files:', error);
    }
  }

  // Get system health metrics
  getHealthMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentHour = now.getHours();
    const previousHour = oneHourAgo.getHours();
    
    const currentHourRequests = this.counters.hourlyStats[currentHour] || 0;
    const previousHourRequests = this.counters.hourlyStats[previousHour] || 0;
    
    const recentFailures = this.counters.failedAnalyses;
    const recentSuccesses = this.counters.successfulAnalyses;
    const totalRecent = recentFailures + recentSuccesses;
    
    return {
      status: this.determineHealthStatus(currentHourRequests, recentFailures, totalRecent),
      metrics: {
        currentHourRequests,
        previousHourRequests,
        errorRate: totalRecent > 0 ? (recentFailures / totalRecent) * 100 : 0,
        cacheHitRate: this.counters.cacheHits + this.counters.cacheMisses > 0 
          ? (this.counters.cacheHits / (this.counters.cacheHits + this.counters.cacheMisses)) * 100 
          : 0
      }
    };
  }

  determineHealthStatus(currentRequests, failures, total) {
    const errorRate = total > 0 ? (failures / total) * 100 : 0;
    
    if (errorRate > 50) return 'critical';
    if (errorRate > 20) return 'warning';
    if (currentRequests === 0 && total === 0) return 'idle';
    return 'healthy';
  }
}

module.exports = new UsageTracker();
