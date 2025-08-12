const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const compression = require('compression');

class FileOptimizer {
  constructor() {
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.supportedFormats = ['pdf', 'doc', 'docx'];
    this.compressionLevel = 6; // Balanced compression
  }

  // Validate file before processing
  validateFile(file) {
    const errors = [];
    
    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (5MB)`);
    }
    
    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!this.supportedFormats.includes(fileExtension)) {
      errors.push(`File type '${fileExtension}' is not supported. Allowed types: ${this.supportedFormats.join(', ')}`);
    }
    
    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`MIME type '${file.mimetype}' is not supported`);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Optimize file for processing
  async optimizeFile(file) {
    try {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Create optimized file metadata
      const optimizedFile = {
        ...file,
        optimized: true,
        originalSize: file.size,
        optimizedAt: new Date().toISOString()
      };

      // For now, we'll return the file as-is since PDF/DOC compression
      // requires specialized libraries and might affect text extraction
      // In a production environment, you might want to:
      // 1. Compress PDF files using pdf-lib
      // 2. Optimize DOC/DOCX files by removing unnecessary metadata
      // 3. Convert to a standardized format for processing

      return {
        success: true,
        file: optimizedFile,
        compressionRatio: 1.0, // No compression applied
        sizeSaved: 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Compress response data
  compressResponse(data) {
    try {
      const jsonString = JSON.stringify(data);
      const originalSize = Buffer.byteLength(jsonString, 'utf8');
      
      // For large responses, we could implement gzip compression here
      // For now, we'll optimize the data structure
      const optimizedData = this.optimizeResponseData(data);
      const optimizedString = JSON.stringify(optimizedData);
      const optimizedSize = Buffer.byteLength(optimizedString, 'utf8');
      
      return {
        data: optimizedData,
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        compressionRatio: originalSize / optimizedSize,
        sizeSaved: originalSize - optimizedSize
      };
    } catch (error) {
      console.error('Response compression error:', error);
      return {
        data: data,
        error: error.message
      };
    }
  }

  // Optimize response data structure
  optimizeResponseData(data) {
    if (!data || typeof data !== 'object') return data;

    const optimized = { ...data };

    // Remove redundant or verbose data
    if (optimized.analysis) {
      // Round scores to 1 decimal place
      if (optimized.analysis.scores) {
        Object.keys(optimized.analysis.scores).forEach(key => {
          if (typeof optimized.analysis.scores[key] === 'number') {
            optimized.analysis.scores[key] = Math.round(optimized.analysis.scores[key] * 10) / 10;
          }
        });
      }

      // Limit feedback arrays to most important items
      if (optimized.analysis.feedback) {
        if (optimized.analysis.feedback.strengths) {
          optimized.analysis.feedback.strengths = optimized.analysis.feedback.strengths.slice(0, 5);
        }
        if (optimized.analysis.feedback.improvements) {
          optimized.analysis.feedback.improvements = optimized.analysis.feedback.improvements.slice(0, 5);
        }
        if (optimized.analysis.feedback.industrySpecific) {
          optimized.analysis.feedback.industrySpecific = optimized.analysis.feedback.industrySpecific.slice(0, 3);
        }
      }

      // Optimize ATS recommendations
      if (optimized.analysis.atsCompatibility && optimized.analysis.atsCompatibility.recommendations) {
        optimized.analysis.atsCompatibility.recommendations = optimized.analysis.atsCompatibility.recommendations.map(rec => ({
          category: rec.category,
          priority: rec.priority,
          suggestions: rec.suggestions.slice(0, 2) // Limit to top 2 suggestions per category
        }));
      }
    }

    return optimized;
  }

  // Create file processing statistics
  getProcessingStats(file, processingTime) {
    const stats = {
      filename: file.originalname,
      fileSize: file.size,
      fileSizeFormatted: this.formatFileSize(file.size),
      mimeType: file.mimetype,
      processingTime: processingTime,
      processingTimeFormatted: this.formatProcessingTime(processingTime),
      efficiency: this.calculateEfficiency(file.size, processingTime)
    };

    return stats;
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format processing time
  formatProcessingTime(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Calculate processing efficiency
  calculateEfficiency(fileSize, processingTime) {
    // Bytes per millisecond
    const efficiency = fileSize / processingTime;
    
    if (efficiency > 1000) {
      return 'Excellent';
    } else if (efficiency > 500) {
      return 'Good';
    } else if (efficiency > 100) {
      return 'Fair';
    } else {
      return 'Slow';
    }
  }

  // Batch file validation
  validateBatchFiles(files) {
    const results = {
      valid: [],
      invalid: [],
      totalSize: 0,
      maxBatchSize: 50 * 1024 * 1024 // 50MB total for batch
    };

    files.forEach((file, index) => {
      const validation = this.validateFile(file);
      results.totalSize += file.size;

      if (validation.isValid) {
        results.valid.push({
          index,
          file,
          size: file.size
        });
      } else {
        results.invalid.push({
          index,
          file,
          errors: validation.errors
        });
      }
    });

    // Check total batch size
    if (results.totalSize > results.maxBatchSize) {
      results.batchSizeError = `Total batch size (${this.formatFileSize(results.totalSize)}) exceeds maximum allowed (${this.formatFileSize(results.maxBatchSize)})`;
    }

    results.isValidBatch = results.invalid.length === 0 && !results.batchSizeError;

    return results;
  }

  // Get optimization recommendations
  getOptimizationRecommendations(file) {
    const recommendations = [];
    
    if (file.size > 3 * 1024 * 1024) { // > 3MB
      recommendations.push({
        type: 'size',
        priority: 'medium',
        message: 'Consider reducing file size for faster processing',
        suggestion: 'Save as PDF with standard compression or remove unnecessary images'
      });
    }

    if (file.originalname.length > 100) {
      recommendations.push({
        type: 'filename',
        priority: 'low',
        message: 'Filename is very long',
        suggestion: 'Use shorter, descriptive filenames'
      });
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (fileExtension === '.doc') {
      recommendations.push({
        type: 'format',
        priority: 'low',
        message: 'Consider using newer format',
        suggestion: 'Save as .docx or .pdf for better compatibility'
      });
    }

    return recommendations;
  }

  // Memory usage monitoring
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: this.formatFileSize(usage.rss),
      heapTotal: this.formatFileSize(usage.heapTotal),
      heapUsed: this.formatFileSize(usage.heapUsed),
      external: this.formatFileSize(usage.external),
      arrayBuffers: this.formatFileSize(usage.arrayBuffers)
    };
  }
}

module.exports = new FileOptimizer();
