# 🚀 Resume Screener - Production Deployment Guide

## Overview
This guide covers deploying the AI-powered Resume Screening application to production using free services.

## 📋 Prerequisites

### Required Accounts (All Free)
- [GitHub](https://github.com) - Source code repository
- [Vercel](https://vercel.com) - Frontend hosting
- [Railway](https://railway.app) - Backend hosting
- [OpenAI](https://openai.com) - API key for AI analysis

### Required Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `REACT_APP_API_URL` - Backend URL (Railway deployment URL)

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions │───▶│   Deployments   │
│                 │    │     (CI/CD)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │                 │
                                              ▼                 ▼
                                    ┌─────────────────┐ ┌─────────────────┐
                                    │     Vercel      │ │    Railway      │
                                    │   (Frontend)    │ │   (Backend)     │
                                    │                 │ │                 │
                                    └─────────────────┘ └─────────────────┘
```

## 🔧 Step-by-Step Deployment

### 1. Prepare Repository

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Resume Screener v1.0"

# Create GitHub repository and push
git remote add origin https://github.com/yashlondhe/resume-screener.git
git branch -M main
git push -u origin main
```

### 2. Deploy Backend to Railway

1. **Sign up/Login to Railway**
   - Visit [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `resume-screener` repository

3. **Configure Environment Variables**
   ```
   NODE_ENV=production
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key_here
   CLIENT_URL=https://your-app-name.vercel.app
   ADMIN_PASSWORD=your_secure_admin_password
   ```

4. **Deploy Settings**
   - Root Directory: `/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`

5. **Get Railway URL**
   - Copy your Railway deployment URL (e.g., `https://your-app.railway.app`)

### 3. Deploy Frontend to Vercel

1. **Sign up/Login to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Set Root Directory to `client`

3. **Configure Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend-app.railway.app
   REACT_APP_VERSION=1.0.0
   REACT_APP_ENVIRONMENT=production
   ```

4. **Build Settings**
   - Framework Preset: Create React App
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `build`

### 4. Configure GitHub Actions (CI/CD)

1. **Add Repository Secrets**
   Go to GitHub Repository → Settings → Secrets and variables → Actions

   Add these secrets:
   ```
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_org_id
   VERCEL_PROJECT_ID=your_project_id
   RAILWAY_TOKEN=your_railway_token
   RAILWAY_SERVICE=your_service_id
   REACT_APP_API_URL=https://your-backend-app.railway.app
   ```

2. **Get Required Tokens**
   
   **Vercel Token:**
   - Go to Vercel Dashboard → Settings → Tokens
   - Create new token

   **Railway Token:**
   - Go to Railway Dashboard → Account Settings → Tokens
   - Create new token

### 5. Update Environment URLs

1. **Update Backend CORS**
   - In Railway dashboard, update `CLIENT_URL` to your Vercel URL

2. **Update Frontend API URL**
   - In Vercel dashboard, update `REACT_APP_API_URL` to your Railway URL

## 🔒 Production Security Checklist

- [ ] Change default admin password
- [ ] Set strong `ADMIN_PASSWORD` environment variable
- [ ] Enable HTTPS (automatic with Vercel/Railway)
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting (already configured)
- [ ] Enable security headers (Helmet configured)
- [ ] Validate all environment variables are set

## 📊 Monitoring & Maintenance

### Health Checks
- **Frontend**: Automatic Vercel monitoring
- **Backend**: Railway health checks + `/api/health` endpoint
- **Admin Dashboard**: `https://your-backend-app.railway.app/admin.html`

### Logs
- **Frontend**: Vercel Dashboard → Functions → Logs
- **Backend**: Railway Dashboard → Deployments → Logs

### Analytics
- Access admin dashboard for system analytics
- Monitor API usage and performance metrics
- Track user registrations and tier usage

## 🚀 Going Live

1. **Test Deployment**
   ```bash
   # Test backend health
   curl https://your-backend-app.railway.app/api/health
   
   # Test frontend
   curl https://your-frontend-app.vercel.app
   ```

2. **Verify Features**
   - [ ] User registration and API key creation
   - [ ] Resume upload and analysis
   - [ ] Admin dashboard access
   - [ ] API key management
   - [ ] Tier-based features

3. **Custom Domain (Optional)**
   - Configure custom domain in Vercel
   - Update CORS settings in Railway

## 💰 Cost Breakdown (Free Tier Limits)

### Vercel (Frontend)
- ✅ **Free**: 100GB bandwidth/month
- ✅ **Free**: Unlimited static deployments
- ✅ **Free**: Custom domain + SSL

### Railway (Backend)
- ✅ **Free**: $5 credit/month
- ✅ **Free**: 500 hours runtime
- ✅ **Free**: 1GB RAM, 1 vCPU

### GitHub Actions
- ✅ **Free**: 2,000 minutes/month
- ✅ **Free**: Unlimited public repositories

## 🔧 Troubleshooting

### Common Issues

**Backend not starting:**
- Check Railway logs for errors
- Verify environment variables are set
- Ensure OpenAI API key is valid

**Frontend API calls failing:**
- Verify `REACT_APP_API_URL` is correct
- Check CORS configuration in backend
- Ensure backend is deployed and healthy

**Admin dashboard not accessible:**
- Check admin password is set
- Verify backend deployment is successful
- Test `/api/health` endpoint

### Support
- Check deployment logs in respective dashboards
- Use admin dashboard system health monitoring
- Monitor error rates and performance metrics

## 🎉 Success!

Your Resume Screener application is now live in production with:
- ✅ Automatic deployments via GitHub Actions
- ✅ Professional UI with tier-based features
- ✅ AI-powered resume analysis
- ✅ Admin dashboard for system management
- ✅ Free hosting with SSL certificates
- ✅ Monitoring and analytics

**Frontend URL**: `https://your-app-name.vercel.app`
**Backend URL**: `https://your-backend-app.railway.app`
**Admin Dashboard**: `https://your-backend-app.railway.app/admin.html`
