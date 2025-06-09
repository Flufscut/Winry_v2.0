# n8n API Integration - Real-Time Monitoring System

## 🎯 Overview

This document describes the complete n8n API integration implemented to provide real-time monitoring and debugging capabilities for Winry.AI's prospect research workflow. This integration enables comprehensive tracking of n8n workflow executions, performance analytics, and enhanced debugging tools.

## 📊 What This Solves

### Primary Goal
Enable real-time tracking and debugging of n8n workflow executions to:
1. **Debug Production Issues**: Monitor webhook connectivity and execution status
2. **Performance Monitoring**: Track success rates, execution times, and bottlenecks
3. **Error Analysis**: Identify failure patterns and root causes
4. **Real-Time Visibility**: See exactly what's happening with prospect research workflows

### Current Production Issue
The core Winry.AI functionality (AI prospect research) is broken in Railway production due to n8n webhook connectivity issues. This monitoring system provides the tools needed to:
- Verify if webhooks are reaching n8n
- Monitor execution success/failure rates
- Debug specific execution failures
- Track performance metrics

## 🏗️ Architecture Overview

### Components Implemented

1. **Backend API Layer** (`server/n8n-api.ts`)
   - Direct integration with n8n Cloud API
   - Authentication and error handling
   - Rate limiting compliance
   - Debug information extraction

2. **Database Integration** (`shared/schema.ts`, `migrations/`)
   - Added n8n execution tracking fields to prospects table
   - Proper indexing for performance
   - Migration scripts for production deployment

3. **API Endpoints** (`server/routes.ts`)
   - RESTful API for accessing n8n data
   - Comprehensive error handling
   - Authentication protection

4. **React Dashboard** (`client/src/components/n8n-monitoring.tsx`)
   - Real-time monitoring interface
   - Performance analytics
   - Debug tools and information display

5. **Navigation Integration** (`client/src/pages/dashboard.tsx`)
   - Added to main dashboard navigation
   - Lazy-loaded for performance

## 📋 API Endpoints

### Monitoring Endpoints

#### `GET /api/prospects/monitoring/status`
**Purpose**: Get current prospect processing status and active n8n executions
**Response**: 
```json
{
  "success": true,
  "data": {
    "processingProspects": 5,
    "activeN8nExecutions": 3,
    "prospects": [...],
    "n8nExecutions": [...]
  }
}
```

#### `GET /api/n8n/executions`
**Purpose**: List n8n executions with filtering capabilities
**Parameters**:
- `status`: Filter by execution status (running, success, failed, waiting)
- `workflowId`: Filter by specific workflow
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset
- `startedAfter`: Filter by start date
- `startedBefore`: Filter by end date

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [...executions],
    "count": 150,
    "hasMore": true
  }
}
```

#### `GET /api/n8n/executions/:executionId`
**Purpose**: Get detailed information about a specific execution
**Response**: Detailed execution data including input/output, timing, and status

#### `GET /api/n8n/executions/current`
**Purpose**: Get currently active/running executions
**Response**: List of executions with status "running"

#### `GET /api/n8n/workflows`
**Purpose**: List available n8n workflows
**Response**: Workflow configuration and status information

#### `GET /api/n8n/analytics`
**Purpose**: Get performance metrics and analytics
**Parameters**:
- `startDate`: Analytics start date (default: 7 days ago)
- `endDate`: Analytics end date (default: now)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalExecutions": 245,
    "successRate": 87.3,
    "averageDuration": 45000,
    "failureReasons": [...],
    "hourlyDistribution": [...]
  }
}
```

#### `GET /api/n8n/executions/:executionId/debug`
**Purpose**: Get comprehensive debug information for troubleshooting
**Response**: Detailed execution logs, error information, and debug data

## 🖥️ Dashboard Features

### Real-Time Monitoring Dashboard

#### Overview Cards
- **Processing Prospects**: Current number being researched
- **Active n8n Executions**: Currently running workflows
- **Success Rate (7d)**: Recent performance metrics
- **Average Duration**: Typical execution time

#### Processing Prospects Tab
- List of prospects currently being processed
- Status tracking with visual badges
- n8n execution ID linking
- Creation timestamps and progress

#### n8n Executions Tab
- Comprehensive execution history
- Filtering by status (All, Running, Success, Failed)
- Execution timing and duration information
- Status badges with visual indicators

#### Workflows Tab
- Available n8n workflows
- Active/inactive status
- Workflow configuration information

#### Analytics Tab
- Performance metrics over time periods
- Success rate tracking
- Common failure reasons analysis
- Execution time trends

#### Auto-Refresh
- Configurable real-time updates (default: 10 seconds)
- Manual refresh capability
- Auto-refresh toggle for performance

## 🗃️ Database Schema Updates

### New Fields Added to `prospects` Table

```sql
-- n8n execution tracking
n8nExecutionId TEXT,
n8nStartedAt TEXT,
n8nCompletedAt TEXT,

-- Indexes for performance
CREATE INDEX idx_prospects_n8n_execution_id ON prospects(n8nExecutionId);
CREATE INDEX idx_prospects_n8n_started_at ON prospects(n8nStartedAt);
CREATE INDEX idx_prospects_n8n_completed_at ON prospects(n8nCompletedAt);
```

### Migration
- Migration file: `migrations/0005_add_n8n_execution_tracking.sql`
- Safely adds new fields without affecting existing data
- Creates performance indexes

## 🔧 Configuration

### Environment Variables

```bash
# n8n API Integration
N8N_API_BASE_URL=https://salesleopard.app.n8n.cloud
N8N_API_KEY=your_n8n_api_key_here
```

### Setup Steps

1. **Obtain n8n API Key**
   - Log into your n8n Cloud account
   - Navigate to Settings → API Keys
   - Generate new API key with appropriate permissions

2. **Set Environment Variables**
   - Add `N8N_API_KEY` to Railway environment variables
   - Verify `N8N_API_BASE_URL` points to correct n8n instance

3. **Run Database Migration**
   - Migration will run automatically on next deployment
   - Or manually run: `npx drizzle-kit push --force`

4. **Access Dashboard**
   - Navigate to main dashboard
   - Click "n8n Monitoring" tab
   - Dashboard will auto-refresh every 10 seconds

## 📈 Usage for Debugging Production Issue

### Debugging Workflow

1. **Check Webhook Connectivity**
   - Monitor "Processing Prospects" tab
   - Verify prospects appear after CSV upload
   - Check if n8n execution IDs are being assigned

2. **Monitor n8n Executions**
   - Switch to "n8n Executions" tab
   - Filter by "Running" to see active executions
   - Check if new executions appear when prospects are uploaded

3. **Analyze Failure Patterns**
   - Review failed executions
   - Use debug endpoint for detailed error information
   - Check analytics for failure trends

4. **Performance Analysis**
   - Monitor success rates
   - Check execution durations
   - Identify bottlenecks or timeouts

### Key Diagnostic Questions

- **Are webhooks reaching n8n?** → Check if executions appear in n8n dashboard
- **Are executions starting?** → Monitor "Running" executions after prospect upload
- **Where are executions failing?** → Use debug endpoints for error details
- **Is this a recent issue?** → Check analytics for historical success rates

## 🔍 Troubleshooting Common Issues

### No Executions Appearing
- **Cause**: Webhooks not reaching n8n
- **Check**: Verify webhook URL and network connectivity
- **Solution**: Update n8n workflow to accept Railway URL

### Executions Failing Immediately
- **Cause**: Authentication or payload format issues
- **Check**: Debug endpoint for specific error messages
- **Solution**: Verify API key and payload structure

### Long Execution Times
- **Cause**: n8n workflow performance issues
- **Check**: Analytics tab for duration trends
- **Solution**: Optimize n8n workflow or increase timeouts

### Authentication Errors
- **Cause**: Invalid or expired API key
- **Check**: Test API key directly with n8n
- **Solution**: Generate new API key and update environment variables

## 🚀 Benefits

### For Debugging
- **Real-Time Visibility**: Immediate feedback on execution status
- **Error Identification**: Specific error messages and debug information
- **Performance Monitoring**: Track trends and identify bottlenecks
- **Historical Analysis**: Review past executions and patterns

### for Production Operations
- **Health Monitoring**: Continuous monitoring of AI research pipeline
- **Performance Optimization**: Identify and resolve performance issues
- **Proactive Issue Detection**: Early warning for system problems
- **Data-Driven Decisions**: Analytics for system optimization

### For Development
- **Enhanced Testing**: Comprehensive testing of n8n integrations
- **Debug Information**: Detailed execution logs and error traces
- **Performance Profiling**: Execution timing and resource usage
- **Quality Assurance**: Validation of webhook reliability

## 📅 Next Steps

### Immediate (Production Fix)
1. Use monitoring dashboard to diagnose current webhook issue
2. Verify if executions are created when prospects are uploaded
3. Check execution failure patterns and error messages
4. Use debug endpoints to identify specific connection issues

### Short Term (Optimization)
1. Add webhook retry mechanisms based on monitoring data
2. Implement automatic error recovery
3. Add alerting for execution failures
4. Optimize n8n workflows based on performance data

### Long Term (Enhancement)
1. Predictive analytics for execution success
2. Automated scaling based on execution load
3. Integration with additional monitoring tools
4. Custom dashboards for different user roles

---

This n8n API integration provides comprehensive monitoring and debugging capabilities that are essential for maintaining and optimizing the Winry.AI prospect research workflow. The real-time visibility and detailed analytics enable rapid identification and resolution of issues, ensuring reliable operation of the AI-powered research pipeline. 