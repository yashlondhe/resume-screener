#!/bin/bash

# Resume Screener - Production Deployment Script
echo "🚀 Resume Screener - Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "All dependencies are installed."
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install server dependencies
    print_status "Installing server dependencies..."
    cd server
    npm install
    if [ $? -eq 0 ]; then
        print_success "Server dependencies installed."
    else
        print_error "Failed to install server dependencies."
        exit 1
    fi
    cd ..
    
    # Install client dependencies
    print_status "Installing client dependencies..."
    cd client
    npm install
    if [ $? -eq 0 ]; then
        print_success "Client dependencies installed."
    else
        print_error "Failed to install client dependencies."
        exit 1
    fi
    cd ..
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test server
    print_status "Testing server..."
    cd server
    npm test
    if [ $? -eq 0 ]; then
        print_success "Server tests passed."
    else
        print_warning "Server tests failed or not configured."
    fi
    cd ..
    
    # Test client
    print_status "Testing client..."
    cd client
    npm test -- --coverage --watchAll=false
    if [ $? -eq 0 ]; then
        print_success "Client tests passed."
    else
        print_warning "Client tests failed or not configured."
    fi
    cd ..
}

# Build production assets
build_production() {
    print_status "Building production assets..."
    
    cd client
    npm run build
    if [ $? -eq 0 ]; then
        print_success "Production build completed."
    else
        print_error "Production build failed."
        exit 1
    fi
    cd ..
}

# Initialize git repository
init_git() {
    print_status "Initializing Git repository..."
    
    if [ ! -d ".git" ]; then
        git init
        print_success "Git repository initialized."
    else
        print_success "Git repository already exists."
    fi
    
    # Add all files
    git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        print_warning "No changes to commit."
    else
        git commit -m "Production deployment setup - Resume Screener v1.0"
        print_success "Changes committed to Git."
    fi
}

# Display deployment instructions
show_deployment_instructions() {
    echo ""
    echo "🎉 Production Setup Complete!"
    echo "=============================="
    echo ""
    echo "Next steps for deployment:"
    echo ""
    echo "1. 📁 Push to GitHub:"
    echo "   git remote add origin https://github.com/yourusername/resume-screener.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "2. 🚀 Deploy Backend (Railway):"
    echo "   - Visit: https://railway.app"
    echo "   - Connect GitHub and select this repository"
    echo "   - Set root directory to: server"
    echo "   - Add environment variables:"
    echo "     * OPENAI_API_KEY=your_openai_key"
    echo "     * CLIENT_URL=https://your-app.vercel.app"
    echo "     * ADMIN_PASSWORD=your_secure_password"
    echo ""
    echo "3. 🌐 Deploy Frontend (Vercel):"
    echo "   - Visit: https://vercel.com"
    echo "   - Import GitHub repository"
    echo "   - Set root directory to: client"
    echo "   - Add environment variable:"
    echo "     * REACT_APP_API_URL=https://your-backend.railway.app"
    echo ""
    echo "4. ⚙️ Configure CI/CD:"
    echo "   - Add GitHub secrets for automated deployments"
    echo "   - See DEPLOYMENT.md for detailed instructions"
    echo ""
    echo "📚 Documentation:"
    echo "   - Full deployment guide: ./DEPLOYMENT.md"
    echo "   - Production config: ./production.config.js"
    echo ""
    echo "🔧 Local Testing:"
    echo "   - Start server: cd server && npm start"
    echo "   - Start client: cd client && npm start"
    echo "   - Admin dashboard: http://localhost:5000/admin.html"
    echo ""
}

# Main deployment process
main() {
    echo "Starting deployment preparation..."
    echo ""
    
    check_dependencies
    install_dependencies
    run_tests
    build_production
    init_git
    show_deployment_instructions
    
    print_success "Deployment preparation completed successfully! 🎉"
}

# Run main function
main
