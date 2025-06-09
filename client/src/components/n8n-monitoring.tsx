/**
 * FILE: n8n-monitoring.tsx
 * PURPOSE: Real-time monitoring dashboard for n8n workflow executions
 * LAST_UPDATED: June 8, 2025
 * 
 * REF: This component provides visibility into n8n research workflow status
 * REF: Helps debug webhook issues and track prospect research progress
 * 
 * MAIN_FUNCTIONS:
 * - Real-time execution monitoring
 * - Detailed execution information
 * - Error tracking and debugging
 * - Performance metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { RefreshCw, Activity, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

/**
 * REF: Interface definitions for n8n API responses
 * PURPOSE: Type safety for execution and workflow data
 */
interface N8nExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  mode: string;
  executionTime?: number;
}

interface ProspectMonitoringData {
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
  }>;
  n8nExecutions: N8nExecution[];
}

interface ExecutionAnalytics {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  failureReasons: Array<{ reason: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

/**
 * REF: Main n8n monitoring component
 * PURPOSE: Provides real-time dashboard for tracking prospect research workflows
 */
export function N8nMonitoring() {
  const [monitoringData, setMonitoringData] = useState<ProspectMonitoringData | null>(null);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * REF: Fetch real-time monitoring data from our API
   * PURPOSE: Get current prospect processing status and n8n execution data
   */
  const fetchMonitoringData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/prospects/monitoring/status');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monitoring data: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setMonitoringData(result.monitoring);
      } else {
        throw new Error(result.message || 'Failed to fetch monitoring data');
      }
    } catch (err) {
      console.error('[N8N MONITORING] Error fetching monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  /**
   * REF: Fetch n8n executions with filtering
   * PURPOSE: Get detailed execution history and status
   */
  const fetchExecutions = async (status?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', '100');
      
      const response = await fetch(`/api/n8n/executions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch executions: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setExecutions(result.executions || []);
      } else {
        throw new Error(result.message || 'Failed to fetch executions');
      }
    } catch (err) {
      console.error('[N8N MONITORING] Error fetching executions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * REF: Fetch n8n workflows
   * PURPOSE: Get list of available workflows for context
   */
  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/n8n/workflows');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setWorkflows(result.workflows || []);
      }
    } catch (err) {
      console.error('[N8N MONITORING] Error fetching workflows:', err);
    }
  };

  /**
   * REF: Fetch execution analytics
   * PURPOSE: Get performance metrics and insights
   */
  const fetchAnalytics = async () => {
    try {
      console.log('[N8N MONITORING] Starting analytics fetch...');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      
      const url = `/api/n8n/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      console.log('[N8N MONITORING] Analytics URL:', url);
      
      const response = await fetch(url);
      console.log('[N8N MONITORING] Analytics response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[N8N MONITORING] Analytics result:', result);
      
      if (result.success) {
        console.log('[N8N MONITORING] Setting analytics data:', result.analytics);
        setAnalytics(result.analytics);
      } else {
        console.error('[N8N MONITORING] Analytics API returned success=false:', result);
      }
    } catch (err) {
      console.error('[N8N MONITORING] Error fetching analytics:', err);
      setError(`Failed to fetch analytics: ${err.message}`);
    }
  };

  /**
   * REF: Get status badge variant based on execution status
   * PURPOSE: Visual representation of execution states
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Activity className="w-3 h-3 mr-1" />
          {status}
        </Badge>;
      case 'success':
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>;
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          {status}
        </Badge>;
      default:
        return <Badge variant="outline">
          <AlertCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>;
    }
  };

  /**
   * REF: Format execution time for display
   * PURPOSE: Human-readable time formatting
   */
  const formatExecutionTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  /**
   * REF: Format percentage for display
   * PURPOSE: Consistent percentage formatting
   */
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // REF: Auto-refresh mechanism for real-time updates
  useEffect(() => {
    fetchMonitoringData();
    fetchWorkflows();
    fetchExecutions();
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMonitoringData();
        fetchExecutions('running'); // Focus on running executions for real-time updates
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">n8n Workflow Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time tracking of prospect research workflows and executions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchMonitoringData();
              fetchExecutions();
              fetchAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Prospects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.processingProspects || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently being researched
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active n8n Executions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.activeN8nExecutions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Running workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate (7d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? formatPercentage(analytics.successRate) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Workflow success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? formatExecutionTime(analytics.averageDuration) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average execution time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="prospects" className="w-full">
        <TabsList>
          <TabsTrigger value="prospects">Processing Prospects</TabsTrigger>
          <TabsTrigger value="executions">n8n Executions</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Processing Prospects Tab */}
        <TabsContent value="prospects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Processing Prospects</CardTitle>
              <CardDescription>
                Prospects currently being researched by n8n workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {!monitoringData?.prospects.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No prospects currently being processed
                  </div>
                ) : (
                  <div className="space-y-2">
                    {monitoringData.prospects.map((prospect) => (
                      <div
                        key={prospect.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {prospect.firstName} {prospect.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {prospect.company} • Created {new Date(prospect.createdAt).toLocaleString()}
                          </div>
                          {prospect.n8nExecutionId && (
                            <div className="text-xs text-blue-600 mt-1">
                              Execution ID: {prospect.n8nExecutionId}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(prospect.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* n8n Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent n8n Executions</CardTitle>
              <CardDescription>
                Latest workflow executions with status and timing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExecutions()}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExecutions('running')}
                >
                  Running
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExecutions('success')}
                >
                  Success
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExecutions('failed')}
                >
                  Failed
                </Button>
              </div>
              
              <ScrollArea className="h-96">
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {loading ? 'Loading executions...' : 'No executions found'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {executions.map((execution) => (
                      <div
                        key={execution.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">Execution {execution.id}</div>
                          <div className="text-sm text-muted-foreground">
                            Started: {new Date(execution.startedAt).toLocaleString()}
                            {execution.stoppedAt && (
                              <> • Finished: {new Date(execution.stoppedAt).toLocaleString()}</>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Duration: {formatExecutionTime(execution.executionTime)} • Mode: {execution.mode}
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(execution.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Workflows</CardTitle>
              <CardDescription>
                n8n workflows configured for prospect research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {workflows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No workflows configured
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{workflow.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {workflow.id} • {workflow.active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Badge variant={workflow.active ? 'default' : 'secondary'}>
                            {workflow.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Executions:</span>
                      <span className="font-medium">{analytics.totalExecutions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium">{formatPercentage(analytics.successRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Duration:</span>
                      <span className="font-medium">{formatExecutionTime(analytics.averageDuration)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading analytics...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Research Productivity */}
            <Card>
              <CardHeader>
                <CardTitle>Research Productivity</CardTitle>
                <CardDescription>Prospect research efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Prospects Researched:</span>
                    <span className="font-medium">{analytics?.totalExecutions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Average:</span>
                    <span className="font-medium">{analytics ? Math.round(analytics.totalExecutions / 7) : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time per Prospect:</span>
                    <span className="font-medium">{analytics ? formatExecutionTime(analytics.averageDuration) : 'N/A'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Based on successful n8n workflow executions
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Business Impact</CardTitle>
                <CardDescription>ROI and time savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Time Saved:</span>
                    <span className="font-medium">
                      {analytics ? Math.round((analytics.totalExecutions * 15) / 60) : 0}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Research Cost:</span>
                    <span className="font-medium">
                      ${analytics ? (analytics.totalExecutions * 25).toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ROI Multiplier:</span>
                    <span className="font-medium text-green-600">10x</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Estimated based on 15min/prospect @ $100/hr manual research
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Research Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Research Quality</CardTitle>
                <CardDescription>Data enrichment success</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">{analytics ? formatPercentage(analytics.successRate) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Quality Score:</span>
                    <span className="font-medium">{analytics && analytics.successRate > 80 ? 'High' : analytics && analytics.successRate > 60 ? 'Medium' : 'Needs Improvement'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Lookups:</span>
                    <span className="font-medium">{analytics ? (analytics.totalExecutions - Math.round(analytics.totalExecutions * analytics.successRate / 100)) : 0}</span>
                  </div>
                  {analytics && analytics.successRate < 80 && (
                    <div className="text-xs text-orange-600 mt-2">
                      ⚠️ Consider optimizing LinkedIn profile detection
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Peak Usage Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Hours</CardTitle>
                <CardDescription>When research happens most</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.hourlyDistribution ? (
                  <div className="space-y-2">
                    {analytics.hourlyDistribution
                      .map((item, index) => ({ ...item, hour: index }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 3)
                      .map((item, index) => (
                        <div key={item.hour} className="flex justify-between items-center">
                          <span className="text-sm">
                            {item.hour}:00 - {item.hour + 1}:00
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.count}</span>
                            {index === 0 && <Badge variant="secondary">Peak</Badge>}
                          </div>
                        </div>
                      ))}
                    <div className="text-xs text-muted-foreground mt-2">
                      Top 3 busiest hours for prospect research
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No usage data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optimization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Opportunities</CardTitle>
                <CardDescription>Ways to improve efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics ? (
                    <>
                      {analytics.successRate < 90 && (
                        <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Improve Success Rate</div>
                            <div className="text-muted-foreground">Current: {formatPercentage(analytics.successRate)}, Target: 90%+</div>
                          </div>
                        </div>
                      )}
                      {analytics.averageDuration > 120000 && (
                        <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Optimize Processing Time</div>
                            <div className="text-muted-foreground">Current: {formatExecutionTime(analytics.averageDuration)}, Target: &lt;2min</div>
                          </div>
                        </div>
                      )}
                      {analytics.totalExecutions > 0 && (
                        <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                          <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Great Progress!</div>
                            <div className="text-muted-foreground">{analytics.totalExecutions} prospects researched this week</div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Start processing prospects to see optimization recommendations
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Common Failure Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>Common Issues & Solutions</CardTitle>
              <CardDescription>Most frequent problems and how to fix them</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {analytics?.failureReasons.length ? (
                  <div className="space-y-3">
                    {analytics.failureReasons.map((failure, index) => (
                      <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{failure.reason}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {failure.reason.toLowerCase().includes('linkedin') ? 
                              '💡 Solution: Ensure prospects have valid LinkedIn profiles' :
                              failure.reason.toLowerCase().includes('timeout') ?
                              '💡 Solution: Check n8n workflow performance' :
                              failure.reason.toLowerCase().includes('api') ?
                              '💡 Solution: Verify API credentials and rate limits' :
                              '💡 Solution: Check n8n workflow configuration'
                            }
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <Badge variant="outline">{failure.count}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((failure.count / analytics.totalExecutions) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <div className="font-medium">No Issues Found!</div>
                    <div className="text-sm">All workflows are running smoothly</div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default N8nMonitoring; 