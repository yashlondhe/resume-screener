# 🎯 AI-Powered Resume Screener

> **Production-Ready** | **Full-Stack** | **AI-Powered** | **No Database Required**

An AI-powered resume screening application that uses AI to analyze and rate resumes based on multiple criteria including content quality, structure, formatting, completeness, and length appropriateness.

![Resume Screener](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Node](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-19+-blue)
 
## ✨ Features

### 🎨 **Professional UI/UX**
- **Tier-Based Design**: Bronze/Silver/Gold color scheme for Free/Premium/Enterprise users
- **Modern Interface**: Clean, responsive design with drag-and-drop functionality
- **User Authentication**: Complete API key management and user registration system
- **Profile Management**: Dropdown with API key access, user info, and account settings

### 🤖 **AI-Powered Analysis**
- **Advanced AI**: Uses OpenAI GPT for intelligent resume evaluation
- **Industry-Specific**: Tailored scoring for different industries
- **ATS Compatibility**: Checks resume compatibility with Applicant Tracking Systems
- **Comprehensive Scoring**: Rates resumes on 5 key criteria (1-10 scale)
- **Detailed Feedback**: Provides strengths, improvements, and actionable insights

### 🏢 **Business Features**
- **Tiered Service**: Free, Premium, and Enterprise plans with usage quotas
- **API Key Management**: Complete user lifecycle with registration and key management
- **Usage Tracking**: Real-time analytics and usage monitoring
- **Admin Dashboard**: Full system management with health monitoring
- **Rate Limiting**: Intelligent rate limiting per user tier

### 🚀 **Production Features**
- **No Database Required**: File-based storage and in-memory analytics
- **CI/CD Ready**: GitHub Actions workflow for automated deployments
- **Free Hosting**: Configured for Vercel (frontend) and Railway (backend)
- **Monitoring**: System health checks and performance metrics
- **Security**: Helmet security, CORS, CSP compliance

## Tech Stack

### Frontend
- React.js 19
- Axios for API calls
- React Dropzone for file uploads
- Lucide React for icons
- Modern CSS with glassmorphism design

### Backend
- Node.js with Express
- Multer for file handling
- PDF-parse for PDF text extraction
- Mammoth for Word document parsing
- OpenAI API for AI analysis
- Security middleware (Helmet, CORS, Rate limiting)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-screener
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create an account and generate an API key
   - Add the key to your `.env` file

## Usage

1. **Start the development servers**
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 5000) and React frontend (port 3000)

2. **Access the application**
   - Open your browser to `http://localhost:3000`
   - Upload a resume file (PDF, DOC, or DOCX)
   - Wait for AI analysis
   - View detailed scoring and feedback

## API Endpoints

### `POST /api/analyze-resume`
Analyzes an uploaded resume file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with 'resume' file field

**Response:**
```json
{
  "success": true,
  "filename": "resume.pdf",
  "analysis": {
    "overallScore": 8,
    "scores": {
      "content": 8,
      "structure": 7,
      "formatting": 9,
      "completeness": 8,
      "length": 9
    },
    "feedback": {
      "strengths": ["Clear work experience", "Professional formatting"],
      "improvements": ["Add more quantified achievements"],
      "summary": "Strong resume with good structure and content"
    },
    "metrics": {
      "wordCount": 450,
      "estimatedPages": 1,
      "sectionsFound": ["experience", "education", "skills"]
    }
  }
}
```

## Scoring Criteria

The AI evaluates resumes based on:

1. **Content Quality (1-10)**
   - Relevant work experience
   - Quantified achievements
   - Skills alignment
   - Professional accomplishments

2. **Structure & Organization (1-10)**
   - Clear section divisions
   - Logical information flow
   - Proper hierarchy
   - Easy navigation

3. **Formatting & Presentation (1-10)**
   - Professional appearance
   - Consistent styling
   - Readability
   - Visual appeal

4. **Completeness (1-10)**
   - Essential sections present
   - Contact information
   - Work history
   - Education details

5. **Length Appropriateness (1-10)**
   - Optimal page count (1-2 pages ideal)
   - Content density
   - Conciseness vs. detail balance

## Security Features

- File type validation (PDF, DOC, DOCX only)
- File size limits (5MB maximum)
- Rate limiting (10 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input sanitization

## Development

### Project Structure
```
resume-screener/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js         # Main app component
│   │   └── App.css        # Styling
├── server/                # Node.js backend
│   ├── services/          # Business logic
│   ├── uploads/           # Temporary file storage
│   ├── index.js          # Server entry point
│   └── .env              # Environment variables
└── package.json          # Root package.json
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the React frontend
- `npm run build` - Build the React app for production
- `npm run install-all` - Install dependencies for both frontend and backend

## Environment Variables

Create a `.env` file in the `server` directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

## Deployment

### 🚀 Quick Deployment

#### One-Click Production Setup
```bash
# Run the automated deployment script
./deploy.sh
```

#### Manual Deployment Steps

1. **Prepare for Production**
   ```bash
   # Install dependencies and run tests
   cd server && npm install && npm test
   cd ../client && npm install && npm test
   ```

2. **Deploy Backend (Railway)**
   - Visit [railway.app](https://railway.app) and connect GitHub
   - Import repository, set root directory to `server`
   - Add environment variables:
     ```
     OPENAI_API_KEY=your_openai_key
     CLIENT_URL=https://your-app.vercel.app
     ADMIN_PASSWORD=your_secure_password
     ```

3. **Deploy Frontend (Vercel)**
   - Visit [vercel.com](https://vercel.com) and import GitHub repository
   - Set root directory to `client`
   - Add environment variable:
     ```
     REACT_APP_API_URL=https://your-backend.railway.app
     ```

4. **Access Your Application**
   - **Frontend**: `https://your-app.vercel.app`
   - **Admin Dashboard**: `https://your-backend.railway.app/admin.html`

📚 **Detailed Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions.

### 💰 Cost Breakdown (Free Tier)

| Service | Free Tier Limits | Cost |
|---------|------------------|------|
| **Vercel** | 100GB bandwidth, unlimited deployments | $0/month |
| **Railway** | $5 credit, 500 hours runtime | $0/month |
| **GitHub Actions** | 2,000 minutes CI/CD | $0/month |
| **OpenAI API** | Pay per use (typically $1-5/month) | ~$1-5/month |

**Total Monthly Cost**: ~$1-5 (OpenAI API usage only)

### 📊 System Status

#### Health Monitoring
The admin dashboard provides real-time system status:
- 🟢 **Healthy**: Error rate < 20%, normal operation
- 🟡 **Warning**: Error rate 20-50%, monitoring required  
- 🔴 **Critical**: Error rate > 50%, immediate attention needed
- ⚪ **Idle**: No recent activity, system ready

#### Performance Metrics
- Request volume and success rates
- Cache hit rates and response times
- Memory usage and system uptime
- User analytics and API usage tracking

## Fallback Analysis

If OpenAI API is not available or fails, the application uses a rule-based fallback analysis system that evaluates:
- Word count and content density
- Section presence and organization
- Formatting indicators (bullet points, contact info)
- Length appropriateness

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section below
2. Review the API documentation
3. Create an issue on GitHub

## Troubleshooting

**Common Issues:**

1. **"Failed to analyze resume"**
   - Check your OpenAI API key is valid
   - Ensure you have API credits
   - Verify file format is supported

2. **File upload fails**
   - Check file size (max 5MB)
   - Ensure file type is PDF, DOC, or DOCX
   - Try a different file

3. **Server won't start**
   - Check if port 5000 is available
   - Verify all dependencies are installed
   - Check environment variables

4. **Frontend won't connect to backend**
   - Ensure backend is running on port 5000
   - Check CORS settings
   - Verify API endpoints are correct
