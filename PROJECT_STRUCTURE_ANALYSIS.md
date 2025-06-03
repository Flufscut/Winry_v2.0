# Winry.AI - Complete Project Structure Analysis

## 🎯 Project Overview

**Winry.AI** (formerly "SalesLeopard") is an **Advanced Cold Outreach Research Platform** built with a modern tech stack. It's a full-stack web application that automates prospect research and generates personalized outreach messages using AI.

### Tech Stack Summary
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth integration
- **State Management**: React Query (TanStack Query)
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with comprehensive UI component library
- **Deployment**: Replit platform with auto-scaling

---

## Root Directory Structure

### Configuration Files

#### `package.json` (3.6KB, 113 lines)
**Primary application configuration and dependency management**
- **Project Name**: "rest-express" (legacy name)
- **Main Scripts**:
  - `dev`: Development server with tsx for TypeScript execution
  - `build`: Production build using Vite + esbuild bundling
  - `start`: Production server execution
  - `db:push`: Database schema deployment with Drizzle
- **Key Dependencies**:
  - **UI Framework**: Complete Radix UI component suite for accessible components
  - **Database**: Drizzle ORM with Neon Database serverless PostgreSQL
  - **Authentication**: Passport.js with local strategy + session management
  - **File Processing**: Multer for CSV uploads, csv-parse for processing
  - **State Management**: TanStack React Query for server state
  - **Validation**: Zod for runtime type checking and validation
  - **WebSocket**: ws library for real-time features
- **Development Tools**: TypeScript, Vite, esbuild, Tailwind CSS, Drizzle Kit

#### `.replit` (676B, 37 lines)
**Replit platform deployment configuration**
- **Runtime Modules**: Node.js 20, Web server, PostgreSQL 16
- **Development Command**: `npm run dev`
- **Production Build**: Vite build + esbuild bundling
- **Port Configuration**: Internal port 5000 → External port 80
- **Deployment Target**: Auto-scaling infrastructure
- **Workflow Integration**: Parallel execution with automatic port detection

#### `drizzle.config.ts` (325B, 15 lines)
**Database ORM configuration**
- **Schema Location**: `./shared/schema.ts` (shared between client/server)
- **Migration Output**: `./drizzle` directory
- **Database Driver**: Neon Database serverless PostgreSQL
- **Environment**: Connection string from DATABASE_URL

#### `vite.config.ts` (894B, 32 lines)
**Frontend build configuration**
- **Framework**: React with TypeScript
- **Special Plugins**:
  - Replit Cartographer (development tooling)
  - Runtime error modal for debugging
- **Path Aliases**: `@/` points to `./client/src/`
- **Development Server**: Port 5173 with client-side routing support

#### `tailwind.config.ts` (2.7KB, 91 lines)
**Comprehensive CSS framework configuration**
- **Content Sources**: All TypeScript/React files in client directory
- **Theme Customization**: Full dark mode support, custom color variables
- **Plugins**: Typography, Tailwind CSS animations, custom animations
- **Component Integration**: Optimized for shadcn/ui component library

#### `tsconfig.json` (657B, 24 lines)
**TypeScript configuration**
- **Target**: ES2022 with modern JavaScript features
- **Module System**: ESNext for tree-shaking optimization
- **Strict Mode**: Full type checking enabled
- **Path Mapping**: `@shared/*` for shared types between client/server
- **Include Paths**: Both client and server source files

#### `postcss.config.js` (80B, 7 lines)
**CSS processing configuration**
- **Plugins**: Tailwind CSS + Autoprefixer
- **Purpose**: CSS optimization and vendor prefixing

#### `components.json` (459B, 20 lines)
**shadcn/ui component library configuration**
- **Style**: Default component styling
- **Colors**: Slate color scheme with CSS variables
- **Import Aliases**: `@/components` and `@/lib` paths
- **Tailwind Integration**: CSS variables for theming

#### `.gitignore` (67B, 6 lines)
**Version control exclusions**
- **Standard Exclusions**: node_modules, .env files
- **Build Outputs**: dist directory
- **Development Files**: .replit directory

#### `generated-icon.png` (297KB)
**Application icon/logo**
- Large binary file for application branding

---

## `/server` - Backend Application

### Core Server Files

#### `index.ts` (2.2KB, 79 lines)
**Main server entry point and middleware setup**
- **Express Application**: JSON/URL-encoded body parsing
- **Request Logging**: Comprehensive API request logging with timing
- **Webhook Debugging**: Special logging for webhook endpoints
- **Environment Handling**: 
  - Development: Vite dev server integration
  - Production: Static file serving
- **Server Configuration**: Port 5000 with host binding for Replit
- **Error Handling**: Centralized error middleware with proper status codes

#### `routes.ts` (41KB, 1001 lines)
**Comprehensive API routing and business logic**
- **Authentication**: Replit Auth integration with protected routes
- **Settings Management**: Configurable webhook URLs, timeouts, batch sizes
- **Prospect Management**:
  - CRUD operations for individual prospects
  - Bulk CSV upload with column mapping
  - Search and filtering capabilities
  - Status tracking (processing, completed, failed)
  - Retry mechanism for failed prospects
- **File Processing**: 
  - CSV upload with 10MB limit
  - Automatic column detection and mapping
  - Batch processing for large datasets
- **External Integrations**:
  - n8n webhook integration for AI research
  - Robust error handling with retries
  - Timeout management for long-running processes
- **Statistics**: Dashboard metrics and user analytics

#### `storage.ts` (6.1KB, 229 lines)
**Database abstraction layer**
- **User Operations**: User creation, retrieval, management
- **Prospect Operations**: 
  - Full CRUD with user isolation
  - Advanced search with filters
  - Status management and updates
- **CSV Upload Tracking**: Progress monitoring for bulk operations
- **Statistics Generation**: Counts by status, recent activity metrics
- **Data Validation**: Zod schema integration for type safety

#### `db.ts` (482B, 15 lines)
**Database connection management**
- **Drizzle ORM**: Connection setup with Neon serverless PostgreSQL
- **Environment Configuration**: DATABASE_URL based connection
- **Connection Pooling**: Automatic connection management

#### `replitAuth.ts` (4.1KB, 158 lines)
**Authentication system integration**
- **Replit Auth**: OAuth integration with Replit platform
- **Session Management**: PostgreSQL session storage with express-session
- **User Synchronization**: Automatic user creation/updates from auth provider
- **Route Protection**: Middleware for authenticated endpoints
- **Database Integration**: User storage in PostgreSQL with session persistence

#### `vite.ts` (2.2KB, 86 lines)
**Development server integration**
- **Vite Dev Server**: Hot module replacement in development
- **Static File Serving**: Production asset serving
- **Build Integration**: Seamless development/production switching
- **Asset Optimization**: Efficient static file delivery

---

## `/shared` - Common Types and Schema

#### `schema.ts` (3.4KB, 102 lines)
**Comprehensive database schema and validation**
- **Database Tables**:
  - `sessions`: Required for Replit Auth (session storage)
  - `users`: User profiles with Replit integration
  - `prospects`: Core prospect data with research results
  - `csvUploads`: Batch upload tracking
- **Validation Schemas**: Zod-based runtime validation
- **Type Exports**: TypeScript types for both client and server
- **Data Relationships**: User ownership, foreign key constraints
- **JSON Storage**: Flexible storage for research results and webhook payloads

---

## `/client` - Frontend Application

### Root Client Files

#### `index.html` (527B, 13 lines)
**Single Page Application entry point**
- **React 18**: Modern React with concurrent features
- **Module System**: ES modules for modern browsers
- **Title**: "SalesLeopard" branding
- **Mount Point**: Root div for React application

### `/client/src` - Source Code

#### `main.tsx` (157B, 6 lines)
**React application bootstrap**
- **React 18**: StrictMode with createRoot
- **CSS Import**: Global Tailwind styles
- **App Component**: Main application entry point

#### `App.tsx` (985B, 40 lines)
**Main application component and routing**
- **Routing**: Wouter-based client-side routing
- **Authentication**: Auth-protected route guards
- **State Management**: React Query provider setup
- **UI Providers**: Tooltip and Toast notifications
- **Route Structure**:
  - Unauthenticated: Landing page
  - Authenticated: Dashboard
  - Fallback: 404 Not Found

#### `index.css` (9.1KB, 372 lines)
**Global styles and CSS variables**
- **Tailwind CSS**: Base, components, and utilities
- **Dark Mode**: Complete dark mode variable definitions
- **Component Styling**: Custom styles for UI components
- **Animation Definitions**: Custom animations and transitions

### `/client/src/pages` - Application Views

#### `landing.tsx` (6.7KB, 148 lines)
**Marketing landing page**
- **Hero Section**: SalesLeopard branding with compelling value proposition
- **Feature Highlights**: 
  - Prospect Research: Deep prospect and company analysis
  - AI-Powered Messages: Personalized outreach generation
  - Bulk Processing: CSV upload for hundreds of prospects
  - Security: Data encryption and privacy
- **How It Works**: 3-step process explanation
- **Call-to-Action**: Direct authentication integration
- **Responsive Design**: Mobile-optimized with Tailwind CSS

#### `dashboard.tsx` (30KB, 650 lines)
**Main application dashboard**
- **Statistics Display**: Real-time metrics with charts
- **Prospect Management**: 
  - Interactive table with sorting/filtering
  - Quick actions (view, delete, retry)
  - Status indicators and progress tracking
- **CSV Upload**: Drag-and-drop file upload with mapping
- **Responsive Layout**: Adaptive design for all screen sizes
- **Error Handling**: User-friendly error messages and retry options

#### `dashboard-modern.tsx` (25KB, 575 lines)
**Alternative modern dashboard design**
- **Enhanced UI**: Updated visual design
- **Improved UX**: Streamlined user workflows
- **Component Reuse**: Shared components with main dashboard

#### `not-found.tsx` (711B, 22 lines)
**404 error page**
- **User-Friendly**: Clear error message and navigation
- **Branding Consistent**: Matches application design
- **Return Navigation**: Easy way back to dashboard

### `/client/src/components` - Reusable Components

#### Business Logic Components

##### `prospect-table-interactive.tsx` (25KB, 578 lines)
**Advanced prospect data table**
- **Data Grid**: Sortable, filterable prospect display
- **Actions**: Inline edit, delete, view details
- **Status Management**: Visual status indicators
- **Bulk Operations**: Multi-select for batch actions
- **Real-time Updates**: Live data synchronization
- **Export Features**: Data export capabilities

##### `prospect-profile-interactive.tsx` (32KB, 672 lines)
**Detailed prospect profile viewer**
- **Comprehensive Display**: All prospect data and research results
- **Research Results**: Formatted display of AI research findings
- **Action Buttons**: Edit, delete, retry failed prospects
- **Data Visualization**: Charts and metrics for prospect insights
- **Responsive Layout**: Mobile-friendly detailed view

##### `csv-upload.tsx` (17KB, 474 lines)
**Bulk prospect upload system**
- **File Upload**: Drag-and-drop CSV file handling
- **Column Mapping**: Intelligent field mapping with preview
- **Validation**: Data validation before processing
- **Progress Tracking**: Real-time upload progress
- **Error Handling**: Detailed error reporting and recovery
- **Batch Processing**: Configurable batch sizes for performance

##### `prospect-details-modern.tsx` (20KB, 488 lines)
**Modern prospect detail component**
- **Enhanced Design**: Updated visual styling
- **Improved Data Display**: Better organization of prospect information
- **Interactive Elements**: Enhanced user interaction

##### `prospect-details.tsx` (22KB, 464 lines)
**Original prospect detail component**
- **Comprehensive View**: Complete prospect information display
- **Research Integration**: AI research results presentation
- **Action Management**: User actions and status updates

##### `prospect-form.tsx` (6.1KB, 206 lines)
**Prospect creation/editing form**
- **Form Validation**: Comprehensive field validation with Zod
- **User Experience**: Clean, intuitive form design
- **Error Handling**: Field-level error display
- **Data Binding**: Two-way data binding with React Hook Form

##### `prospect-table.tsx` (11KB, 289 lines)
**Basic prospect table component**
- **Simple Display**: Basic tabular prospect data
- **Core Functionality**: Essential table operations
- **Lightweight**: Minimal feature set for performance

##### `processing-indicator.tsx` (3.7KB, 117 lines)
**Status and progress indicators**
- **Visual Feedback**: Loading states and progress bars
- **Status Communication**: Clear status messaging
- **Animation**: Smooth transitions and loading animations

##### `settings-menu.tsx` (8.0KB, 249 lines)
**Application settings management**
- **Configuration**: Webhook URLs, timeouts, batch sizes
- **User Preferences**: Application behavior settings
- **Validation**: Settings validation and error handling
- **Persistence**: Settings storage and retrieval

### `/client/src/components/ui` - UI Component Library

**Comprehensive shadcn/ui component library** (50+ components)

#### Core Components
- **`button.tsx`**: Flexible button component with variants
- **`input.tsx`**: Form input with validation states
- **`card.tsx`**: Container component for content sections
- **`dialog.tsx`**: Modal dialogs and overlays
- **`table.tsx`**: Data table with sorting and styling
- **`form.tsx`**: Form components with validation integration

#### Navigation Components
- **`navigation-menu.tsx`**: Main navigation system
- **`breadcrumb.tsx`**: Breadcrumb navigation
- **`menubar.tsx`**: Application menu bar
- **`pagination.tsx`**: Data pagination controls

#### Data Display Components
- **`chart.tsx`**: Recharts integration for data visualization
- **`progress.tsx`**: Progress bars and indicators
- **`badge.tsx`**: Status badges and labels
- **`avatar.tsx`**: User avatar display
- **`separator.tsx`**: Visual content separators

#### Form Components
- **`checkbox.tsx`**: Checkbox input with states
- **`radio-group.tsx`**: Radio button groups
- **`select.tsx`**: Dropdown selection component
- **`slider.tsx`**: Range slider input
- **`switch.tsx`**: Toggle switch component
- **`textarea.tsx`**: Multi-line text input

#### Feedback Components
- **`alert.tsx`**: Alert messages and notifications
- **`toast.tsx`** & **`toaster.tsx`**: Toast notification system
- **`tooltip.tsx`**: Contextual help tooltips
- **`skeleton.tsx`**: Loading state placeholders

#### Layout Components
- **`sidebar.tsx`**: Application sidebar navigation
- **`sheet.tsx`**: Slide-out panels
- **`accordion.tsx`**: Collapsible content sections
- **`tabs.tsx`**: Tabbed content organization
- **`collapsible.tsx`**: Expandable content areas

#### Interactive Components
- **`hover-card.tsx`**: Hover-triggered content cards
- **`popover.tsx`**: Popup content containers
- **`dropdown-menu.tsx`**: Context menus and dropdowns
- **`context-menu.tsx`**: Right-click context menus
- **`command.tsx`**: Command palette/search interface

#### Advanced Components
- **`calendar.tsx`**: Date picker and calendar
- **`carousel.tsx`**: Image/content carousel
- **`resizable.tsx`**: Resizable panel components
- **`scroll-area.tsx`**: Custom scrollable areas
- **`input-otp.tsx`**: One-time password input

### `/client/src/hooks` - Custom React Hooks

#### `useAuth.ts` (257B, 15 lines)
**Authentication state management**
- **User State**: Current user data and authentication status
- **Loading States**: Authentication loading indicators
- **API Integration**: User data fetching and management

#### `use-mobile.tsx` (565B, 20 lines)
**Responsive design hook**
- **Breakpoint Detection**: Mobile/desktop device detection
- **Responsive Logic**: Component behavior based on screen size
- **Performance**: Optimized resize event handling

#### `use-toast.ts` (3.8KB, 192 lines)
**Toast notification system**
- **Notification Management**: Show/hide toast messages
- **State Management**: Toast queue and display logic
- **Customization**: Different toast types and styling
- **Accessibility**: Screen reader support and keyboard navigation

### `/client/src/lib` - Utility Libraries

#### `queryClient.ts` (1.3KB, 58 lines)
**React Query configuration**
- **Global Configuration**: Default query and mutation settings
- **Caching Strategy**: Optimized data caching for performance
- **Error Handling**: Global error handling for API requests
- **Background Updates**: Automatic data refreshing

#### `utils.ts` (166B, 7 lines)
**Utility functions**
- **Class Merging**: clsx integration for conditional styling
- **Common Helpers**: Shared utility functions across components

#### `authUtils.ts` (115B, 3 lines)
**Authentication utilities**
- **Helper Functions**: Authentication-related utility functions
- **API Integration**: Authentication API helpers

---

## `/attached_assets` - Development Assets

**Development and testing files** (16 files)
- **Screenshots**: Application interface captures for documentation
- **Test Data**: Sample API responses and webhook payloads
- **Debug Logs**: Server output and development debugging information
- **CSV Samples**: Test files for upload functionality

**Key Files:**
- **`Screenshot 2025-05-31 at 8.31.28 PM.png`**: Dashboard interface capture
- **`Pasted--output-firstname-*` files**: Sample API response data
- **Debug logs**: Server startup and processing logs

---

## Application Flow and Architecture

### Authentication Flow
1. **Landing Page**: Unauthenticated users see marketing page
2. **Replit Auth**: OAuth integration with Replit platform
3. **User Creation**: Automatic user creation/sync in PostgreSQL
4. **Session Management**: Persistent sessions with database storage
5. **Dashboard Access**: Authenticated users access full application

### Prospect Processing Workflow
1. **Data Input**: Manual form entry or CSV bulk upload
2. **Validation**: Zod schema validation for data integrity
3. **Database Storage**: Prospect data stored with "processing" status
4. **External Processing**: Webhook to n8n for AI research
5. **Result Processing**: Webhook callback with research results
6. **Status Updates**: Real-time status updates in dashboard
7. **Result Display**: Comprehensive research results and generated messages

### Data Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: React Query for client-side data caching
- **State Management**: Server state via React Query, local state via React hooks
- **Validation**: Runtime validation with Zod schemas
- **Type Safety**: Full TypeScript coverage across stack

### Deployment Architecture
- **Platform**: Replit with auto-scaling
- **Environment**: Node.js 20 with PostgreSQL 16
- **Build Process**: Vite + esbuild for optimized production builds
- **Monitoring**: Comprehensive logging and error tracking
- **Security**: Session-based authentication with CSRF protection

---

## Key Features and Capabilities

### 🔍 **Prospect Research**
- AI-powered deep research on prospects and companies
- LinkedIn integration for professional background analysis
- Company analysis including pain points and business goals
- Automated research workflow with n8n integration

### 📧 **Cold Outreach Generation**
- Personalized email generation based on research findings
- Tailored messaging for specific prospect characteristics
- Multiple message variations and approaches
- Research-backed talking points and value propositions

### 📊 **Bulk Processing**
- CSV upload with intelligent column mapping
- Batch processing for hundreds of prospects
- Progress tracking and error handling
- Configurable batch sizes for performance optimization

### 📈 **Analytics and Reporting**
- Real-time dashboard with processing statistics
- Prospect status tracking and success metrics
- Historical data analysis and trends
- Export capabilities for external analysis

### 🔒 **Security and Privacy**
- Encrypted data storage and transmission
- User data isolation and access controls
- Session management with secure authentication
- Privacy-compliant data handling

### 🎨 **Modern UI/UX**
- Responsive design for all devices
- Dark mode support throughout application
- Comprehensive component library (shadcn/ui)
- Accessibility features and keyboard navigation
- Real-time updates and smooth animations

---

## Development and Maintenance Notes

### Code Quality
- **TypeScript**: Full type safety across client and server
- **Validation**: Runtime validation with Zod schemas
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Structure supports easy test implementation
- **Documentation**: Well-documented code with clear naming

### Performance Considerations
- **Build Optimization**: Vite + esbuild for fast builds
- **Code Splitting**: Automatic code splitting for optimal loading
- **Caching**: Intelligent caching strategies for data and assets
- **Database**: Optimized queries with proper indexing
- **Real-time**: Efficient WebSocket integration for live updates

### Scalability Features
- **Database**: Serverless PostgreSQL with auto-scaling
- **Application**: Stateless design for horizontal scaling
- **File Processing**: Batch processing for large datasets
- **Caching**: Layered caching for performance
- **Monitoring**: Built-in logging and error tracking

### Maintenance Requirements
- **Dependencies**: Regular updates for security and features
- **Database**: Schema migrations with Drizzle Kit
- **Monitoring**: Error tracking and performance monitoring
- **Backup**: Database backup and recovery procedures
- **Security**: Regular security audits and updates

This comprehensive analysis provides a complete understanding of the Winry.AI application architecture, functionality, and codebase organization for continued development and maintenance. 