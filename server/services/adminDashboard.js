const fs = require('fs');
const path = require('path');

class AdminDashboard {
  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.adminConfigFile = path.join(this.configDir, 'admin-config.json');
    
    // Initialize admin configuration
    this.initializeAdminConfig();
    this.adminConfig = this.loadAdminConfig();
  }

  initializeAdminConfig() {
    if (!fs.existsSync(this.adminConfigFile)) {
      const defaultConfig = {
        adminUsers: {
          'admin': {
            username: 'admin',
            password: 'admin123', // Change this in production!
            role: 'super_admin',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            permissions: ['view_analytics', 'manage_api_keys', 'system_control', 'user_management']
          }
        },
        settings: {
          maintenanceMode: false,
          maxDailyRequests: 1000,
          alertThresholds: {
            errorRate: 10, // percentage
            responseTime: 5000, // milliseconds
            diskUsage: 80 // percentage
          },
          features: {
            bulkAnalysis: true,
            apiAccess: true,
            caching: true,
            rateLimiting: true
          }
        },
        notifications: {
          email: {
            enabled: false,
            smtp: {
              host: '',
              port: 587,
              user: '',
              password: ''
            },
            alerts: ['system_error', 'high_usage', 'maintenance']
          },
          webhook: {
            enabled: false,
            url: '',
            events: ['api_key_created', 'tier_upgraded', 'system_alert']
          }
        },
        created: new Date().toISOString(),
        version: '1.0'
      };
      
      fs.writeFileSync(this.adminConfigFile, JSON.stringify(defaultConfig, null, 2));
    }
  }

  loadAdminConfig() {
    try {
      const data = fs.readFileSync(this.adminConfigFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading admin config:', error);
      return null;
    }
  }

  saveAdminConfig() {
    try {
      this.adminConfig.lastModified = new Date().toISOString();
      fs.writeFileSync(this.adminConfigFile, JSON.stringify(this.adminConfig, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving admin config:', error);
      return false;
    }
  }

  // Authenticate admin user
  authenticateAdmin(username, password) {
    const user = this.adminConfig.adminUsers[username];
    
    if (!user) {
      return { success: false, error: 'Invalid username' };
    }
    
    // In production, use proper password hashing (bcrypt)
    if (user.password !== password) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    this.saveAdminConfig();
    
    return {
      success: true,
      user: {
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    };
  }

  // Get dashboard overview data
  getDashboardOverview(apiKeyManager, usageTracker) {
    const stats = usageTracker.getStats();
    const apiKeyStats = apiKeyManager.getUsageStats();
    const healthMetrics = usageTracker.getHealthMetrics();
    
    return {
      systemHealth: {
        status: healthMetrics.status,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        errorRate: healthMetrics.metrics.errorRate,
        cacheHitRate: healthMetrics.metrics.cacheHitRate
      },
      usage: {
        totalRequests: stats.overview.totalRequests,
        todayRequests: stats.usage.todayRequests,
        successRate: stats.overview.successRate,
        avgProcessingTime: stats.performance.avgProcessingTime
      },
      apiKeys: {
        total: apiKeyStats.totalKeys,
        active: apiKeyStats.activeKeys,
        tierDistribution: apiKeyStats.tiers
      },
      recentActivity: {
        hourlyDistribution: stats.usage.hourlyDistribution,
        topIndustries: Object.entries(stats.analysis.industryDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([industry, count]) => ({ industry, count })),
        recentErrors: stats.analysis.topErrors
      },
      alerts: this.generateAlerts(stats, healthMetrics)
    };
  }

  generateAlerts(stats, healthMetrics) {
    const alerts = [];
    const thresholds = this.adminConfig.settings.alertThresholds;
    
    // Error rate alert
    if (healthMetrics.metrics.errorRate > thresholds.errorRate) {
      alerts.push({
        type: 'error',
        severity: 'high',
        message: `High error rate: ${healthMetrics.metrics.errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Low cache hit rate alert
    if (healthMetrics.metrics.cacheHitRate < 50 && stats.performance.cacheHits + stats.performance.cacheMisses > 10) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: `Low cache hit rate: ${healthMetrics.metrics.cacheHitRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // High processing time alert
    if (stats.performance.avgProcessingTime > thresholds.responseTime) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: `High average processing time: ${stats.performance.avgProcessingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  // Get detailed analytics for admin view
  getAnalytics(usageTracker, days = 30) {
    return usageTracker.getDetailedAnalytics(days);
  }

  // System control functions
  toggleMaintenanceMode() {
    this.adminConfig.settings.maintenanceMode = !this.adminConfig.settings.maintenanceMode;
    this.saveAdminConfig();
    
    return {
      success: true,
      maintenanceMode: this.adminConfig.settings.maintenanceMode,
      message: `Maintenance mode ${this.adminConfig.settings.maintenanceMode ? 'enabled' : 'disabled'}`
    };
  }

  updateSystemSettings(settings) {
    try {
      // Validate settings
      const validSettings = ['maxDailyRequests', 'alertThresholds', 'features'];
      const updates = {};
      
      validSettings.forEach(key => {
        if (settings[key] !== undefined) {
          updates[key] = settings[key];
        }
      });
      
      // Apply updates
      Object.assign(this.adminConfig.settings, updates);
      this.saveAdminConfig();
      
      return {
        success: true,
        message: 'System settings updated successfully',
        settings: this.adminConfig.settings
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // API Key management for admin
  createAPIKeyForUser(apiKeyManager, userInfo) {
    try {
      const result = apiKeyManager.createAPIKey(userInfo);
      
      // Log the creation
      this.logAdminAction('api_key_created', {
        userId: result.userId,
        tier: result.tier,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  updateAPIKeyTier(apiKeyManager, apiKey, newTier) {
    try {
      console.log(`Admin dashboard: Updating API key tier to ${newTier}`);
      
      // Validate inputs
      if (!apiKey || !newTier) {
        console.error('Missing required parameters: apiKey or newTier');
        return {
          success: false,
          error: 'Missing required parameters'
        };
      }

      // Validate tier
      const validTiers = ['free', 'premium', 'enterprise'];
      if (!validTiers.includes(newTier)) {
        console.error(`Invalid tier: ${newTier}. Valid tiers are: ${validTiers.join(', ')}`);
        return {
          success: false,
          error: `Invalid tier. Valid tiers are: ${validTiers.join(', ')}`
        };
      }

      const success = apiKeyManager.updateTier(apiKey, newTier);
      
      if (success) {
        this.logAdminAction('tier_updated', {
          apiKey: apiKey.substring(0, 12) + '...',
          newTier: newTier,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Successfully updated API key tier to ${newTier}`);
        return {
          success: true,
          message: `API key tier updated to ${newTier}`
        };
      } else {
        console.error('Failed to update API key tier - apiKeyManager.updateTier returned false');
        return {
          success: false,
          error: 'Failed to update API key tier. Please check server logs for details.'
        };
      }
    } catch (error) {
      console.error('Error in updateAPIKeyTier:', error);
      return {
        success: false,
        error: `Internal server error: ${error.message}`
      };
    }
  }

  // User management
  getAllUsers(apiKeyManager) {
    const apiKeys = apiKeyManager.listAPIKeys();
    
    return apiKeys.map(key => ({
      userId: key.userId,
      name: key.name,
      tier: key.tier,
      usage: key.usage,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      apiKeyPreview: key.apiKey
    }));
  }

  // Export system data
  exportSystemData(apiKeyManager, usageTracker, format = 'json') {
    const exportData = {
      exportDate: new Date().toISOString(),
      systemInfo: {
        version: '1.0',
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      analytics: usageTracker.getDetailedAnalytics(90), // 90 days
      apiKeyStats: apiKeyManager.getUsageStats(),
      systemSettings: this.adminConfig.settings,
      alerts: this.generateAlerts(usageTracker.getStats(), usageTracker.getHealthMetrics())
    };
    
    if (format === 'csv') {
      return usageTracker.exportAnalytics('csv');
    }
    
    return JSON.stringify(exportData, null, 2);
  }

  // Admin action logging
  logAdminAction(action, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: action,
      details: details
    };
    
    const logFile = path.join(__dirname, '../logs/admin-actions.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // System backup
  createSystemBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        config: this.adminConfig,
        apiKeys: fs.existsSync(path.join(this.configDir, 'api-keys.json')) 
          ? JSON.parse(fs.readFileSync(path.join(this.configDir, 'api-keys.json'), 'utf8'))
          : {},
        users: fs.existsSync(path.join(this.configDir, 'users.json'))
          ? JSON.parse(fs.readFileSync(path.join(this.configDir, 'users.json'), 'utf8'))
          : {},
        analytics: fs.existsSync(path.join(__dirname, '../logs/analytics.json'))
          ? JSON.parse(fs.readFileSync(path.join(__dirname, '../logs/analytics.json'), 'utf8'))
          : {}
      };
      
      const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      // Clean up old backups (keep last 10)
      this.cleanupOldBackups(backupDir);
      
      return {
        success: true,
        backupFile: backupFile,
        timestamp: timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  cleanupOldBackups(backupDir) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.statSync(path.join(backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Keep only the 10 most recent backups
      if (files.length > 10) {
        files.slice(10).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Get system configuration
  getSystemConfig() {
    return {
      settings: this.adminConfig.settings,
      features: this.adminConfig.settings.features,
      notifications: this.adminConfig.notifications,
      maintenanceMode: this.adminConfig.settings.maintenanceMode
    };
  }
}

module.exports = new AdminDashboard();
