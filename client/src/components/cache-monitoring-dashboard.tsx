/**
 * FILE: cache-monitoring-dashboard.tsx
 * PURPOSE: Monitoring dashboard for API caching and rate limiting system
 * DEPENDENCIES: React, API endpoints for cache stats
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Provides real-time monitoring of cache performance and rate limiting
 * 
 * MAIN_FEATURES:
 * - Cache hit/miss ratio monitoring
 * - Rate limiting status and usage tracking
 * - API response time monitoring
 * - Cache size and memory usage tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { RefreshCw, Activity, Database, Clock, AlertTriangle } from 'lucide-react';

interface ApiResponse {
  success: boolean;
  statistics: {
    cache: {
      size: number;
      maxSize: number;
      memoryUsageMB: number;
      maxMemoryMB: number;
      hitCount: number;
      missCount: number;
      hitRate: number;
      entries: any[];
    };
    rateLimiting: {
      totalTrackedKeys: number;
      queueLength: number;
      queuedByPriority: {
        high: number;
        medium: number;
        low: number;
      };
      apiUsage: {
        [key: string]: {
          totalKeys: number;
          totalRequests: number;
          maxRequests: number;
          windowMs: number;
        };
      };
    };
    performance: {
      totalRequests: number;
      cacheHits: number;
      rateLimitHits: number;
      averageResponseTime: number;
      responseTimeTotal: number;
      cacheHitRate: number;
      rateLimitHitRate: number;
    };
  };
  timestamp: string;
}

interface CacheMonitoringDashboardProps {
  className?: string;
}

export function CacheMonitoringDashboard({ className }: CacheMonitoringDashboardProps) {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // REF: Fetch cache statistics from API
  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cache/statistics', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiData(data);
      }
    } catch (error) {
      console.error('Failed to fetch cache statistics:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  // REF: Auto-refresh every 30 seconds
  useEffect(() => {
    fetchCacheStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchCacheStats, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // REF: Manual refresh handler
  const handleRefresh = () => {
    fetchCacheStats();
  };

  if (loading && !apiData) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="animate-spin h-6 w-6 mr-2" />
        <span>Loading cache monitoring data...</span>
      </div>
    );
  }

  if (!apiData || !apiData.success) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Cache Monitoring Unavailable</h3>
        <p className="text-gray-600 mb-4">Unable to load cache monitoring data.</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const stats = apiData.statistics;
  const outreachUsage = stats.rateLimiting.apiUsage['reply.io'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Cache Monitoring</h2>
          <p className="text-gray-600">Real-time caching and rate limiting performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cache Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.cache.hitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              {stats.cache.hitCount} hits / {stats.performance.totalRequests} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cache.size}
            </div>
            <p className="text-xs text-gray-600">
              {stats.cache.memoryUsageMB.toFixed(1)}MB / {stats.cache.maxMemoryMB}MB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.performance.averageResponseTime.toFixed(1)}ms
            </div>
            <p className="text-xs text-gray-600">All requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.performance.rateLimitHitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              {stats.performance.rateLimitHits} rate limited
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limiting Status */}
      {outreachUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Daily API Quota</span>
                  <span>
                    {outreachUsage.totalRequests} / {outreachUsage.maxRequests}
                  </span>
                </div>
                <Progress 
                  value={(outreachUsage.totalRequests / outreachUsage.maxRequests) * 100} 
                  className="h-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tracked Keys:</span>
                  <span className="ml-2 font-medium">{outreachUsage.totalKeys}</span>
                </div>
                <div>
                  <span className="text-gray-600">Window:</span>
                  <span className="ml-2 font-medium">{Math.round(outreachUsage.windowMs / 1000 / 60 / 60)}h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Request Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.rateLimiting.queueLength}</div>
              <p className="text-sm text-gray-600">Total Queued</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rateLimiting.queuedByPriority.high}</div>
              <p className="text-sm text-gray-600">High Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.rateLimiting.queuedByPriority.medium}</div>
              <p className="text-sm text-gray-600">Medium Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.rateLimiting.queuedByPriority.low}</div>
              <p className="text-sm text-gray-600">Low Priority</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-500">
                <Activity className="h-3 w-3 mr-1" />
                Cache Active
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {stats.rateLimiting.totalTrackedKeys} APIs Tracked
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                <Database className="h-3 w-3 mr-1" />
                {stats.cache.entries.length} Entries
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()} • Data from: {new Date(apiData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

// REF: Default export for lazy loading
export default CacheMonitoringDashboard;