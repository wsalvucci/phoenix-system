import { CachedQueryResult, QueryMetadata } from './types';

export class CacheManager {
  private static cache = new Map<string, CachedQueryResult<unknown>>();
  private static metadata = new Map<string, QueryMetadata>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generates a cache key based on query parameters
   */
  static generateCacheKey(queryId: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${queryId}:${sortedParams}`;
  }

  /**
   * Gets cached data if it exists and is not expired
   */
  static get<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update metadata
    this.updateMetadata(cacheKey, 'hit');
    
    return cached.data as T;
  }

  /**
   * Sets data in cache with optional TTL
   */
  static set<T>(cacheKey: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const cached: CachedQueryResult<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(cacheKey, cached);
    this.updateMetadata(cacheKey, 'miss');
  }

  /**
   * Invalidates cache entries that match a pattern
   */
  static invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.metadata.delete(key);
    });
  }

  /**
   * Clears all cache entries
   */
  static clear(): void {
    this.cache.clear();
    this.metadata.clear();
  }

  /**
   * Gets cache statistics
   */
  static getStats(): {
    totalEntries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    averageExecutionTime: number;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    let totalExecutionTime = 0;
    let executionCount = 0;

    for (const meta of this.metadata.values()) {
      totalHits += meta.executionCount;
      totalMisses += 1; // Each metadata entry represents a miss
      totalExecutionTime += meta.averageExecutionTime * meta.executionCount;
      executionCount += meta.executionCount;
    }

    return {
      totalEntries: this.cache.size,
      totalHits,
      totalMisses,
      hitRate: totalHits / (totalHits + totalMisses) || 0,
      averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0
    };
  }

  /**
   * Updates query metadata
   */
  private static updateMetadata(cacheKey: string, type: 'hit' | 'miss'): void {
    const existing = this.metadata.get(cacheKey);
    const now = Date.now();

    if (existing) {
      existing.lastExecuted = now;
      if (type === 'hit') {
        existing.executionCount++;
      }
    } else {
      this.metadata.set(cacheKey, {
        queryId: cacheKey.split(':')[0],
        complexity: 'medium', // Default complexity
        estimatedRows: 0,
        lastExecuted: now,
        executionCount: 1,
        averageExecutionTime: 0
      });
    }
  }

  /**
   * Records execution time for a query
   */
  static recordExecutionTime(cacheKey: string, executionTime: number): void {
    const meta = this.metadata.get(cacheKey);
    if (meta) {
      meta.averageExecutionTime = (meta.averageExecutionTime + executionTime) / 2;
    }
  }

  /**
   * Gets TTL for a specific query type
   */
  static getTTL(queryType: string): number {
    const ttlMap: Record<string, number> = {
      'dashboard': 2 * 60 * 1000, // 2 minutes for dashboard data
      'ranking': 1 * 60 * 1000,   // 1 minute for ranking data
      'topStudents': 3 * 60 * 1000, // 3 minutes for top students
      'nearbyRanking': 1 * 60 * 1000, // 1 minute for nearby ranking
      'studentData': 5 * 60 * 1000, // 5 minutes for student data
    };

    return ttlMap[queryType] || this.DEFAULT_TTL;
  }
} 