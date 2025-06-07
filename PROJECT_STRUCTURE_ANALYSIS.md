# Winry.AI - Complete Project Structure Analysis

## 🎯 Project Overview

**Winry.AI** is an **Advanced AI-Powered Sales Intelligence Platform** built with a modern full-stack architecture. The platform automates prospect research and generates personalized cold outreach messages using AI.

### Tech Stack Summary
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Node.js  
- **Database**: PostgreSQL (Production) / SQLite (Development) with Drizzle ORM
- **Authentication**: Multi-user system with Google OAuth + manual auth
- **State Management**: React Query (TanStack Query) 
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with comprehensive UI component library
- **Deployment**: Railway platform with auto-scaling

---

## Root Directory Structure

### Configuration Files

#### `package.json` (4.7KB, 144 lines)
**Current application configuration and dependency management**
- **Project Name**: "winry-ai" 
- **Main Scripts**:
  - `dev`: Development server with tsx for TypeScript execution
  - `build`: Production build using Vite + esbuild bundling
  - `start`: Production server with automated database migration (`drizzle-kit push --force`)
  - `db:push`: Database schema deployment with Drizzle
- **Key Dependencies**:
  - **UI Framework**: Complete Radix UI component suite + shadcn/ui
  - **Database**: Drizzle ORM with PostgreSQL support (postgres, @neondatabase/serverless)
  - **Authentication**: Passport.js with Google OAuth + bcrypt for password hashing  
  - **File Processing**: Multer for uploads, csv-parse for CSV processing
  - **State Management**: TanStack React Query for server state
  - **Validation**: Zod for runtime type checking and validation
  - **Real-time**: WebSocket support with ws library
- **Development Tools**: TypeScript, Vite, esbuild, Tailwind CSS, Drizzle Kit, Vitest for testing

#### `drizzle.config.ts` (325B, 15 lines)
**Database ORM configuration**
- **Schema Location**: `./shared/schema.ts` (shared between client/server)
- **Migration Output**: `./migrations` directory  
- **Database Driver**: PostgreSQL with environment-based connection
- **Environment**: Uses DATABASE_URL for production PostgreSQL connection

#### `vite.config.ts` (2.2KB, 91 lines)
**Frontend build configuration**
- **Framework**: React with TypeScript
- **Special Plugins**:
  - Replit Cartographer (development tooling)
  - Runtime error modal for debugging
- **Path Aliases**: `@/` points to `./client/src/`
- **Development Server**: Port 5173 with client-side routing support

#### `railway.toml` (336B, 14 lines)
**Railway deployment configuration**
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (includes automated DB migration)
- **Environment**: Production deployment settings

---

## `/server` - Backend Application  

### Core Server Files

#### `index.ts` (3.2KB, 104 lines)
**Main server entry point and middleware setup**
- **Express Application**: JSON/URL-encoded body parsing + cookie parser
- **Request Logging**: Comprehensive API request logging with timing  
- **Webhook Debugging**: Special logging for webhook endpoints
- **Environment Handling**:
  - Development: Vite dev server integration
  - Production: Static file serving with Railway deployment
- **Server Configuration**: Port 5001 (dev) / Railway port (prod) with proper host binding  
- **Error Handling**: Centralized error middleware with proper status codes

#### `routes.ts` (139KB, 3794 lines) 
**Comprehensive API routing and business logic**
- **Authentication Integration**: Multi-user auth system with protected routes
- **User Management**: User profiles, preferences, client workspace management
- **Prospect Management**:
  - CRUD operations for individual prospects
  - Bulk CSV upload with intelligent column mapping
  - Advanced search and filtering capabilities  
  - Status tracking (processing, completed, failed)
  - Retry mechanism for failed prospects
- **File Processing**:
  - CSV upload with 10MB limit
  - Automatic column detection and mapping
  - Batch processing for large datasets with configurable batch sizes
- **External Integrations**:
  - n8n webhook integration for AI research
  - Reply.io integration for automated outreach
  - Robust error handling with retries and timeout management
- **Analytics**: Dashboard metrics, user statistics, and reporting

#### `storage.ts` (58KB, 1755 lines)
**Database abstraction layer and business logic**
- **User Operations**: User creation, retrieval, profile management
- **Prospect Operations**:
  - Full CRUD with multi-tenant isolation  
  - Advanced search with filters and pagination
  - Status management and bulk updates
- **CSV Upload Tracking**: Progress monitoring for bulk operations
- **Client Management**: Multi-tenant workspace system
- **Statistics Generation**: Real-time counts by status, activity metrics  
- **Data Validation**: Zod schema integration for type safety

#### `auth-multi-user.ts` (18KB, 556 lines)
**Multi-user authentication system** 
- **Authentication Methods**:
  - Manual signup/login with bcrypt password hashing
  - Google OAuth integration with Passport.js
  - Session-based authentication with PostgreSQL session storage
- **User Management**: User creation, authentication, session handling
- **Security Features**: Password hashing, session management, CSRF protection
- **Database Integration**: User storage with proper schema validation
- **OAuth Configuration**: Google OAuth with proper callback handling

#### `db.ts` (3.8KB, 110 lines)
**Unified database connection management**
- **Environment Detection**: Automatic SQLite (dev) / PostgreSQL (prod) selection
- **Connection Pooling**: Optimized connection management  
- **Schema Migration**: Automatic database initialization
- **Error Handling**: Comprehensive database error management

---

## `/shared` - Common Types and Schema

#### `schema.ts` (9.7KB, 241 lines)
**Comprehensive database schema and validation**
- **Database Tables**:
  - `users`: User profiles with authentication fields (passwordHash, oauthProvider, oauthId)
  - `clients`: Multi-tenant workspace management
  - `prospects`: Core prospect data with research results
  - `csvUploads`: Batch upload tracking and progress
  - `replyioAccounts`: Reply.io integration accounts
  - `replyioCampaigns`: Campaign management
  - `sessions`: Session storage for authentication
- **Validation Schemas**: Zod-based runtime validation for all data operations
- **Type Exports**: Full TypeScript type coverage for client and server
- **Relationships**: Proper foreign key constraints and data relationships
- **JSON Storage**: Flexible storage for research results and webhook payloads

---

## `/client` - Frontend Application

### Root Client Files

#### `index.html` (527B, 13 lines)
**Single Page Application entry point**
- **React 18**: Modern React with concurrent features
- **Module System**: ES modules for modern browsers  
- **Title**: "Winry.AI" branding
- **Mount Point**: Root div for React application

### `/client/src` - Source Code

#### `main.tsx` (157B, 6 lines)
**React application bootstrap**
- **React 18**: StrictMode with createRoot
- **CSS Import**: Global Tailwind styles
- **App Component**: Main application entry point

#### `App.tsx` (3.0KB, 105 lines)
**Main application component and routing**
- **Routing**: Wouter-based client-side routing with protected routes
- **Authentication**: Auth-protected route guards with loading states
- **State Management**: React Query provider setup
- **UI Providers**: Tooltip and Toast notification systems
- **Route Structure**:
  - Public: `/`, `/login`, `/signup` 
  - Protected: `/dashboard`, `/profile-settings`, `/preferences`
  - Fallback: 404 Not Found page
- **Multi-tenant**: Client workspace provider integration

#### `index.css` (13KB, 590 lines)
**Global styles and design system**
- **Tailwind CSS**: Base, components, and utilities
- **Dark Mode**: Complete dark mode support with CSS variables
- **Component Styling**: Custom styles for UI components
- **Design System**: Professional purple/blue gradient branding
- **Animation Definitions**: Custom animations and smooth transitions

### `/client/src/pages` - Application Views

#### Key Pages Overview
- **`landing.tsx`**: Professional marketing landing page with hero sections
- **`login.tsx` & `signup.tsx`**: Authentication pages with modern design
- **`dashboard.tsx`**: Main application dashboard with prospect management
- **`profile-settings.tsx`**: User profile management interface  
- **`preferences.tsx`**: Application settings and preferences
- **`not-found.tsx`**: Professional 404 error page

### `/client/src/components` - Reusable Components

#### Business Logic Components
- **`prospect-table-interactive.tsx`**: Advanced prospect data table with sorting/filtering
- **`prospect-profile-interactive.tsx`**: Detailed prospect profile viewer
- **`csv-upload.tsx`**: Bulk prospect upload system with column mapping
- **`client-selector.tsx`**: Multi-tenant workspace switching
- **`prospect-form.tsx`**: Prospect creation/editing forms
- **`settings-menu.tsx`**: Application configuration management

### `/client/src/components/ui` - UI Component Library

**Comprehensive shadcn/ui component library** (50+ components)
- **Core**: button, input, card, dialog, table, form components
- **Navigation**: navigation-menu, breadcrumb, menubar, pagination
- **Data Display**: chart, progress, badge, avatar, separator  
- **Form**: checkbox, radio-group, select, slider, switch, textarea
- **Feedback**: alert, toast, tooltip, skeleton components
- **Layout**: sidebar, sheet, accordion, tabs, collapsible
- **Interactive**: hover-card, popover, dropdown-menu, context-menu
- **Advanced**: calendar, carousel, resizable panels, scroll-area

### `/client/src/hooks` - Custom React Hooks

#### `useAuth.ts` (3.4KB, 87 lines)
**Authentication state management with circuit breaker**
- **User State**: Current user data and authentication status
- **Circuit Breaker**: Prevents infinite authentication loops (2 failures, 60s reset)
- **Loading States**: Proper loading and error state management
- **API Integration**: Secure user data fetching with retry logic

#### Additional Hooks
- **`use-mobile.tsx`**: Responsive design breakpoint detection
- **`use-toast.ts`**: Toast notification system management

### `/client/src/lib` - Utility Libraries

#### `queryClient.ts` (1.3KB, 58 lines)
**React Query configuration**
- **Global Configuration**: Optimized query and mutation settings
- **Caching Strategy**: Intelligent data caching for performance
- **Error Handling**: Global error handling for API requests  
- **Background Updates**: Automatic data refreshing

---

## Current Authentication Architecture

### Authentication Flow
1. **Landing Page**: Unauthenticated users see professional marketing page
2. **Multi-Auth Options**: Manual signup/login + Google OAuth
3. **Session Management**: PostgreSQL-based persistent sessions
4. **User Creation**: Automatic user and default workspace creation
5. **Dashboard Access**: Authenticated users access full application

### Database Architecture  
- **Production**: PostgreSQL with Drizzle ORM on Railway
- **Development**: SQLite with automatic migration to PostgreSQL schema
- **Session Storage**: PostgreSQL session management with express-session
- **Multi-tenant**: Client workspace isolation for enterprise features

### Security Features
- **Password Security**: bcrypt hashing with salt rounds
- **Session Security**: Secure session configuration with proper cookies
- **OAuth Integration**: Google OAuth with proper callback handling
- **CSRF Protection**: Built-in session-based CSRF protection
- **Circuit Breaker**: Frontend protection against authentication loops

---

## Key Features and Capabilities

### 🔍 **AI-Powered Prospect Research**
- Deep prospect and company analysis using AI
- LinkedIn integration for professional background research
- Company pain point and business goal identification
- Automated research workflow with n8n integration

### 📧 **Personalized Cold Outreach**  
- AI-generated personalized emails based on research
- Tailored messaging for specific prospect characteristics
- Multiple message variations and approaches
- Research-backed talking points and value propositions

### 📊 **Enterprise-Grade Management**
- Multi-tenant client workspace system
- Bulk CSV processing with intelligent column mapping
- Real-time progress tracking and error handling
- Advanced analytics and reporting dashboard

### 🔗 **External Integrations**
- **Reply.io**: Automated outreach campaign management
- **n8n**: Webhook-based AI research processing
- **Google OAuth**: Enterprise authentication
- **CSV Processing**: Bulk data import/export capabilities

### 🎨 **Professional UI/UX**
- Modern design system with purple/blue gradient branding
- Responsive design for all devices and screen sizes
- Dark mode support throughout application
- Accessibility features and keyboard navigation
- Smooth animations and professional interactions

---

## Development and Deployment

### Production Deployment (Railway)
- **Platform**: Railway with auto-scaling infrastructure
- **Database**: PostgreSQL with automated migrations
- **Environment**: Node.js with optimized production builds
- **Monitoring**: Comprehensive logging and error tracking
- **Security**: HTTPS, secure sessions, OAuth integration

### Development Environment
- **Database**: SQLite with automatic PostgreSQL schema compatibility
- **Hot Reload**: Vite development server with fast refresh
- **Type Safety**: Full TypeScript coverage across stack
- **Testing**: Vitest for unit and integration testing

### Code Quality Standards
- **TypeScript**: Full type safety across client and server
- **Validation**: Runtime validation with Zod schemas
- **Error Handling**: Comprehensive error handling and user feedback
- **Documentation**: Well-documented code with clear naming conventions
- **Testing Structure**: Supports easy test implementation and CI/CD

---

## Current Project Status

### ✅ **Completed Infrastructure**
- Multi-user authentication system with Google OAuth
- Database schema with automated migrations
- Professional UI/UX design system
- Multi-tenant client workspace management
- Bulk prospect processing with CSV upload
- External integrations (Reply.io, n8n)
- Production deployment on Railway

### 🔄 **Active Development Focus**
- Authentication frontend integration optimization
- Advanced analytics and reporting features
- Enhanced AI research capabilities
- Performance optimization and scalability improvements

### 🚀 **Production Ready Features**
- Account creation and authentication (API confirmed working)
- Prospect management and research workflows
- Client workspace management
- CSV bulk processing
- Reply.io integration
- Professional branding and UI/UX

This analysis provides a complete and current understanding of the Winry.AI application architecture, replacing all outdated references and reflecting the actual current state of the codebase. 