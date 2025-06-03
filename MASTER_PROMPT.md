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
- **Current Task**: Identify from STATUS.md what is currently being worked on
- **Dependencies**: Check if prerequisites are completed
- **Scope**: Understand the specific acceptance criteria
- **Priority**: Confirm task priority and effort estimation

### 3. Development Environment Check
- Verify server is running (`http://localhost:5001`)
- Confirm database is accessible (SQLite for local dev)
- Check that authentication is working (auto-login for dev)
- Ensure n8n webhook endpoint is configured

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
// REF: User authentication is handled by auth-local.ts for development
// REF: Database operations use Drizzle ORM with SQLite for local dev
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
│  ├─ server/auth-local.ts - Local development authentication
│  └─ server/db-local.ts - SQLite database configuration
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
1. User Authentication (auth-local.ts) → Auto-login for development
2. Prospect Creation (routes.ts) → Validates data → Stores in DB (storage.ts)
3. Research Trigger (routes.ts) → Sends to n8n webhook → Processes AI research
4. Webhook Response (routes.ts) → Receives research results → Updates prospect
5. Dashboard Display (dashboard.tsx) → Shows prospects and research results
```

### Database Schema (Always Reference)
```sql
-- REF: Current schema is SQLite-compatible for local development
-- REF: Production will use PostgreSQL with same structure

users: id, email, first_name, last_name, profile_image_url, created_at, updated_at
prospects: id, user_id, first_name, last_name, company, title, email, linkedin_url, 
          status, research_results, webhook_payload, error_message, created_at, updated_at
csv_uploads: id, user_id, file_name, total_rows, processed_rows, status, created_at, updated_at
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
# Current working directory: /Users/petemcgraw/Downloads/Winry.AI
# Database: SQLite (local.db file)
# Server: http://localhost:5001
# Authentication: Auto-login with mock user (dev@local.com)
# External Services: n8n webhook (configured in routes.ts)
```

### Database Configuration (Always Reference)
```typescript
// REF: Local development uses SQLite for simplicity
// REF: Production will use PostgreSQL via Neon
// REF: Schema is defined in shared/schema.ts
// REF: Local config is in server/db-local.ts
// REF: ORM operations are in server/storage.ts
```

### External Integrations (Always Reference)
```typescript
// REF: n8n Webhook URL for AI research processing
const WEBHOOK_URL = "https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e";

// REF: Webhook receives prospect data and returns research results
// REF: Results include: company info, pain points, personalized email content
// REF: Error handling includes retries and timeout management
```

---

## 🚀 CURRENT PROJECT STATE (Always Reference Before Starting)

### ✅ What's Working
- Basic CRUD operations for prospects
- Authentication system (development mode)
- CSV upload with column mapping
- n8n integration for AI research
- SQLite database with proper schema
- React frontend with shadcn/ui components
- Dashboard with basic prospect management

### 🔄 What's In Progress
- **Check STATUS.md for current active task**

### 🎯 Immediate Priorities (From STATUS.md)
1. Database Schema Optimization
2. Enhanced Prospect Management
3. Research Quality & Reliability
4. User Experience Improvements

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
1. **Database Connection**: Check SQLite file exists and permissions
2. **Authentication**: Verify auto-login is working (check console logs)
3. **API Endpoints**: Confirm server is running on port 5001
4. **n8n Integration**: Check webhook URL and payload format
5. **Frontend State**: Use React DevTools for state debugging

### Error Patterns to Watch For
- **Database Schema Mismatches**: SQLite vs PostgreSQL syntax differences
- **Authentication Failures**: Development bypass not working
- **Webhook Timeouts**: Long-running n8n research processes
- **CSV Upload Issues**: Data validation and parsing errors

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

---

**Remember: This prompt should be referenced before every development session to maintain context and ensure consistent progress toward project goals.** 