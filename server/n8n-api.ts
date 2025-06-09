/**
 * FILE: n8n-api.ts
 * PURPOSE: n8n API integration for real-time workflow monitoring
 * LAST_UPDATED: June 8, 2025
 * 
 * REF: This module provides comprehensive n8n API integration for tracking
 * REF: prospect research workflow executions in real-time
 * 
 * MAIN_FUNCTIONS:
 * - Track workflow executions by status
 * - Get detailed execution information
 * - Monitor active/running workflows
 * - Link prospects to n8n executions
 * - Provide debugging and performance data
 */

import { updateProspectN8nExecution } from './storage.js';

// REF: n8n API configuration
const N8N_API_BASE_URL = process.env.N8N_API_BASE_URL || 'https://salesleopard.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || ''; // REF: Set this in Railway environment variables

/**
 * REF: n8n API client for making authenticated requests
 * PURPOSE: Centralized API client with authentication and error handling
 */
class N8nApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * REF: Make authenticated API request to n8n
   * PURPOSE: Handle authentication, errors, and response parsing
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      console.log(`[N8N API] Making request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log(`[N8N API] Success: ${endpoint}`);
      return data;
      
    } catch (error) {
      console.error(`[N8N API] Error calling ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * REF: Get workflow executions with filtering options
   * PURPOSE: Track executions by status, workflow, date range, etc.
   */
  async getExecutions(filters: {
    status?: 'running' | 'success' | 'failed' | 'waiting' | 'error';
    workflowId?: string;
    limit?: number;
    offset?: number;
    startedAfter?: Date;
    startedBefore?: Date;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.workflowId) params.append('workflowId', filters.workflowId);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.startedAfter) params.append('startedAfter', filters.startedAfter.toISOString());
    if (filters.startedBefore) params.append('startedBefore', filters.startedBefore.toISOString());

    const queryString = params.toString();
    const endpoint = `/executions${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  /**
   * REF: Get detailed information about a specific execution
   * PURPOSE: Debug execution issues and get detailed processing data
   */
  async getExecutionDetails(executionId: string): Promise<any> {
    return this.makeRequest(`/executions/${executionId}`);
  }

  /**
   * REF: Get currently active (running) executions
   * PURPOSE: Monitor real-time workflow processing
   */
  async getActiveExecutions(): Promise<any> {
    return this.makeRequest('/executions/current');
  }

  /**
   * REF: Get list of available workflows
   * PURPOSE: Understand available workflows and their configurations
   */
  async getWorkflows(): Promise<any> {
    return this.makeRequest('/workflows');
  }

  /**
   * REF: Get workflow details including nodes and configuration
   * PURPOSE: Debug workflow setup and node configurations
   */
  async getWorkflowDetails(workflowId: string): Promise<any> {
    return this.makeRequest(`/workflows/${workflowId}`);
  }
}

// REF: Initialize n8n API client
const n8nClient = new N8nApiClient(N8N_API_BASE_URL, N8N_API_KEY);

/**
 * REF: Enhanced prospect monitoring with n8n execution tracking
 * PURPOSE: Get comprehensive status of prospects and their n8n executions
 */
export async function getProspectMonitoringStatus(): Promise<{
  processingProspects: number;
  activeN8nExecutions: number;
  prospects: Array<{
    id: number;
    firstName: string;
    lastName: string;
    company: string;
    status: string;
    createdAt: string;
    n8nExecutionId?: string;
    executionStatus?: string;
    executionStartTime?: string;
    executionDuration?: number;
  }>;
  n8nExecutions: any[];
}> {
  try {
    // REF: Get currently processing prospects from database
    // This would use your existing storage functions
    const processingProspects = []; // TODO: Implement getProspectsByStatus('processing')
    
    // REF: Get active n8n executions
    const activeExecutions = await n8nClient.getActiveExecutions();
    
    // REF: Get recent executions for context
    const recentExecutions = await n8nClient.getExecutions({
      limit: 50,
      startedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    });

    return {
      processingProspects: processingProspects.length,
      activeN8nExecutions: activeExecutions.data?.length || 0,
      prospects: processingProspects,
      n8nExecutions: recentExecutions.data || []
    };
    
  } catch (error) {
    console.error('[PROSPECT MONITORING] Error getting status:', error);
    throw error;
  }
}

/**
 * REF: Track prospect through n8n workflow execution
 * PURPOSE: Link prospect to n8n execution for real-time tracking
 */
export async function trackProspectExecution(
  prospectId: number, 
  userId: number,
  webhookPayload: any
): Promise<void> {
  try {
    console.log(`[N8N TRACKING] Starting tracking for prospect ${prospectId}`);
    
    // REF: Mark prospect as processing
    await updateProspectN8nExecution(prospectId, userId, 'pending', 'processing');
    
    // REF: Send to n8n webhook and capture execution info
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://salesleopard.app.n8n.cloud/webhook/baa30a41-a24c-4154-84c1-c0e3a2ca572e';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    // REF: In n8n Cloud, execution ID might be returned in response headers
    // or we may need to poll for recent executions to find our execution
    const executionId = response.headers.get('x-n8n-execution-id');
    
    if (executionId) {
      await updateProspectN8nExecution(prospectId, userId, executionId, 'running');
      console.log(`[N8N TRACKING] Linked prospect ${prospectId} to execution ${executionId}`);
      
      // REF: Start monitoring this execution
      monitorExecution(executionId, prospectId, userId);
    } else {
      console.log(`[N8N TRACKING] No execution ID returned, will track by correlation`);
      // REF: We'll need to correlate by prospect data or timing
    }
    
  } catch (error) {
    console.error(`[N8N TRACKING] Error tracking prospect ${prospectId}:`, error);
    await updateProspectN8nExecution(prospectId, userId, 'error', 'failed');
  }
}

/**
 * REF: Monitor n8n execution progress and update prospect status
 * PURPOSE: Real-time tracking of execution status changes
 */
async function monitorExecution(executionId: string, prospectId: number, userId: number): Promise<void> {
  const maxAttempts = 60; // Monitor for up to 30 minutes (30 second intervals)
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      attempts++;
      
      const execution = await n8nClient.getExecutionDetails(executionId);
      const status = execution.finished ? 
        (execution.success ? 'completed' : 'failed') : 
        'running';
      
      console.log(`[N8N MONITORING] Execution ${executionId} status: ${status} (attempt ${attempts})`);
      
      // REF: Update prospect with current status
      await updateProspectN8nExecution(prospectId, userId, executionId, status);
      
      if (execution.finished) {
        // REF: Execution completed, stop monitoring
        if (execution.success) {
          console.log(`[N8N MONITORING] ✅ Execution ${executionId} completed successfully`);
          // REF: Could extract research results from execution data here
        } else {
          console.log(`[N8N MONITORING] ❌ Execution ${executionId} failed:`, execution.error);
        }
        return;
      }
      
      if (attempts < maxAttempts) {
        // REF: Continue monitoring
        setTimeout(checkStatus, 30000); // Check every 30 seconds
      } else {
        console.log(`[N8N MONITORING] ⏰ Monitoring timeout for execution ${executionId}`);
        await updateProspectN8nExecution(prospectId, userId, executionId, 'timeout');
      }
      
    } catch (error) {
      console.error(`[N8N MONITORING] Error checking execution ${executionId}:`, error);
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 30000); // Retry on error
      }
    }
  };
  
  // REF: Start monitoring with initial delay
  setTimeout(checkStatus, 10000); // Wait 10 seconds before first check
}

/**
 * REF: Get execution performance analytics
 * PURPOSE: Provide insights into n8n workflow performance
 */
export async function getExecutionAnalytics(timeRange: {
  startDate: Date;
  endDate: Date;
}): Promise<{
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  failureReasons: Array<{ reason: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}> {
  try {
    const executions = await n8nClient.getExecutions({
      startedAfter: timeRange.startDate,
      startedBefore: timeRange.endDate,
      limit: 1000 // Adjust based on expected volume
    });

    const data = executions.data || [];
    const total = data.length;
    const successful = data.filter((exec: any) => exec.success).length;
    const durations = data
      .filter((exec: any) => exec.executionTime)
      .map((exec: any) => exec.executionTime);
    
    const avgDuration = durations.length > 0 ? 
      durations.reduce((sum: number, dur: number) => sum + dur, 0) / durations.length : 0;

    // REF: Analyze failure reasons
    const failures = data.filter((exec: any) => !exec.success);
    const failureReasons = failures.reduce((acc: any, exec: any) => {
      const reason = exec.error?.message || 'Unknown error';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    // REF: Hourly distribution
    const hourlyDist = new Array(24).fill(0);
    data.forEach((exec: any) => {
      const hour = new Date(exec.startedAt).getHours();
      hourlyDist[hour]++;
    });

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: avgDuration,
      failureReasons: Object.entries(failureReasons).map(([reason, count]) => ({
        reason,
        count: count as number
      })),
      hourlyDistribution: hourlyDist.map((count, hour) => ({ hour, count }))
    };
    
  } catch (error) {
    console.error('[EXECUTION ANALYTICS] Error getting analytics:', error);
    throw error;
  }
}

/**
 * REF: Debug execution details for troubleshooting
 * PURPOSE: Get comprehensive execution data for debugging
 */
export async function getExecutionDebugInfo(executionId: string): Promise<{
  execution: any;
  nodeData: Array<{
    nodeName: string;
    status: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    inputData?: any;
    outputData?: any;
    error?: any;
  }>;
  performance: {
    totalDuration: number;
    nodePerformance: Array<{ node: string; duration: number; percentage: number }>;
  };
}> {
  try {
    const execution = await n8nClient.getExecutionDetails(executionId);
    
    // REF: Extract node-level execution data
    const nodeData = [];
    if (execution.data && execution.data.resultData) {
      // Process node execution data
      // This would depend on n8n's specific response format
    }
    
    // REF: Calculate performance metrics
    const totalDuration = execution.executionTime || 0;
    const nodePerformance = []; // Calculate per-node performance
    
    return {
      execution,
      nodeData,
      performance: {
        totalDuration,
        nodePerformance
      }
    };
    
  } catch (error) {
    console.error(`[EXECUTION DEBUG] Error getting debug info for ${executionId}:`, error);
    throw error;
  }
}

// REF: Export n8n client for direct access if needed
export { n8nClient };

// REF: Export API functions for use in routes
export {
  n8nClient as callN8nApi,
  getExecutions as getN8nExecutions,
  getExecutionDetails as getN8nExecutionDetails,
  getActiveExecutions as getCurrentN8nExecutions,
  getWorkflows as getN8nWorkflows
} from './n8n-api.js';

// REF: Helper functions to match existing route patterns
export async function getExecutions(filters: any = {}) {
  return n8nClient.getExecutions(filters);
}

export async function getExecutionDetails(executionId: string) {
  return n8nClient.getExecutionDetails(executionId);
}

export async function getActiveExecutions() {
  return n8nClient.getActiveExecutions();
}

export async function getWorkflows() {
  return n8nClient.getWorkflows();
} 