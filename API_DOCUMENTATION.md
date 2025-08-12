# Resume Screener API Documentation

## Overview

The Resume Screener API provides AI-powered resume analysis with business features including API key management, usage tracking, and admin dashboard capabilities. The system uses file-based storage without requiring a persistent database.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All analysis endpoints require an API key in the request headers:
```
X-API-Key: your-api-key-here
```

## API Endpoints

### 1. Resume Analysis

#### Analyze Resume
**POST** `/analyze-resume`

Analyzes a resume file and returns detailed scoring and feedback.

**Headers:**
- `X-API-Key: string` (required)
- `Content-Type: multipart/form-data`

**Body:**
- `resume: file` (PDF, DOC, or DOCX)

**Response:**
```json
{
  "score": 8.5,
  "feedback": "Overall strong resume with good structure...",
  "breakdown": {
    "content": { "score": 9, "feedback": "..." },
    "structure": { "score": 8, "feedback": "..." },
    "formatting": { "score": 8, "feedback": "..." },
    "industryAlignment": { "score": 9, "feedback": "..." },
    "length": { "score": 8, "feedback": "..." }
  },
  "industryAnalysis": {
    "detectedIndustry": "Technology",
    "score": 9.2,
    "feedback": "...",
    "keywordMatches": ["JavaScript", "React", "Node.js"],
    "missingSkills": ["Docker", "Kubernetes"]
  },
  "atsCompatibility": {
    "score": 7.8,
    "isATSFriendly": true,
    "issues": [],
    "recommendations": ["Use standard section headers"]
  }
}
```

#### Bulk Analysis
**POST** `/bulk-analyze`

Analyzes multiple resumes asynchronously.

**Headers:**
- `X-API-Key: string` (required)
- `Content-Type: multipart/form-data`

**Body:**
- `resumes: file[]` (Multiple resume files)

**Response:**
```json
{
  "jobId": "job_12345",
  "status": "queued",
  "totalFiles": 5,
  "message": "Bulk analysis job created successfully"
}
```

#### Check Job Status
**GET** `/job/:jobId/status`

**Response:**
```json
{
  "jobId": "job_12345",
  "status": "completed",
  "progress": {
    "total": 5,
    "completed": 5,
    "failed": 0
  },
  "results": [...],
  "completedAt": "2024-01-15T10:30:00Z"
}
```

### 2. API Key Management

#### Create API Key
**POST** `/keys/create`

Creates a new API key for a user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "tier": "free"
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": "rsa_1234567890abcdef",
  "userId": "user_abc123",
  "tier": "free",
  "quota": {
    "daily": 10,
    "monthly": 100
  }
}
```

#### Get API Key Info
**GET** `/keys/:apiKey/info`

**Headers:**
- `X-API-Key: string` (required)

**Response:**
```json
{
  "userId": "user_abc123",
  "name": "John Doe",
  "tier": "free",
  "usage": {
    "current": 5,
    "limit": 10,
    "resetDate": "2024-01-16T00:00:00Z"
  },
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Upgrade Tier
**POST** `/keys/:apiKey/upgrade`

**Headers:**
- `X-API-Key: string` (required)

**Body:**
```json
{
  "tier": "premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upgraded to premium tier"
}
```

### 3. Usage & Analytics

#### Get Usage Stats
**GET** `/usage/stats`

**Headers:**
- `X-API-Key: string` (required)

**Response:**
```json
{
  "user": {
    "tier": "free",
    "usage": {
      "current": 5,
      "limit": 10,
      "resetDate": "2024-01-16T00:00:00Z"
    }
  },
  "system": {
    "totalRequests": 1250,
    "successRate": 96.5,
    "avgProcessingTime": 2340
  }
}
```

#### Export Analytics
**GET** `/usage/export?format=json`

**Headers:**
- `X-API-Key: string` (required)

**Query Parameters:**
- `format: string` (json or csv)

Returns downloadable analytics data.

### 4. System Health

#### Health Check
**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "system": {
    "uptime": 86400,
    "memory": {
      "used": 125829120,
      "total": 268435456
    },
    "version": "1.0",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "metrics": {
    "currentHourRequests": 25,
    "previousHourRequests": 18,
    "errorRate": 2.1,
    "cacheHitRate": 78.5
  }
}
```

## Admin Endpoints

Admin endpoints require authentication via login.

### Admin Login
**POST** `/admin/login`

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Admin Dashboard
**GET** `/admin/dashboard`

Returns comprehensive system overview including:
- System health metrics
- Usage statistics
- API key statistics
- Recent activity
- System alerts

### Admin Analytics
**GET** `/admin/analytics?days=30`

**Query Parameters:**
- `days: number` (default: 30)

Returns detailed analytics for the specified period.

### User Management
**GET** `/admin/users`

Returns list of all users with their API keys and usage statistics.

### Create API Key (Admin)
**POST** `/admin/keys/create`

**Body:**
```json
{
  "name": "Company User",
  "email": "user@company.com",
  "tier": "enterprise"
}
```

### Update API Key Tier (Admin)
**PUT** `/admin/keys/:apiKey/tier`

**Body:**
```json
{
  "tier": "premium"
}
```

### System Controls
**POST** `/admin/maintenance/toggle`

Toggles maintenance mode on/off.

**PUT** `/admin/settings`

**Body:**
```json
{
  "maxDailyRequests": 2000,
  "alertThresholds": {
    "errorRate": 15,
    "responseTime": 6000
  }
}
```

### Export System Data
**GET** `/admin/export?format=json`

**Query Parameters:**
- `format: string` (json or csv)

### Create System Backup
**POST** `/admin/backup`

Creates a backup of all system configuration and data files.

## Service Tiers

### Free Tier
- 10 analyses per day
- 100 analyses per month
- Basic support
- Standard processing priority

### Premium Tier
- 100 analyses per day
- 1,000 analyses per month
- Priority support
- High processing priority
- Advanced analytics

### Enterprise Tier
- 1,000 analyses per day
- 10,000 analyses per month
- Dedicated support
- Highest processing priority
- Custom integrations
- Bulk processing

## Rate Limits

- **Analysis endpoints**: 10 requests per minute
- **Bulk analysis**: 2 requests per minute
- **General endpoints**: 60 requests per minute
- **Admin endpoints**: 30 requests per minute

## Error Codes

### 400 Bad Request
- Invalid file format
- Missing required fields
- File too large

### 401 Unauthorized
- Missing API key
- Invalid API key
- Expired API key

### 429 Too Many Requests
- Rate limit exceeded
- Quota exceeded

### 500 Internal Server Error
- Server processing error
- AI service unavailable

## File Requirements

### Supported Formats
- PDF (.pdf)
- Microsoft Word (.doc, .docx)

### File Size Limits
- Free tier: 5MB per file
- Premium tier: 10MB per file
- Enterprise tier: 20MB per file

### Bulk Analysis Limits
- Free tier: 5 files per batch
- Premium tier: 20 files per batch
- Enterprise tier: 100 files per batch

## Admin Dashboard

Access the admin dashboard at:
```
http://localhost:5000/admin.html
```

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

**Features:**
- System health monitoring
- User management
- API key creation and management
- Usage analytics and reporting
- System configuration
- Data export and backup

## Integration Examples

### JavaScript/Node.js
```javascript
const FormData = require('form-data');
const fs = require('fs');

const analyzeResume = async (filePath, apiKey) => {
  const form = new FormData();
  form.append('resume', fs.createReadStream(filePath));
  
  const response = await fetch('http://localhost:5000/api/analyze-resume', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      ...form.getHeaders()
    },
    body: form
  });
  
  return await response.json();
};
```

### Python
```python
import requests

def analyze_resume(file_path, api_key):
    with open(file_path, 'rb') as file:
        files = {'resume': file}
        headers = {'X-API-Key': api_key}
        
        response = requests.post(
            'http://localhost:5000/api/analyze-resume',
            files=files,
            headers=headers
        )
        
        return response.json()
```

### cURL
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "resume=@/path/to/resume.pdf" \
  http://localhost:5000/api/analyze-resume
```

## Support

For technical support or questions about the API:
- Check the system health endpoint for service status
- Review error messages and status codes
- Contact admin through the dashboard for enterprise support

## Security

- API keys should be kept secure and not exposed in client-side code
- Use HTTPS in production environments
- Regularly rotate API keys for enhanced security
- Monitor usage through the dashboard for unusual activity
