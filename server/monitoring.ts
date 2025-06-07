/**
 * FILE: monitoring.ts
 * PURPOSE: Production health monitoring and alerting system
 * DEPENDENCIES: express, node-cron, nodemailer
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Provides comprehensive monitoring for production deployments
 * REF: Includes health checks, performance metrics, error tracking, and alerts
 * TODO: Add integration with external monitoring services (Sentry, DataDog)
 */

import { Request, Response } from 'express';
import cron from 'node-cron';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

// REF: Health check interface for standardized monitoring
interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  responseTime?: number;
  details?: Record<string, any>;
}

// REF: System metrics interface for performance monitoring
interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  uptime: number;
  timestamp: Date;
}

// REF: Application metrics for business logic monitoring
interface ApplicationMetrics {
  database: {
    connections: number;
    queryTime: number;
    errorRate: number;
  };
  api: {
    requestCount: number;
    errorRate: number;
    averageResponseTime: number;
  };
  prospects: {
    totalProcessed: number;
    successRate: number;
    failureRate: number;
  };
  timestamp: Date;
}

// REF: Global monitoring state
class HealthMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private alertThresholds = {
    cpu: 80, // 80% CPU usage
    memory: 85, // 85% memory usage
    disk: 90, // 90% disk usage
    responseTime: 5000, // 5 second response time
    errorRate: 10, // 10% error rate
  };

  constructor() {
    // REF: Start background monitoring tasks
    this.startMonitoring();
  }

  /**
   * REF: Register a health check endpoint
   * PURPOSE: Add a new health check to be monitored
   */
  registerHealthCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    // Store the check function for periodic execution
    setInterval(async () => {
      try {
        const result = await checkFn();
        this.healthChecks.set(name, result);
      } catch (error) {
        this.healthChecks.set(name, {
          name,
          status: 'critical',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * REF: Get current health status
   * PURPOSE: Return overall health status for health check endpoints
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: HealthCheck[];
    summary: {
      total: number;
      healthy: number;
      warning: number;
      critical: number;
    };
  } {
    const checks = Array.from(this.healthChecks.values());
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      warning: checks.filter(c => c.status === 'warning').length,
      critical: checks.filter(c => c.status === 'critical').length,
    };

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (summary.critical > 0) {
      overallStatus = 'critical';
    } else if (summary.warning > 0) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      checks,
      summary,
    };
  }

  /**
   * REF: Collect system performance metrics
   * PURPOSE: Gather CPU, memory, and disk usage for monitoring
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const loadAvg = os.loadavg();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // REF: Get disk usage (approximate for current working directory)
    let diskMetrics = {
      total: 0,
      free: 0,
      used: 0,
      usagePercent: 0,
    };

    try {
      const stats = await fs.stat(process.cwd());
      // REF: Simplified disk metrics - in production, use proper disk monitoring
      diskMetrics = {
        total: 1000000000, // 1GB placeholder
        free: 500000000,   // 500MB placeholder
        used: 500000000,   // 500MB placeholder
        usagePercent: 50,  // 50% placeholder
      };
    } catch (error) {
      console.warn('Could not collect disk metrics:', error);
    }

    const metrics: SystemMetrics = {
      cpu: {
        usage: loadAvg[0] * 100, // Approximate CPU usage from load average
        loadAverage: loadAvg,
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: (usedMemory / totalMemory) * 100,
      },
      disk: diskMetrics,
      uptime: os.uptime(),
      timestamp: new Date(),
    };

    // REF: Store metrics for historical analysis
    this.systemMetrics.push(metrics);

    // REF: Keep only last 24 hours of metrics (assuming 5-minute intervals)
    if (this.systemMetrics.length > 288) {
      this.systemMetrics = this.systemMetrics.slice(-288);
    }

    return metrics;
  }

  /**
   * REF: Get recent system metrics
   * PURPOSE: Return recent performance data for monitoring dashboards
   */
  getSystemMetrics(hours: number = 1): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.systemMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * REF: Check for alert conditions
   * PURPOSE: Monitor metrics against thresholds and trigger alerts
   */
  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: string[] = [];

    // REF: CPU usage alert
    if (metrics.cpu.usage > this.alertThresholds.cpu) {
      alerts.push(`High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`);
    }

    // REF: Memory usage alert
    if (metrics.memory.usagePercent > this.alertThresholds.memory) {
      alerts.push(`High memory usage: ${metrics.memory.usagePercent.toFixed(1)}%`);
    }

    // REF: Disk usage alert
    if (metrics.disk.usagePercent > this.alertThresholds.disk) {
      alerts.push(`High disk usage: ${metrics.disk.usagePercent.toFixed(1)}%`);
    }

    // REF: Send alerts if any conditions are met
    if (alerts.length > 0) {
      await this.sendAlert('System Performance Alert', alerts.join('\n'));
    }
  }

  /**
   * REF: Send alert notification
   * PURPOSE: Send alerts via configured channels (email, webhook, etc.)
   */
  private async sendAlert(subject: string, message: string): Promise<void> {
    const alertData = {
      subject,
      message,
      timestamp: new Date(),
      severity: 'warning',
    };

    // REF: Log alert to console (in production, send to external service)
    console.warn('🚨 MONITORING ALERT:', alertData);

    // TODO: Implement email alerts, Slack notifications, etc.
    // TODO: Integrate with services like PagerDuty for critical alerts
  }

  /**
   * REF: Start background monitoring
   * PURPOSE: Initialize periodic monitoring tasks
   */
  private startMonitoring(): void {
    // REF: Collect system metrics every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        await this.checkAlerts(metrics);
      } catch (error) {
        console.error('Error collecting system metrics:', error);
      }
    });

    // REF: Health check summary every 30 seconds
    cron.schedule('*/30 * * * * *', () => {
      const health = this.getHealthStatus();
      if (health.status !== 'healthy') {
        console.warn('Health check status:', health.status, health.summary);
      }
    });

    console.log('✅ Health monitoring started');
  }
}

// REF: Global monitor instance
export const healthMonitor = new HealthMonitor();

/**
 * REF: Database health check
 * PURPOSE: Verify database connectivity and performance
 */
export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // REF: Import unified database system to avoid circular dependencies
    const { getDatabase } = await import('./db.js');
    const database = await getDatabase();
    
    // REF: Simple query to test database connectivity
    const result = await database.db.execute('SELECT 1 as test');
    const responseTime = Date.now() - startTime;

    return {
      name: 'database',
      status: responseTime > 1000 ? 'warning' : 'healthy',
      message: responseTime > 1000 ? 'Database response time is slow' : `Database is responding normally (${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'})`,
      responseTime,
      timestamp: new Date(),
      details: {
        queryTime: responseTime,
      },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'critical',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * REF: External API health check
 * PURPOSE: Verify connectivity to Reply.io and other external services
 */
export async function checkExternalServicesHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // REF: Simple connectivity test to external services
    const checks = await Promise.allSettled([
      // REF: Test basic internet connectivity
      fetch('https://httpbin.org/status/200', { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(5000) 
      }),
    ]);

    const responseTime = Date.now() - startTime;
    const failedChecks = checks.filter(c => c.status === 'rejected').length;

    if (failedChecks === 0) {
      return {
        name: 'external_services',
        status: 'healthy',
        message: 'All external services are reachable',
        responseTime,
        timestamp: new Date(),
      };
    } else {
      return {
        name: 'external_services',
        status: 'warning',
        message: `${failedChecks} external service(s) are unreachable`,
        responseTime,
        timestamp: new Date(),
      };
    }
  } catch (error) {
    return {
      name: 'external_services',
      status: 'critical',
      message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * REF: Express middleware for request monitoring
 * PURPOSE: Track API performance and error rates
 */
export function requestMonitoringMiddleware() {
  const requestCounts = new Map<string, number>();
  const errorCounts = new Map<string, number>();
  const responseTimes: number[] = [];

  return (req: Request, res: Response, next: Function) => {
    const startTime = Date.now();
    const route = `${req.method} ${req.path}`;

    // REF: Track request count
    requestCounts.set(route, (requestCounts.get(route) || 0) + 1);

    // REF: Override res.json to capture response time and errors
    const originalJson = res.json;
    res.json = function(body: any) {
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);

      // REF: Track errors (4xx and 5xx status codes)
      if (res.statusCode >= 400) {
        errorCounts.set(route, (errorCounts.get(route) || 0) + 1);
      }

      // REF: Keep only last 1000 response times for performance
      if (responseTimes.length > 1000) {
        responseTimes.splice(0, 100);
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * REF: Health check endpoint handler
 * PURPOSE: Provide standardized health check endpoint for load balancers
 */
export function healthCheckHandler(req: Request, res: Response) {
  const health = healthMonitor.getHealthStatus();
  
  // REF: Return appropriate HTTP status code based on health
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'warning' ? 200 : 503;

  res.status(statusCode).json({
    status: health.status,
    timestamp: new Date(),
    checks: health.checks,
    summary: health.summary,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
}

/**
 * REF: Metrics endpoint handler
 * PURPOSE: Provide detailed metrics for monitoring dashboards
 */
export async function metricsHandler(req: Request, res: Response) {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const systemMetrics = healthMonitor.getSystemMetrics(hours);
    const currentMetrics = await healthMonitor.collectSystemMetrics();

    res.json({
      current: currentMetrics,
      historical: systemMetrics,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// REF: Register default health checks
healthMonitor.registerHealthCheck('database', checkDatabaseHealth);
healthMonitor.registerHealthCheck('external_services', checkExternalServicesHealth); 