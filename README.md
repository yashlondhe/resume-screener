# Resume Screener

An AI-powered resume screening application that analyzes and rates resumes based on multiple criteria including content quality, structure, formatting, completeness, and length appropriateness.

## Features

- **File Upload**: Supports PDF, DOC, and DOCX resume formats
- **AI Analysis**: Uses OpenAI GPT for intelligent resume evaluation
- **Comprehensive Scoring**: Rates resumes on 5 key criteria (1-10 scale)
- **Detailed Feedback**: Provides strengths, improvements, and actionable insights
- **Modern UI**: Clean, responsive interface with drag-and-drop functionality
- **Real-time Processing**: Instant analysis with progress indicators

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
