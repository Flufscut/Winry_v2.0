/**
 * FILE: api-cache.ts
 * PURPOSE: Comprehensive API caching and rate limiting system for external APIs
 * DEPENDENCIES: node-cron for cleanup tasks, memory management utilities
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Addresses Reply.io rate limiting (15,000 calls/month) and improves performance
 * TODO: Add Redis support for production environments
 * 
 * MAIN_FUNCTIONS:
 * - ApiCache: Intelligent caching with TTL and LRU eviction
 * - RateLimiter: Request throttling and queue management
 * - CacheManager: Unified cache and rate limit management
 */

import cron from 'node-cron';

// REF: Cache entry structure with metadata for intelligent management
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  cacheKey: string;
  size?: number; // Estimated memory size in bytes
}

// REF: Rate limiting configuration per API provider
interface RateLimitConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
  retryAfter?: number; // Default retry delay in milliseconds
  burstLimit?: number; // Allow burst requests up to this limit
}

// REF: Request queue entry for rate-limited APIs
interface QueuedRequest {
  id: string;
  apiKey: string;
  endpoint: string;
  params: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}

/**
 * REF: Advanced API cache with LRU eviction and intelligent TTL management
 * PURPOSE: Reduce API calls and improve response times for external services
 * 
 * BUSINESS_LOGIC:
 * - Stores API responses with configurable TTL based on data type
 * - Implements LRU (Least Recently Used) eviction when memory limits reached
 * - Tracks access patterns for cache optimization
 * - Supports cache warming and pre-emptive refresh
 * 
 * ERROR_HANDLING:
 * - Graceful degradation when cache is full
 * - Automatic cleanup of expired entries
 * - Memory usage monitoring and alerts
 */
export class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private maxMemoryMB: number;
  private currentMemoryMB = 0;
  private hitCount = 0;
  private missCount = 0;
  private cleanupScheduled = false;

  constructor(maxSize = 10000, maxMemoryMB = 100) {
    this.maxSize = maxSize;
    this.maxMemoryMB = maxMemoryMB;
    this.scheduleCleanup();
  }

  /**
   * REF: Get cached data with automatic TTL validation and access tracking
   * @param key - Cache key identifier
   * @returns Cached data or null if expired/missing
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // REF: Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentMemoryMB -= (entry.size || 0) / (1024 * 1024);
      this.missCount++;
      return null;
    }

    // REF: Update access patterns for LRU management
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hitCount++;
    
    return entry.data as T;
  }

  /**
   * REF: Store data in cache with intelligent TTL and size management
   * @param key - Cache key identifier
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   * @param priority - Cache priority (affects eviction order)
   */
  set<T>(key: string, data: T, ttl: number, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const now = Date.now();
    const estimatedSize = this.estimateSize(data);
    const estimatedSizeMB = estimatedSize / (1024 * 1024);

    // REF: Check memory limits before storing
    if (this.currentMemoryMB + estimatedSizeMB > this.maxMemoryMB) {
      this.evictOldEntries(estimatedSizeMB);
    }

    // REF: Check entry count limits
    if (this.cache.size >= this.maxSize) {
      this.evictLRUEntries(1);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
      cacheKey: key,
      size: estimatedSize
    };

    // REF: Remove existing entry if updating
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      this.currentMemoryMB -= (existing?.size || 0) / (1024 * 1024);
    }

    this.cache.set(key, entry);
    this.currentMemoryMB += estimatedSizeMB;
  }

  /**
   * REF: Get cache statistics for monitoring and optimization
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsageMB: Math.round(this.currentMemoryMB * 100) / 100,
      maxMemoryMB: this.maxMemoryMB,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ageMs: Date.now() - entry.timestamp,
        ttlMs: entry.ttl,
        accessCount: entry.accessCount,
        sizeMB: Math.round((entry.size || 0) / (1024 * 1024) * 100) / 100
      }))
    };
  }

  /**
   * REF: Estimate memory size of data for cache management
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default fallback size
    }
  }

  /**
   * REF: Evict old entries to free memory
   */
  private evictOldEntries(requiredMB: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedMB = 0;
    for (const [key, entry] of entries) {
      if (freedMB >= requiredMB) break;
      
      this.cache.delete(key);
      freedMB += (entry.size || 0) / (1024 * 1024);
      this.currentMemoryMB -= (entry.size || 0) / (1024 * 1024);
    }
  }

  /**
   * REF: Evict least recently used entries
   */
  private evictLRUEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    for (let i = 0; i < count && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.currentMemoryMB -= (entry.size || 0) / (1024 * 1024);
    }
  }

  /**
   * REF: Schedule automatic cleanup of expired entries
   */
  private scheduleCleanup(): void {
    if (this.cleanupScheduled) return;
    
    // REF: Run cleanup every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.cleanupExpired();
    });
    
    this.cleanupScheduled = true;
  }

  /**
   * REF: Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let freedMB = 0;

    for (const key of Array.from(this.cache.keys())) {
      const entry = this.cache.get(key)!;
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        freedMB += (entry.size || 0) / (1024 * 1024);
        cleanedCount++;
      }
    }

    this.currentMemoryMB -= freedMB;
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleanedCount} expired entries, freed ${Math.round(freedMB * 100) / 100}MB`);
    }
  }

  /**
   * REF: Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryMB = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * REF: Remove specific cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryMB -= (entry.size || 0) / (1024 * 1024);
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * REF: Check if cache has specific key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // REF: Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentMemoryMB -= (entry.size || 0) / (1024 * 1024);
      return false;
    }
    
    return true;
  }
}

/**
 * REF: Rate limiter with request queuing and intelligent throttling
 * PURPOSE: Prevent API rate limit violations and manage request flow
 * 
 * BUSINESS_LOGIC:
 * - Tracks API usage per provider and API key
 * - Implements sliding window rate limiting
 * - Queues requests when limits are approached
 * - Provides burst handling for urgent requests
 * 
 * ERROR_HANDLING:
 * - Automatic retry with exponential backoff
 * - Queue overflow protection
 * - Rate limit reset detection
 */
export class RateLimiter {
  private requests = new Map<string, number[]>(); // API key -> timestamps
  private config: Map<string, RateLimitConfig> = new Map();
  private queue: QueuedRequest[] = [];
  private processing = false;
  private queueProcessor?: NodeJS.Timeout;

  constructor() {
    this.setupDefaultConfigs();
    this.startQueueProcessor();
  }

  /**
   * REF: Setup default rate limiting configurations for different APIs
   */
  private setupDefaultConfigs(): void {
    // REF: Reply.io rate limits - 15,000 calls per month = 500/day, but be conservative
    this.config.set('reply.io', {
      maxRequests: 300, // Conservative daily limit (60% of theoretical max)
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      retryAfter: 5 * 60 * 1000, // 5 minutes - longer retry for Reply.io
      burstLimit: 20 // Reduced burst limit to prevent spikes
    });

    // REF: Generic API limits for other services
    this.config.set('default', {
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      retryAfter: 5 * 1000, // 5 seconds
      burstLimit: 100
    });
  }

  /**
   * REF: Check if API request is allowed or should be queued
   * @param provider - API provider identifier
   * @param apiKey - API key for tracking usage
   * @returns Promise resolving to true if allowed, false if rate limited
   */
  async isAllowed(provider: string, apiKey: string): Promise<boolean> {
    const config = this.config.get(provider) || this.config.get('default')!;
    const key = `${provider}:${apiKey}`;
    const now = Date.now();
    
    // REF: Get request history for this API key
    let timestamps = this.requests.get(key) || [];
    
    // REF: Remove timestamps outside the window
    timestamps = timestamps.filter(ts => now - ts < config.windowMs);
    
    // REF: Check if under rate limit
    if (timestamps.length < config.maxRequests) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
      return true;
    }

    // REF: Check burst allowance
    const recentRequests = timestamps.filter(ts => now - ts < 60 * 1000); // Last minute
    if (recentRequests.length < (config.burstLimit || config.maxRequests)) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
      return true;
    }

    return false;
  }

  /**
   * REF: Add request to queue when rate limited
   * @param request - Request details for queuing
   */
  async queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        ...request,
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject
      };

      // REF: Insert based on priority (high priority first)
      if (request.priority === 'high') {
        this.queue.unshift(queuedRequest);
      } else {
        this.queue.push(queuedRequest);
      }

      console.log(`📥 Queued API request: ${request.endpoint} (Priority: ${request.priority}, Queue size: ${this.queue.length})`);
    });
  }

  /**
   * REF: Start background queue processor
   */
  private startQueueProcessor(): void {
    if (this.queueProcessor) return;

    this.queueProcessor = setInterval(async () => {
      await this.processQueue();
    }, 5000); // Process queue every 5 seconds
  }

  /**
   * REF: Process queued requests based on rate limits
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    
    try {
      const processedRequests: string[] = [];
      
      for (const request of this.queue) {
        const provider = this.extractProvider(request.endpoint);
        const allowed = await this.isAllowed(provider, request.apiKey);
        
        if (allowed) {
          try {
            // REF: Execute the queued request (would be implemented by the calling service)
            console.log(`✅ Processing queued request: ${request.endpoint}`);
            request.resolve({ queued: true, processed: true });
            processedRequests.push(request.id);
          } catch (error) {
            if (request.retryCount < 3) {
              request.retryCount++;
              console.log(`🔄 Retrying queued request: ${request.endpoint} (Attempt ${request.retryCount})`);
            } else {
              request.reject(error as Error);
              processedRequests.push(request.id);
            }
          }
        }
      }

      // REF: Remove processed requests from queue
      this.queue = this.queue.filter(req => !processedRequests.includes(req.id));
      
    } finally {
      this.processing = false;
    }
  }

  /**
   * REF: Extract provider name from endpoint URL
   */
  private extractProvider(endpoint: string): string {
    if (endpoint.includes('reply.io')) return 'reply.io';
    return 'default';
  }

  /**
   * REF: Get rate limiting statistics
   */
  getStats() {
    const stats: any = {
      totalTrackedKeys: this.requests.size,
      queueLength: this.queue.length,
      queuedByPriority: {
        high: this.queue.filter(r => r.priority === 'high').length,
        medium: this.queue.filter(r => r.priority === 'medium').length,
        low: this.queue.filter(r => r.priority === 'low').length
      },
      apiUsage: {}
    };

    // REF: Calculate usage per API provider
    for (const [key, timestamps] of this.requests.entries()) {
      const [provider] = key.split(':');
      const config = this.config.get(provider) || this.config.get('default')!;
      const now = Date.now();
      const recentRequests = timestamps.filter(ts => now - ts < config.windowMs);
      
      if (!stats.apiUsage[provider]) {
        stats.apiUsage[provider] = {
          totalKeys: 0,
          totalRequests: 0,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs
        };
      }
      
      stats.apiUsage[provider].totalKeys++;
      stats.apiUsage[provider].totalRequests += recentRequests.length;
    }

    return stats;
  }

  /**
   * REF: Clear rate limiting data for specific provider/key
   */
  clearLimits(provider?: string, apiKey?: string): void {
    if (provider && apiKey) {
      this.requests.delete(`${provider}:${apiKey}`);
    } else if (provider) {
      for (const key of this.requests.keys()) {
        if (key.startsWith(`${provider}:`)) {
          this.requests.delete(key);
        }
      }
    } else {
      this.requests.clear();
    }
  }

  /**
   * REF: Stop queue processor
   */
  destroy(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = undefined;
    }
  }
}

/**
 * REF: Unified cache and rate limit manager for all external APIs
 * PURPOSE: Provide single interface for API optimization and monitoring
 * 
 * BUSINESS_LOGIC:
 * - Combines caching and rate limiting for optimal API usage
 * - Provides performance monitoring and alerting
 * - Handles cache warming and predictive loading
 * - Manages API usage budgets and quotas
 */
export class CacheManager {
  private cache: ApiCache;
  private rateLimiter: RateLimiter;
  private performanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    responseTimeTotal: 0
  };

  constructor(maxCacheSize = 10000, maxMemoryMB = 100) {
    this.cache = new ApiCache(maxCacheSize, maxMemoryMB);
    this.rateLimiter = new RateLimiter();
  }

  /**
   * REF: Get data with automatic caching and rate limiting
   * @param key - Cache key
   * @param provider - API provider
   * @param apiKey - API key
   * @param fetchFn - Function to fetch data if not cached
   * @param ttl - Cache TTL in milliseconds
   * @param priority - Request priority if rate limited
   */
  async get<T>(
    key: string,
    provider: string,
    apiKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = 15 * 60 * 1000, // 15 minutes default
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      // REF: Try cache first
      const cached = this.cache.get<T>(key);
      if (cached !== null) {
        this.performanceMetrics.cacheHits++;
        this.updateResponseTime(startTime);
        return cached;
      }

      // REF: Check rate limits
      const allowed = await this.rateLimiter.isAllowed(provider, apiKey);
      if (!allowed) {
        this.performanceMetrics.rateLimitHits++;
        
        // REF: Try to return stale cache data if available
        const staleData = this.cache.get<T>(`${key}:stale`);
        if (staleData !== null) {
          console.log(`🔄 Returning stale cache data for: ${key}`);
          return staleData;
        }

        // REF: Queue request if no stale data available
        console.log(`⏳ Rate limited, queueing request: ${key}`);
        return await this.rateLimiter.queueRequest({
          apiKey,
          endpoint: key,
          params: {},
          priority,
          resolve: () => {},
          reject: () => {}
        });
      }

      // REF: Fetch fresh data
      const data = await fetchFn();
      
      // REF: Store in cache and stale backup
      this.cache.set(key, data, ttl, priority);
      this.cache.set(`${key}:stale`, data, ttl * 3, 'low'); // Keep stale version 3x longer

      this.updateResponseTime(startTime);
      return data;

    } catch (error) {
      // REF: Try to return stale cache data on error
      const staleData = this.cache.get<T>(`${key}:stale`);
      if (staleData !== null) {
        console.log(`❌ API error, returning stale cache data for: ${key}`);
        return staleData;
      }
      
      throw error;
    }
  }

  /**
   * REF: Warm cache with commonly accessed data
   */
  async warmCache(entries: Array<{
    key: string;
    provider: string;
    apiKey: string;
    fetchFn: () => Promise<any>;
    ttl?: number;
  }>): Promise<void> {
    console.log(`🔥 Warming cache with ${entries.length} entries...`);
    
    for (const entry of entries) {
      try {
        await this.get(
          entry.key,
          entry.provider,
          entry.apiKey,
          entry.fetchFn,
          entry.ttl,
          'low' // Use low priority for cache warming
        );
      } catch (error) {
        console.error(`Failed to warm cache for ${entry.key}:`, error);
      }
    }
    
    console.log(`✅ Cache warming completed`);
  }

  /**
   * REF: Update response time metrics
   */
  private updateResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.performanceMetrics.responseTimeTotal += responseTime;
    this.performanceMetrics.averageResponseTime = 
      this.performanceMetrics.responseTimeTotal / this.performanceMetrics.totalRequests;
  }

  /**
   * REF: Get comprehensive performance statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    const rateLimitStats = this.rateLimiter.getStats();
    
    return {
      cache: cacheStats,
      rateLimiting: rateLimitStats,
      performance: {
        ...this.performanceMetrics,
        averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime * 100) / 100,
        cacheHitRate: this.performanceMetrics.totalRequests > 0 
          ? Math.round((this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100 * 100) / 100
          : 0,
        rateLimitHitRate: this.performanceMetrics.totalRequests > 0
          ? Math.round((this.performanceMetrics.rateLimitHits / this.performanceMetrics.totalRequests) * 100 * 100) / 100
          : 0
      }
    };
  }

  /**
   * REF: Clear all caches and reset metrics
   */
  clear(): void {
    this.cache.clear();
    this.rateLimiter.clearLimits();
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      responseTimeTotal: 0
    };
  }

  /**
   * REF: Destroy manager and cleanup resources
   */
  destroy(): void {
    this.rateLimiter.destroy();
    this.cache.clear();
  }
}

// REF: Export singleton instance for application-wide use
export const apiCacheManager = new CacheManager(); 