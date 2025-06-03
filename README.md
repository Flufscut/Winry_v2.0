# Winry.AI - Sales Intelligence Platform

A comprehensive AI-powered sales intelligence platform that automates prospect research, generates personalized outreach, and manages the complete sales pipeline from lead upload to response tracking.

## 🎯 Features

### Core Functionality
- **Prospect Management**: Upload prospects via CSV, manage contact information, and track status
- **AI Research Engine**: Automated prospect research using n8n workflow integration
- **Personalized Outreach**: AI-generated personalized emails and messaging
- **Reply.io Integration**: Automated sending to Reply.io campaigns with comprehensive analytics
- **Pipeline Analytics**: Complete funnel visualization from upload to response

### Technical Capabilities
- **Full-Stack TypeScript**: React frontend with Express backend
- **Database**: SQLite for local development, PostgreSQL for production
- **Authentication**: Local development bypass, production-ready auth system
- **Real-time Updates**: Live prospect status tracking and analytics
- **Responsive Design**: Modern UI with shadcn/ui components and dark mode

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Flufscut/winry.git
   cd winry
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   # Local development uses SQLite by default
   # No additional setup required for basic functionality
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001`

## 📁 Project Structure

```
winry/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── auth-local.ts      # Authentication (local dev)
│   └── replyio-service.ts # Reply.io integration
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema
├── STATUS.md              # Development status
├── MASTER_PROMPT.md       # Development guidelines
└── Winry_AI_PRD.md       # Product requirements
```

## 🔧 Configuration

### Environment Variables
```bash
# Database (auto-configured for local development)
DATABASE_URL=./local.db

# n8n Webhook (for AI research)
N8N_WEBHOOK_URL=your_n8n_webhook_url

# Reply.io Integration (optional)
REPLYIO_API_KEY=your_api_key
```

### Development vs Production
- **Local Development**: Uses SQLite database with authentication bypass
- **Production**: PostgreSQL database with full authentication system

## 📊 Usage

### 1. Upload Prospects
- Navigate to "Upload Prospects" tab
- Upload CSV file with prospect information
- Map columns to required fields
- Review and confirm upload

### 2. AI Research
- Prospects are automatically queued for AI research
- Research includes company information, pain points, and personalization data
- Results appear in the prospect table when complete

### 3. Outreach Management
- Configure Reply.io integration in Settings
- Set up default account and campaign
- Prospects are automatically sent to Reply.io after research completion
- Monitor campaign performance in Analytics dashboard

### 4. Pipeline Analytics
- View complete pipeline funnel visualization
- Track conversion rates at each stage
- Monitor Reply.io campaign performance
- Access detailed stage breakdowns

## 🔗 Integrations

### n8n Workflow
- AI research automation
- Data enrichment and validation
- Webhook-based communication

### Reply.io
- Multi-account support
- Campaign management
- Performance analytics
- Automated prospect enrollment

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **State Management**: TanStack Query
- **UI Components**: Radix UI, Lucide Icons, Framer Motion

## 📈 Current Status

### ✅ Completed Features
- Prospect CRUD operations
- CSV upload with column mapping
- AI research integration
- Reply.io auto-send functionality
- Comprehensive analytics dashboard
- Authentication system (local dev)
- Responsive UI with dark mode

### 🔄 In Progress
- Enhanced prospect management features
- Advanced analytics and reporting
- Production deployment preparation

### 🎯 Upcoming
- Multi-user support
- Advanced personalization engine
- Additional CRM integrations
- Mobile applications

## 📖 Documentation

- **[STATUS.md](STATUS.md)**: Detailed project status and roadmap
- **[MASTER_PROMPT.md](MASTER_PROMPT.md)**: Development guidelines and workflow
- **[Winry_AI_PRD.md](Winry_AI_PRD.md)**: Complete product requirements document
- **[PROJECT_STRUCTURE_ANALYSIS.md](PROJECT_STRUCTURE_ANALYSIS.md)**: Technical architecture overview

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please check the documentation files or open an issue in the repository.

---

Built with ❤️ for sales professionals who want to leverage AI for better prospect engagement. 