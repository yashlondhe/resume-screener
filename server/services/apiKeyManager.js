const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class APIKeyManager {
  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.apiKeysFile = path.join(this.configDir, 'api-keys.json');
    this.usersFile = path.join(this.configDir, 'users.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    // Initialize files if they don't exist
    this.initializeFiles();
    
    // Load data into memory
    this.apiKeys = this.loadAPIKeys();
    this.users = this.loadUsers();
  }

  initializeFiles() {
    // Initialize API keys file
    if (!fs.existsSync(this.apiKeysFile)) {
      const defaultKeys = {
        keys: {},
        created: new Date().toISOString(),
        version: '1.0'
      };
      fs.writeFileSync(this.apiKeysFile, JSON.stringify(defaultKeys, null, 2));
    }

    // Initialize users file
    if (!fs.existsSync(this.usersFile)) {
      const defaultUsers = {
        users: {},
        created: new Date().toISOString(),
        version: '1.0'
      };
      fs.writeFileSync(this.usersFile, JSON.stringify(defaultUsers, null, 2));
    }
  }

  loadAPIKeys() {
    try {
      const data = fs.readFileSync(this.apiKeysFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading API keys:', error);
      return { keys: {}, created: new Date().toISOString(), version: '1.0' };
    }
  }

  loadUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading users:', error);
      return { users: {}, created: new Date().toISOString(), version: '1.0' };
    }
  }

  saveAPIKeys() {
    try {
      this.apiKeys.lastModified = new Date().toISOString();
      fs.writeFileSync(this.apiKeysFile, JSON.stringify(this.apiKeys, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      return false;
    }
  }

  saveUsers() {
    try {
      this.users.lastModified = new Date().toISOString();
      fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  }

  // Generate a new API key
  generateAPIKey(prefix = 'rsk') {
    const randomBytes = crypto.randomBytes(32);
    const key = `${prefix}_${randomBytes.toString('hex')}`;
    return key;
  }

  // Create a new API key for a user
  createAPIKey(userInfo) {
    const apiKey = this.generateAPIKey();
    const keyData = {
      key: apiKey,
      userId: userInfo.userId || `user_${Date.now()}`,
      name: userInfo.name || 'Anonymous User',
      email: userInfo.email || null,
      tier: userInfo.tier || 'free', // free, premium, enterprise
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true,
      limits: this.getTierLimits(userInfo.tier || 'free'),
      usage: {
        totalRequests: 0,
        dailyRequests: 0,
        monthlyRequests: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      }
    };

    // Store API key
    this.apiKeys.keys[apiKey] = keyData;
    
    // Store user info
    this.users.users[keyData.userId] = {
      userId: keyData.userId,
      name: keyData.name,
      email: keyData.email,
      tier: keyData.tier,
      apiKeys: [apiKey],
      createdAt: keyData.createdAt,
      isActive: true
    };

    // Save to files
    this.saveAPIKeys();
    this.saveUsers();

    return {
      success: true,
      apiKey: apiKey,
      userId: keyData.userId,
      tier: keyData.tier,
      limits: keyData.limits
    };
  }

  // Get tier-based limits
  getTierLimits(tier) {
    const limits = {
      free: {
        dailyRequests: 10,
        monthlyRequests: 100,
        bulkAnalysis: false,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxBatchSize: 1,
        features: ['basic_analysis', 'industry_detection', 'ats_check']
      },
      premium: {
        dailyRequests: 100,
        monthlyRequests: 2000,
        bulkAnalysis: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxBatchSize: 5,
        features: ['basic_analysis', 'industry_detection', 'ats_check', 'detailed_feedback', 'export_results']
      },
      enterprise: {
        dailyRequests: 1000,
        monthlyRequests: 20000,
        bulkAnalysis: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxBatchSize: 20,
        features: ['basic_analysis', 'industry_detection', 'ats_check', 'detailed_feedback', 'export_results', 'api_access', 'priority_support']
      }
    };

    return limits[tier] || limits.free;
  }

  // Validate API key and check limits
  validateAPIKey(apiKey) {
    const keyData = this.apiKeys.keys[apiKey];
    
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!keyData.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }

    // Check daily limits
    const today = new Date().toISOString().split('T')[0];
    if (keyData.usage.lastResetDate !== today) {
      // Reset daily counter
      keyData.usage.dailyRequests = 0;
      keyData.usage.lastResetDate = today;
    }

    if (keyData.usage.dailyRequests >= keyData.limits.dailyRequests) {
      return { 
        valid: false, 
        error: 'Daily request limit exceeded',
        limits: keyData.limits,
        usage: keyData.usage
      };
    }

    // Check monthly limits
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const lastUsedMonth = keyData.usage.lastResetDate.substring(0, 7);
    
    if (currentMonth !== lastUsedMonth) {
      // Reset monthly counter
      keyData.usage.monthlyRequests = 0;
    }

    if (keyData.usage.monthlyRequests >= keyData.limits.monthlyRequests) {
      return { 
        valid: false, 
        error: 'Monthly request limit exceeded',
        limits: keyData.limits,
        usage: keyData.usage
      };
    }

    return {
      valid: true,
      keyData: keyData,
      user: this.users.users[keyData.userId]
    };
  }

  // Record API usage
  recordUsage(apiKey, requestType = 'analysis') {
    const keyData = this.apiKeys.keys[apiKey];
    if (!keyData) return false;

    // Update usage counters
    keyData.usage.totalRequests += 1;
    keyData.usage.dailyRequests += 1;
    keyData.usage.monthlyRequests += 1;
    keyData.lastUsed = new Date().toISOString();

    // Save to file (async to avoid blocking)
    setImmediate(() => {
      this.saveAPIKeys();
    });

    return true;
  }

  // Get API key info
  getAPIKeyInfo(apiKey) {
    const keyData = this.apiKeys.keys[apiKey];
    if (!keyData) return null;

    const user = this.users.users[keyData.userId];
    
    return {
      apiKey: apiKey,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        tier: user.tier
      },
      limits: keyData.limits,
      usage: keyData.usage,
      createdAt: keyData.createdAt,
      lastUsed: keyData.lastUsed,
      isActive: keyData.isActive
    };
  }

  // List all API keys (admin function)
  listAPIKeys() {
    const keys = [];
    Object.values(this.apiKeys.keys).forEach(keyData => {
      const user = this.users.users[keyData.userId];
      keys.push({
        apiKey: keyData.key.substring(0, 12) + '...',
        userId: keyData.userId,
        name: user.name,
        tier: keyData.tier,
        usage: keyData.usage,
        isActive: keyData.isActive,
        createdAt: keyData.createdAt,
        lastUsed: keyData.lastUsed
      });
    });
    return keys;
  }

  // Update API key status
  updateAPIKeyStatus(apiKey, isActive) {
    const keyData = this.apiKeys.keys[apiKey];
    if (!keyData) return false;

    keyData.isActive = isActive;
    keyData.lastModified = new Date().toISOString();
    
    return this.saveAPIKeys();
  }

  // Upgrade/downgrade tier
  updateTier(apiKey, newTier) {
    const keyData = this.apiKeys.keys[apiKey];
    if (!keyData) return false;

    const user = this.users.users[keyData.userId];
    if (!user) return false;

    keyData.tier = newTier;
    keyData.limits = this.getTierLimits(newTier);
    keyData.lastModified = new Date().toISOString();

    user.tier = newTier;
    user.lastModified = new Date().toISOString();

    this.saveAPIKeys();
    this.saveUsers();

    return true;
  }

  // Get usage statistics
  getUsageStats() {
    const stats = {
      totalKeys: Object.keys(this.apiKeys.keys).length,
      activeKeys: 0,
      tiers: { free: 0, premium: 0, enterprise: 0 },
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0
    };

    const today = new Date().toISOString().split('T')[0];

    Object.values(this.apiKeys.keys).forEach(keyData => {
      if (keyData.isActive) {
        stats.activeKeys++;
      }
      
      stats.tiers[keyData.tier] = (stats.tiers[keyData.tier] || 0) + 1;
      stats.totalRequests += keyData.usage.totalRequests;
      
      if (keyData.usage.lastResetDate === today) {
        stats.dailyRequests += keyData.usage.dailyRequests;
      }
      
      stats.monthlyRequests += keyData.usage.monthlyRequests;
    });

    return stats;
  }

  // Clean up expired or inactive keys
  cleanup() {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months ago

    let cleanedCount = 0;
    Object.keys(this.apiKeys.keys).forEach(apiKey => {
      const keyData = this.apiKeys.keys[apiKey];
      const lastUsed = new Date(keyData.lastUsed || keyData.createdAt);
      
      if (!keyData.isActive && lastUsed < cutoffDate) {
        delete this.apiKeys.keys[apiKey];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.saveAPIKeys();
      console.log(`Cleaned up ${cleanedCount} inactive API keys`);
    }

    return cleanedCount;
  }
}

module.exports = new APIKeyManager();
