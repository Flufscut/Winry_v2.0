# Winry.AI - True Sales Intelligence Platform

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/winry-ai)

> **AI-powered prospect research and outreach automation platform built for modern sales teams**

## 🚀 Quick Deploy

**One-Click Deployment:**
1. Click the Railway button above
2. Set environment variables (see below)
3. Deploy automatically

**Manual Setup:**
1. Clone this repository
2. Set up PostgreSQL database (Neon recommended)
3. Configure environment variables
4. Deploy to your preferred platform

## ✨ Features

### 🧠 AI-Powered Research
- **Intelligent Prospect Analysis** - Deep research on prospects using advanced AI
- **Company Intelligence** - Comprehensive company analysis and competitive insights
- **Pain Point Identification** - Automated discovery of business challenges and opportunities
- **Personalization Engine** - Context-aware messaging and outreach customization

### 📊 Advanced Analytics
- **Pipeline Analytics** - Real-time conversion tracking and performance metrics
- **Reply.io Integration** - Campaign performance insights and optimization recommendations
- **Business Intelligence** - Sophisticated prospect quality scoring and ROI analysis
- **Cache Monitoring** - API performance tracking and rate limit management

### 🏢 Enterprise Features
- **Multi-Tenant Workspaces** - Complete client workspace isolation and management
- **Bulk Operations** - Efficient prospect management and bulk outreach capabilities
- **CSV Import/Export** - Seamless data import with intelligent column mapping
- **Production Monitoring** - Health checks, system metrics, and alerting

### 🔗 Integrations
- **Reply.io** - Automated prospect enrollment and campaign management
- **n8n Workflows** - Extensible AI research automation
- **PostgreSQL** - Enterprise-grade data storage and management

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use SQLite for local development)
- n8n instance for AI research workflows

### Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/winry-ai.git
cd winry-ai

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:5432/database_name?sslmode=require

# Security Configuration
SESSION_SECRET=your-secure-session-secret-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-signing-secret-for-tokens

# External Services
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/your-webhook-id

# Optional Configuration
NODE_ENV=development
PORT=5001
CORS_ORIGINS=http://localhost:3000,http://localhost:5001
```

## 📦 Production Deployment

### Railway (Recommended)
1. Fork this repository
2. Connect to Railway
3. Add PostgreSQL service
4. Set environment variables
5. Deploy automatically

### Other Platforms
- **Vercel**: Frontend deployment with API routes
- **DigitalOcean**: App Platform with managed PostgreSQL
- **AWS**: ECS with RDS PostgreSQL
- **Self-hosted**: VPS with Docker support

### Required Environment Variables for Production
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - 32-character secret for session encryption
- `ENCRYPTION_KEY` - 32-character key for data encryption
- `JWT_SECRET` - JWT signing secret
- `N8N_WEBHOOK_URL` - n8n webhook endpoint for AI research
- `NODE_ENV=production`

## 🔄 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `development` - Integration branch for features
- `feature/*` - Individual feature branches

### Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Make changes and test locally
npm run dev
npm run test

# Commit changes
git add .
git commit -m "Add: description of new feature"

# Push and create pull request
git push -u origin feature/new-feature-name
```

### Automated Deployment
- **Production**: Deploys from `main` branch
- **Staging**: Deploys from `development` branch
- **Preview**: Deploys from feature branches

## 📊 Project Status

**Current Version**: v1.2.0  
**Project Progress**: 89% Complete  
**Core Features**: ✅ Production Ready  
**Advanced Analytics**: ✅ Implemented  
**Multi-Tenant System**: ✅ Fully Functional  
**Rate Limiting**: ✅ Optimized

### Recent Achievements (June 2025)
- ✅ **Reply.io Rate Limiting Optimization** - 95% API usage reduction, zero rate limit errors
- ✅ **Workspace Management Enhancement** - Dynamic count synchronization across UI components  
- ✅ **Reply.io Integration Improvements** - Auto-population of campaigns and enhanced UX
- ✅ **Production Stability** - PostgreSQL sessions, multi-tenant isolation, performance optimization
- ✅ **Enterprise Monitoring** - Comprehensive caching, API performance tracking, and health checks

### Previous Achievements
- ✅ **Production Health Monitoring** - Enterprise-grade monitoring and alerting
- ✅ **Advanced Reply.io Analytics** - Campaign performance insights and optimization
- ✅ **Frontend Performance** - 94% bundle size reduction with code splitting
- ✅ **Multi-Tenant Workspaces** - Complete client isolation and management
- ✅ **Comprehensive Testing** - 21/21 tests passing with full coverage

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📚 Documentation

- [Product Requirements](Winry_AI_PRD.md) - Complete product vision and specifications
- [Development Status](STATUS.md) - Current progress and roadmap
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [Testing Results](TESTING_RESULTS.md) - Comprehensive testing documentation

## 🔧 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with shadcn/ui components
- **Framer Motion** for animations
- **React Query** for state management

### Backend
- **Node.js** with Express and TypeScript
- **Drizzle ORM** with PostgreSQL
- **Zod** for validation
- **Express Session** for authentication

### Infrastructure
- **PostgreSQL** for production database
- **SQLite** for local development
- **n8n** for AI research workflows
- **Railway** for deployment and hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

---

**Built with ❤️ by Sales Leopard**  
*Empowering sales teams with true AI intelligence* 