# Winry.AI - Master Development Prompt

## 🎯 ESSENTIAL PRE-WORK INSTRUCTIONS

**CRITICAL: Execute these steps BEFORE starting any development task!**

### 1. Status Review Protocol
```bash
# ALWAYS read these documents first:
1. Read STATUS.md - Current project status and active tasks
2. Read Winry_AI_PRD.md - Product requirements and vision
3. Read PROJECT_STRUCTURE_ANALYSIS.md - Codebase understanding
4. Check current task in STATUS.md "🔄 CURRENT FOCUS" section
```

### 2. Context Establishment
- **Current Task**: Fix n8n webhook integration in Railway production
- **Dependencies**: All core features complete and working locally
- **Scope**: Restore end-to-end workflow functionality in production
- **Priority**: CRITICAL - Core functionality broken in production

### 3. Development Environment Check
- Verify server is running (`http://localhost:5001` for local dev)
- Production URL: `https://winrybysl-production.up.railway.app/`
- Confirm database is accessible (SQLite for local dev, PostgreSQL for production)
- Check that authentication is working (Google OAuth + manual auth)
- Ensure n8n webhook endpoint is configured (currently broken in production)

---

## 🛠️ DEVELOPMENT WORKFLOW

### Phase 1: Analysis & Planning
1. **Read the current task** from STATUS.md
2. **Understand the scope** and acceptance criteria
3. **Identify affected files** and components
4. **Plan the implementation** approach
5. **Consider testing strategy**

### Phase 2: Implementation
1. **Add comprehensive file headers** to any new/modified files:
```typescript
/**
 * FILE: [filename.ts]
 * PURPOSE: [Brief description of file purpose]
 * DEPENDENCIES: [Key imports and external dependencies]
 * LAST_UPDATED: [Current date]
 * 
 * REF: [Business context - how this fits in the larger system]
 * TODO: [Any outstanding items or known improvements needed]
 * 
 * MAIN_FUNCTIONS:
 * - [function1]: [brief description]
 * - [function2]: [brief description]
 */
```

2. **Add detailed function comments**:
```typescript
/**
 * REF: [Business context for this function]
 * PURPOSE: [What this function does and why it exists]
 * @param {Type} param1 - [Description of parameter]
 * @param {Type} param2 - [Description of parameter]
 * @returns {Type} - [Description of return value]
 * 
 * BUSINESS_LOGIC:
 * - [Step 1 explanation]
 * - [Step 2 explanation]
 * 
 * ERROR_HANDLING:
 * - [What errors are caught and how]
 * 
 * TODO: [Any improvements or optimizations needed]
 */
```

3. **Add inline reference comments**:
```typescript
// REF: This connects to the prospect research workflow in n8n
// REF: User authentication is handled by auth-multi-user.ts
// REF: Database operations use Drizzle ORM with environment-specific database
```

### Phase 3: Testing & Validation
1. **Test the implementation** thoroughly
2. **Verify error handling** works correctly
3. **Check responsive design** (if frontend changes)
4. **Validate data flow** end-to-end
5. **Test edge cases** and error conditions

### Phase 4: Documentation & Status Update
1. **Update STATUS.md** with completion status
2. **Move completed items** to ✅ COMPLETED section
3. **Update current focus** to next task
4. **Add any discovered issues** to 🐛 KNOWN ISSUES
5. **Update progress metrics** if significant milestone reached

---

## 📚 CODEBASE CONTEXT & REFERENCE

### Key File Relationships (Always Reference)
```
┌─ Frontend (React + TypeScript)
│  ├─ client/src/App.tsx - Main app routing and auth
│  ├─ client/src/pages/dashboard.tsx - Main dashboard UI
│  ├─ client/src/components/ - UI components
│  └─ client/src/hooks/useAuth.ts - Authentication state
│
├─ Backend (Express + TypeScript)
│  ├─ server/index.ts - Server entry point
│  ├─ server/routes.ts - API endpoints and business logic
│  ├─ server/storage.ts - Database operations layer
│  ├─ server/auth-multi-user.ts - Multi-user authentication system
│  └─ server/db.ts - Unified database configuration
│
├─ Shared
│  └─ shared/schema.ts - Database schema and validation
│
└─ Configuration
   ├─ package.json - Dependencies and scripts
   ├─ vite.config.ts - Frontend build configuration
   └─ drizzle.config.ts - Database ORM configuration
```

### Business Logic Flow (Always Reference)
```
WORKING ON LOCALHOST:5001:
1. User Authentication (auth-multi-user.ts) → Google OAuth or manual login
2. Prospect Creation (routes.ts) → Validates data → Stores in DB (storage.ts)
3. Research Trigger (routes.ts) → Sends to n8n webhook → Processes AI research
4. Webhook Response (routes.ts) → Receives research results → Updates prospect
5. Dashboard Display (dashboard.tsx) → Shows prospects and research results
6. Reply.io Integration → Sends selected prospects to campaigns

BROKEN IN PRODUCTION:
- Step 3: n8n webhook not receiving prospects from Railway
- Step 4: No research results being returned
- Result: Core functionality broken
```

### Database Schema (Always Reference)
```sql
-- REF: Environment-specific database configuration
-- REF: SQLite for local development, PostgreSQL for production

users: id, email, first_name, last_name, profile_image_url, password_hash, 
       oauth_provider, oauth_id, created_at, updated_at
clients: id, name, is_active, created_at, updated_at
prospects: id, user_id, client_id, first_name, last_name, company, title, email, 
          linkedin_url, status, research_results, webhook_payload, error_message, 
          reply_io_campaign_id, created_at, updated_at
csv_uploads: id, user_id, client_id, file_name, total_rows, processed_rows, 
            status, created_at, updated_at
replyio_accounts: id, user_id, client_id, account_name, api_key, is_default, 
                 created_at, updated_at
replyio_campaigns: id, account_id, campaign_id, campaign_name, created_at, updated_at
sessions: sid, sess, expire
```

---

## 🎨 CODE QUALITY STANDARDS

### TypeScript Requirements
- **Full Type Safety**: No `any` types except for legacy integrations
- **Interface Definitions**: Create interfaces for all data structures
- **Error Handling**: Proper try/catch with typed error responses
- **Validation**: Use Zod schemas for runtime validation

### React Component Standards
```typescript
/**
 * FILE: ComponentName.tsx
 * PURPOSE: [Component purpose and responsibility]
 * REF: [How this component fits in the user workflow]
 */

interface ComponentNameProps {
  // REF: Clear prop definitions with business context
  prospectId: number; // REF: Links to prospects table primary key
  onUpdate?: (prospect: Prospect) => void; // REF: Callback for parent state updates
}

export function ComponentName({ prospectId, onUpdate }: ComponentNameProps) {
  // REF: State management explanation
  const [isLoading, setIsLoading] = useState(false); // REF: Loading state for API calls
  
  // REF: Business logic explanation
  const handleSubmit = async () => {
    // Implementation with clear comments
  };
  
  return (
    // JSX with accessibility and responsive design
  );
}
```

### Backend API Standards
```typescript
/**
 * REF: API endpoint for [business purpose]
 * METHOD: POST/GET/PUT/DELETE
 * AUTH: Required/Optional
 * PURPOSE: [What this endpoint accomplishes]
 */
app.post('/api/endpoint', isAuthenticated, async (req: any, res) => {
  try {
    // REF: Request validation
    const validatedData = schema.parse(req.body);
    
    // REF: Business logic
    const result = await businessLogicFunction(validatedData);
    
    // REF: Response formatting
    res.json(result);
  } catch (error) {
    // REF: Error handling with proper status codes
    console.error('Error in endpoint:', error);
    res.status(500).json({ message: 'Descriptive error message' });
  }
});
```

---

## 🔧 ENVIRONMENT & CONFIGURATION

### Local Development Setup (Always Reference)
```bash
# Current working directory: /Users/petemcgraw/Downloads/ProspectPro
# Database: SQLite (local.db file)
# Server: http://localhost:5001
# Authentication: Google OAuth + manual auth
# External Services: n8n webhook (working locally, broken in production)
```

### Production Setup (Railway)
```bash
# URL: https://winrybysl-production.up.railway.app/
# Database: PostgreSQL on Railway
# Authentication: Google OAuth + manual auth (working)
# n8n Integration: BROKEN - needs fix
# Reply.io: Working
```

### Database Configuration (Always Reference)
```typescript
// REF: Environment-specific database configuration
// REF: Local development uses SQLite for simplicity
// REF: Production uses PostgreSQL on Railway
// REF: Schema is defined in shared/schema.ts
// REF: Database config is in server/db.ts
// REF: ORM operations are in server/storage.ts
```

### External Integrations (Always Reference)
```typescript
// REF: n8n Webhook URL for AI research processing
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 
  "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e";

// REF: Webhook receives prospect data and returns research results
// REF: Results include: company info, pain points, personalized email content
// REF: Error handling includes retries and timeout management
// CRITICAL: Currently broken in Railway production - needs fix
```

---

## 🚀 CURRENT PROJECT STATE (Always Reference Before Starting)

### ✅ What's Working
- Complete end-to-end workflow on localhost:5001
- Authentication system (Google OAuth + manual)
- CSV upload with column mapping
- Prospect CRUD operations
- Reply.io integration
- PostgreSQL database in production
- React frontend with shadcn/ui components
- Dashboard with prospect management

### 🔴 What's Broken
- **n8n webhook integration in Railway production**
- Prospects not being sent for AI research
- No research results being received
- Core functionality blocked

### 🔄 What's In Progress
- **Fixing n8n webhook connection in production**
- Debugging webhook payload and connectivity
- Testing production webhook endpoints

### 🎯 Immediate Priorities (From STATUS.md)
1. Fix n8n webhook integration in production
2. Restore end-to-end workflow functionality
3. Add comprehensive webhook logging
4. Document production configuration requirements

---

## 📋 TASK EXECUTION CHECKLIST

### Before Starting Any Task:
- [ ] Read STATUS.md current focus section
- [ ] Understand acceptance criteria
- [ ] Check dependencies are completed
- [ ] Verify development environment is running
- [ ] Plan implementation approach

### During Development:
- [ ] Add comprehensive file headers
- [ ] Include detailed function comments
- [ ] Add REF comments for business context
- [ ] Implement proper error handling
- [ ] Follow TypeScript best practices
- [ ] Test functionality thoroughly

### After Completing Task:
- [ ] Verify all acceptance criteria are met
- [ ] Test edge cases and error conditions
- [ ] Update STATUS.md with completion
- [ ] Move task to ✅ COMPLETED section
- [ ] Update 🔄 CURRENT FOCUS to next task
- [ ] Add any issues to 🐛 KNOWN ISSUES
- [ ] Commit changes with descriptive message

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### Common Issues Reference
1. **n8n Webhook Connection**: Check webhook URL configuration and logs
2. **Database Connection**: Verify environment-specific database is running
3. **Authentication**: Check session management and OAuth configuration
4. **API Endpoints**: Confirm server is running on correct port
5. **Frontend State**: Use React DevTools for state debugging

### Current Critical Issue
- **n8n Integration Broken**: Webhook not working in Railway production
- **Symptoms**: Prospects created but not sent for research
- **Impact**: Entire workflow blocked
- **Debug Steps**:
  1. Check Railway logs for webhook errors
  2. Test webhook connectivity with curl
  3. Verify n8n accepts Railway URL
  4. Check payload format matches expectations

### Error Patterns to Watch For
- **Webhook Timeouts**: Long-running n8n research processes
- **CORS Issues**: Railway may have different CORS settings
- **Environment Variables**: Ensure all are set in Railway
- **Network Restrictions**: Railway firewall or network policies

---

## 📖 ADDITIONAL RESOURCES

### Documentation References
- **STATUS.md**: Current project status and roadmap
- **Winry_AI_PRD.md**: Product requirements and vision
- **PROJECT_STRUCTURE_ANALYSIS.md**: Complete codebase overview

### External Documentation
- **Drizzle ORM**: Database operations and schema management
- **shadcn/ui**: Component library documentation
- **React Query**: State management for server data
- **n8n**: Webhook integration and workflow automation
- **Railway**: Deployment and environment configuration

---

**Remember: The core functionality was fully working on localhost:5001. The current critical issue is restoring n8n webhook integration in Railway production deployment.** 