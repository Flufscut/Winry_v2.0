/**
 * FILE: reply-io-cached-service.ts
 * PURPOSE: Reply.io API service with intelligent caching and rate limiting
 * DEPENDENCIES: api-cache.ts, replyio-service.ts for base functionality
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Wraps Reply.io API calls with caching and rate limiting to prevent violations
 * TODO: Add webhook-based cache invalidation when Reply.io data changes
 * 
 * MAIN_FUNCTIONS:
 * - getCampaigns: Cached campaign fetching with 1-hour TTL
 * - getCampaignStatistics: Cached statistics with 30-minute TTL
 * - getAdvancedAnalytics: Cached analytics with 2-hour TTL
 * - sendProspect: Rate-limited prospect sending (no caching)
 */

import { apiCacheManager } from './api-cache';
import { ReplyIoService } from './replyio-service';

// REF: Cache TTL configurations for different Reply.io data types
const CACHE_TTLS = {
  campaigns: 60 * 60 * 1000, // 1 hour - campaigns don't change frequently
  statistics: 30 * 60 * 1000, // 30 minutes - stats update regularly
  analytics: 2 * 60 * 60 * 1000, // 2 hours - analytics are historical
  prospects: 5 * 60 * 1000, // 5 minutes - prospect data changes frequently
  account: 24 * 60 * 60 * 1000, // 24 hours - account info rarely changes
  templates: 4 * 60 * 60 * 1000 // 4 hours - templates change occasionally
};

// REF: Development-specific cache TTLs - much more aggressive to prevent rate limiting
const DEV_CACHE_TTLS = {
  campaigns: 8 * 60 * 60 * 1000, // 8 hours - very long for development
  statistics: 4 * 60 * 60 * 1000, // 4 hours - much longer for dev testing
  analytics: 12 * 60 * 60 * 1000, // 12 hours - very long for analytics
  prospects: 30 * 60 * 1000, // 30 minutes - longer for development
  account: 24 * 60 * 60 * 1000, // 24 hours - same as production
  templates: 8 * 60 * 60 * 1000 // 8 hours - longer for development
};

// REF: Get appropriate cache TTL based on environment
const getCacheTTL = (dataType: keyof typeof CACHE_TTLS): number => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? DEV_CACHE_TTLS[dataType] : CACHE_TTLS[dataType];
};

// REF: Cache key generators for consistent cache management
const CACHE_KEYS = {
  campaigns: (apiKey: string) => `reply.io:campaigns:${apiKey}`,
  campaignStats: (apiKey: string, campaignId?: string) => 
    `reply.io:stats:${apiKey}:${campaignId || 'all'}`,
  analytics: (apiKey: string, type: string) => 
    `reply.io:analytics:${apiKey}:${type}`,
  prospect: (apiKey: string, prospectId: string) => 
    `reply.io:prospect:${apiKey}:${prospectId}`,
  account: (apiKey: string) => `reply.io:account:${apiKey}`,
  templates: (apiKey: string) => `reply.io:templates:${apiKey}`
};

/**
 * REF: Enhanced Reply.io service with caching and rate limiting
 * PURPOSE: Provide Reply.io functionality while respecting API limits and improving performance
 * 
 * BUSINESS_LOGIC:
 * - All read operations use intelligent caching with appropriate TTLs
 * - Write operations (sending prospects) use rate limiting only
 * - Cache warming for commonly accessed data
 * - Automatic stale data fallback during rate limiting
 * - Performance monitoring and optimization
 * 
 * ERROR_HANDLING:
 * - Returns stale cache data when API calls fail
 * - Queues requests during rate limiting
 * - Comprehensive error logging and recovery
 * - Graceful degradation for unconfigured accounts
 */
export class ReplyIoCachedService {
  private replyIoService: ReplyIoService;

  constructor() {
    this.replyIoService = new ReplyIoService();
  }

  /**
   * REF: Get campaigns with intelligent caching
   * @param apiKey - Reply.io API key
   * @param priority - Request priority if rate limited
   * @returns Cached or fresh campaign data
   */
  async getCampaigns(apiKey: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any[]> {
    const cacheKey = CACHE_KEYS.campaigns(apiKey);
    
    return await apiCacheManager.get(
      cacheKey,
      'reply.io',
      apiKey,
      async () => {
        console.log(`📡 Fetching fresh campaigns from Reply.io for key: ${apiKey.substring(0, 8)}...`);
        return await this.replyIoService.getCampaigns(apiKey);
      },
      getCacheTTL('campaigns'),
      priority
    );
  }

  /**
   * REF: Get campaign statistics with caching
   * @param apiKey - Reply.io API key
   * @param campaignId - Optional specific campaign ID
   * @param priority - Request priority if rate limited
   * @returns Cached or fresh statistics data
   */
  async getCampaignStatistics(
    apiKey: string, 
    campaignId?: string, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<any> {
    const cacheKey = CACHE_KEYS.campaignStats(apiKey, campaignId);
    
    return await apiCacheManager.get(
      cacheKey,
      'reply.io',
      apiKey,
      async () => {
        console.log(`📊 Fetching fresh statistics from Reply.io for campaign: ${campaignId || 'all'}`);
        if (campaignId) {
          return await this.replyIoService.getCampaignStatistics(apiKey, parseInt(campaignId));
        } else {
          return await this.replyIoService.getCampaignsWithStatistics(apiKey);
        }
      },
      getCacheTTL('statistics'),
      priority
    );
  }

  /**
   * REF: Get advanced analytics with extended caching
   * @param apiKey - Reply.io API key
   * @param analyticsType - Type of analytics (performance, optimization, etc.)
   * @param priority - Request priority if rate limited
   * @returns Cached or fresh analytics data
   */
  async getAdvancedAnalytics(
    apiKey: string,
    analyticsType: string = 'general',
    priority: 'high' | 'medium' | 'low' = 'low'
  ): Promise<any> {
    const cacheKey = CACHE_KEYS.analytics(apiKey, analyticsType);
    
    return await apiCacheManager.get(
      cacheKey,
      'reply.io',
      apiKey,
      async () => {
        console.log(`🔍 Fetching fresh analytics from Reply.io (${analyticsType})`);
        // REF: Based on analytics type, call appropriate service method
        switch (analyticsType) {
          case 'performance':
            return await this.replyIoService.getCampaignsWithStatistics(apiKey);
          case 'optimization':
            const campaigns = await this.replyIoService.getCampaigns(apiKey);
            if (campaigns.length > 0) {
              return await this.replyIoService.getAutomatedOptimizationRecommendations(apiKey, campaigns[0].id);
            }
            return [];
          default:
            return await this.replyIoService.getCampaignsWithStatistics(apiKey);
        }
      },
      getCacheTTL('analytics'),
      priority
    );
  }

  /**
   * REF: Send prospect to Reply.io with rate limiting (no caching for write operations)
   * @param apiKey - Reply.io API key
   * @param prospectData - Prospect information
   * @param campaignId - Campaign to add prospect to
   * @param priority - Request priority (high for urgent sends)
   * @returns Send result
   */
  async sendProspect(
    apiKey: string,
    prospectData: any,
    campaignId: string,
    priority: 'high' | 'medium' | 'low' = 'high'
  ): Promise<any> {
    // REF: Check rate limits before sending (write operations are not cached)
    const allowed = await apiCacheManager['rateLimiter'].isAllowed('reply.io', apiKey);
    
    if (!allowed) {
      console.log(`⏳ Rate limited, queueing prospect send for campaign: ${campaignId}`);
      
      // REF: Queue the request with high priority for prospect sends
      return await apiCacheManager['rateLimiter'].queueRequest({
        apiKey,
        endpoint: `send-prospect-${campaignId}`,
        params: { prospectData, campaignId },
        priority,
        resolve: () => {},
        reject: () => {}
      });
    }

    // REF: Send prospect immediately if not rate limited
    console.log(`📤 Sending prospect to Reply.io campaign: ${campaignId}`);
    return await this.replyIoService.sendProspectToCampaign(apiKey, prospectData, parseInt(campaignId));
  }

  /**
   * REF: Batch send prospects with intelligent queuing
   * @param apiKey - Reply.io API key
   * @param prospects - Array of prospect data
   * @param campaignId - Campaign to add prospects to
   * @returns Batch send results
   */
  async sendProspectsBatch(
    apiKey: string,
    prospects: any[],
    campaignId: string
  ): Promise<{ successful: number; failed: number; queued: number; errors: any[] }> {
    const results = {
      successful: 0,
      failed: 0,
      queued: 0,
      errors: [] as any[]
    };

    console.log(`📦 Starting batch send of ${prospects.length} prospects to campaign: ${campaignId}`);

    for (const [index, prospect] of prospects.entries()) {
      try {
        // REF: Use medium priority for batch operations to allow urgent requests through
        const result = await this.sendProspect(apiKey, prospect, campaignId, 'medium');
        
        if (result.queued) {
          results.queued++;
        } else {
          results.successful++;
        }
        
        // REF: Add small delay between sends to avoid overwhelming the API
        if (index < prospects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          prospect: prospect.email || `prospect_${index}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ Failed to send prospect ${prospect.email}:`, error);
      }
    }

    console.log(`✅ Batch send completed: ${results.successful} successful, ${results.failed} failed, ${results.queued} queued`);
    return results;
  }

  /**
   * REF: Get account information with extended caching
   * @param apiKey - Reply.io API key
   * @returns Account information
   */
  async getAccountInfo(apiKey: string): Promise<any> {
    const cacheKey = CACHE_KEYS.account(apiKey);
    
    return await apiCacheManager.get(
      cacheKey,
      'reply.io',
      apiKey,
      async () => {
        console.log(`👤 Fetching account info from Reply.io`);
        // REF: Get account info by fetching campaigns (Reply.io doesn't have dedicated account endpoint)
        const campaigns = await this.replyIoService.getCampaigns(apiKey);
        return {
          apiKey: apiKey.substring(0, 8) + '...',
          campaignCount: campaigns.length,
          isActive: campaigns.length > 0,
          lastCheck: new Date().toISOString()
        };
      },
      getCacheTTL('account'),
      'low'
    );
  }

  /**
   * REF: Warm cache with commonly accessed data
   * @param apiKey - Reply.io API key
   */
  async warmCache(apiKey: string): Promise<void> {
    console.log(`🔥 Warming Reply.io cache for API key: ${apiKey.substring(0, 8)}...`);
    
    const warmingEntries = [
      {
        key: CACHE_KEYS.campaigns(apiKey),
        provider: 'reply.io',
        apiKey,
        fetchFn: () => this.replyIoService.getCampaigns(apiKey),
        ttl: getCacheTTL('campaigns')
      },
      {
        key: CACHE_KEYS.account(apiKey),
        provider: 'reply.io',
        apiKey,
        fetchFn: async () => {
          const campaigns = await this.replyIoService.getCampaigns(apiKey);
          return {
            apiKey: apiKey.substring(0, 8) + '...',
            campaignCount: campaigns.length,
            isActive: campaigns.length > 0,
            lastCheck: new Date().toISOString()
          };
        },
        ttl: getCacheTTL('account')
      }
    ];

    await apiCacheManager.warmCache(warmingEntries);
    console.log(`✅ Reply.io cache warming completed`);
  }

  /**
   * REF: Invalidate cache for specific data types
   * @param apiKey - Reply.io API key
   * @param dataType - Type of data to invalidate ('campaigns', 'statistics', 'all')
   */
  invalidateCache(apiKey: string, dataType: 'campaigns' | 'statistics' | 'analytics' | 'all' = 'all'): void {
    console.log(`🗑️ Invalidating Reply.io cache for: ${dataType}`);
    
    switch (dataType) {
      case 'campaigns':
        apiCacheManager['cache'].delete(CACHE_KEYS.campaigns(apiKey));
        break;
      case 'statistics':
        // REF: Invalidate all statistics cache entries for this API key
        const statsPattern = `reply.io:stats:${apiKey}:`;
        for (const key of Object.keys(apiCacheManager['cache']['cache'])) {
          if (key.startsWith(statsPattern)) {
            apiCacheManager['cache'].delete(key);
          }
        }
        break;
      case 'analytics':
        // REF: Invalidate all analytics cache entries for this API key
        const analyticsPattern = `reply.io:analytics:${apiKey}:`;
        for (const key of Object.keys(apiCacheManager['cache']['cache'])) {
          if (key.startsWith(analyticsPattern)) {
            apiCacheManager['cache'].delete(key);
          }
        }
        break;
      case 'all':
        // REF: Invalidate all cache entries for this API key
        const allPattern = `reply.io:`;
        for (const key of Object.keys(apiCacheManager['cache']['cache'])) {
          if (key.startsWith(allPattern) && key.includes(apiKey)) {
            apiCacheManager['cache'].delete(key);
          }
        }
        break;
    }
  }

  /**
   * REF: Get Reply.io specific performance statistics
   */
  getPerformanceStats(): any {
    const globalStats = apiCacheManager.getStats();
    
    // REF: Filter for Reply.io specific metrics
    const replyIoStats = {
      cache: {
        ...globalStats.cache,
        replyIoEntries: globalStats.cache.entries.filter(entry => 
          entry.key.startsWith('reply.io:')
        ).length
      },
      rateLimiting: globalStats.rateLimiting.apiUsage['reply.io'] || {
        totalKeys: 0,
        totalRequests: 0,
        maxRequests: 500,
        windowMs: 24 * 60 * 60 * 1000
      },
      performance: globalStats.performance,
      recommendations: this.generateOptimizationRecommendations(globalStats)
    };

    return replyIoStats;
  }

  /**
   * REF: Generate optimization recommendations based on performance data
   */
  private generateOptimizationRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    // REF: Cache hit rate recommendations
    if (stats.performance.cacheHitRate < 70) {
      recommendations.push("Consider increasing cache TTL for frequently accessed data");
    }
    
    // REF: Rate limiting recommendations
    if (stats.performance.rateLimitHitRate > 10) {
      recommendations.push("High rate limit hits detected - consider implementing request prioritization");
    }
    
    // REF: Memory usage recommendations
    if (stats.cache.memoryUsageMB > stats.cache.maxMemoryMB * 0.8) {
      recommendations.push("Cache memory usage is high - consider increasing memory limit or reducing TTL");
    }
    
    // REF: Response time recommendations
    if (stats.performance.averageResponseTime > 1000) {
      recommendations.push("Average response time is high - check cache configuration and API performance");
    }
    
    return recommendations;
  }

  /**
   * REF: Health check for Reply.io service
   */
  async healthCheck(apiKey: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      // REF: Try to fetch a small amount of data to test connectivity
      const startTime = Date.now();
      await this.getCampaigns(apiKey, 'high');
      const responseTime = Date.now() - startTime;
      
      const stats = this.getPerformanceStats();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // REF: Determine health status based on performance metrics
      if (stats.performance.rateLimitHitRate > 20 || responseTime > 5000) {
        status = 'unhealthy';
      } else if (stats.performance.rateLimitHitRate > 10 || responseTime > 2000) {
        status = 'degraded';
      }
      
      return {
        status,
        details: {
          responseTime,
          cacheHitRate: stats.performance.cacheHitRate,
          rateLimitHitRate: stats.performance.rateLimitHitRate,
          lastCheck: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString()
        }
      };
    }
  }
}

// REF: Export singleton instance
export const replyIoCachedService = new ReplyIoCachedService(); 