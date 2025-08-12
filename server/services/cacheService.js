const NodeCache = require('node-cache');
const crypto = require('crypto');

class CacheService {
  constructor() {
    // In-memory cache with TTL (Time To Live)
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default TTL
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance, but be careful with object mutations
    });

    // Redis cache (optional, falls back to memory cache)
    this.redisClient = null;
    this.initializeRedis();
  }

  async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });

        this.redisClient.on('error', (err) => {
          console.warn('Redis connection error, falling back to memory cache:', err.message);
          this.redisClient = null;
        });

        this.redisClient.on('connect', () => {
          console.log('Redis cache connected successfully');
        });

        await this.redisClient.connect();
      } catch (error) {
        console.warn('Redis not available, using memory cache:', error.message);
        this.redisClient = null;
      }
    }
  }

  // Generate cache key from resume content
  generateCacheKey(text, prefix = 'resume') {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return `${prefix}:${hash}`;
  }

  // Get from cache
  async get(key) {
    try {
      // Try Redis first if available
      if (this.redisClient && this.redisClient.isOpen) {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }

      // Fall back to memory cache
      return this.memoryCache.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache
  async set(key, value, ttl = 3600) {
    try {
      // Set in Redis if available
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      }

      // Always set in memory cache as backup
      this.memoryCache.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.del(key);
      }
      this.memoryCache.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        return await this.redisClient.exists(key);
      }
      return this.memoryCache.has(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0
      },
      redis: {
        connected: this.redisClient && this.redisClient.isOpen,
        url: process.env.REDIS_URL ? 'configured' : 'not configured'
      }
    };
  }

  // Clear all cache
  async flush() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.flushAll();
      }
      this.memoryCache.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache resume analysis results
  async cacheResumeAnalysis(resumeText, analysis) {
    const key = this.generateCacheKey(resumeText, 'analysis');
    return await this.set(key, {
      analysis,
      timestamp: Date.now(),
      version: '1.0'
    }, 7200); // Cache for 2 hours
  }

  // Get cached resume analysis
  async getCachedResumeAnalysis(resumeText) {
    const key = this.generateCacheKey(resumeText, 'analysis');
    const cached = await this.get(key);
    
    if (cached && cached.analysis) {
      // Add cache hit indicator
      cached.analysis.cached = true;
      cached.analysis.cacheTimestamp = cached.timestamp;
      return cached.analysis;
    }
    
    return null;
  }

  // Cache industry detection results
  async cacheIndustryDetection(resumeText, industryData) {
    const key = this.generateCacheKey(resumeText, 'industry');
    return await this.set(key, industryData, 86400); // Cache for 24 hours
  }

  // Get cached industry detection
  async getCachedIndustryDetection(resumeText) {
    const key = this.generateCacheKey(resumeText, 'industry');
    return await this.get(key);
  }

  // Cache ATS compatibility results
  async cacheATSCompatibility(resumeText, atsData) {
    const key = this.generateCacheKey(resumeText, 'ats');
    return await this.set(key, atsData, 86400); // Cache for 24 hours
  }

  // Get cached ATS compatibility
  async getCachedATSCompatibility(resumeText) {
    const key = this.generateCacheKey(resumeText, 'ats');
    return await this.get(key);
  }

  // Cleanup expired keys (for memory cache)
  cleanup() {
    this.memoryCache.flushAll();
    console.log('Cache cleanup completed');
  }
}

// Export singleton instance
module.exports = new CacheService();
