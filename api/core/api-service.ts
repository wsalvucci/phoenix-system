import { SupabaseClient } from '@supabase/supabase-js';
import { QueryBuilder } from './query-builder';
import { AccessControlService } from './access-control';
import { CacheManager } from './cache-manager';
import { 
  UserContext, 
  QueryFilters, 
  NearbyRankParams, 
  TopStudentsParams,
  AccessLevel 
} from './types';
import { createServerLogger } from '@/utils/serverLogger';

export class ApiService {
  private queryBuilder: QueryBuilder;
  private userContext: UserContext;

  constructor(supabase: SupabaseClient, userContext: UserContext) {
    this.queryBuilder = new QueryBuilder(supabase);
    this.userContext = userContext;
  }

  /**
   * Gets student points with ranking, respecting access controls
   */
  async getStudentPointsWithRanking(filters: QueryFilters, accessLevel: AccessLevel = 'own') {
    const startTime = Date.now();
    const logger = createServerLogger({
      component: 'ApiService',
      action: 'getStudentPointsWithRanking',
      schoolId: filters.schoolId.toString()
    });

    // Validate access
    if (!AccessControlService.validateAccess(this.userContext, accessLevel)) {
      logger.warn('Access denied for student points query', { 
        role: this.userContext.role, 
        accessLevel 
      });
      throw new Error('Access denied');
    }

    // Check cache first
    const cacheKey = CacheManager.generateCacheKey('studentPoints', {
      ...filters,
      role: this.userContext.role,
      accessLevel
    });

    const cached = CacheManager.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for student points query', { 
        schoolId: filters.schoolId,
        executionTime: Date.now() - startTime
      });
      return cached;
    }

    try {
      // Execute query
      const data = await this.queryBuilder.getStudentPointsWithRanking(filters, this.userContext);
      
      // Apply field filtering based on access level
      const accessConfig = AccessControlService.getAccessConfig(this.userContext, accessLevel);
      const filteredData = accessConfig 
        ? data.map(student => AccessControlService.filterAllowedFields(student, accessConfig.allowedFields))
        : data;

      // Cache the result
      const ttl = CacheManager.getTTL('studentData');
      CacheManager.set(cacheKey, filteredData, ttl);

      const executionTime = Date.now() - startTime;
      CacheManager.recordExecutionTime(cacheKey, executionTime);

      logger.info('Student points query completed', { 
        schoolId: filters.schoolId,
        executionTime,
        resultCount: filteredData.length
      });

      return filteredData;
    } catch (error) {
      logger.error('Failed to get student points', { 
        schoolId: filters.schoolId 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Gets nearby ranking data for a student
   */
  async getNearbyRanking(params: NearbyRankParams, filters: QueryFilters) {
    const startTime = Date.now();
    const logger = createServerLogger({
      component: 'ApiService',
      action: 'getNearbyRanking',
      schoolId: filters.schoolId.toString(),
      studentId: params.studentId.toString()
    });

    // Validate access
    if (!AccessControlService.validateNearbyRankAccess(this.userContext, params)) {
      logger.warn('Access denied for nearby ranking query', { 
        role: this.userContext.role,
        studentId: params.studentId
      });
      throw new Error('Access denied for nearby ranking');
    }

    // Check cache first
    const cacheKey = CacheManager.generateCacheKey('nearbyRanking', {
      ...params,
      ...filters,
      role: this.userContext.role
    });

    const cached = CacheManager.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for nearby ranking query', { 
        studentId: params.studentId,
        executionTime: Date.now() - startTime
      });
      return cached;
    }

    try {
      // Execute query
      const data = await this.queryBuilder.getNearbyRanking(params, filters, this.userContext);
      
      // Apply field filtering
      const accessConfig = AccessControlService.getAccessConfig(this.userContext, 'nearby');
      const filteredData = accessConfig 
        ? {
            ...data,
            nearbyStudents: data.nearbyStudents.map(student => 
              AccessControlService.filterAllowedFields(student, accessConfig.allowedFields)
            )
          }
        : data;

      // Cache the result
      const ttl = CacheManager.getTTL('nearbyRanking');
      CacheManager.set(cacheKey, filteredData, ttl);

      const executionTime = Date.now() - startTime;
      CacheManager.recordExecutionTime(cacheKey, executionTime);

      logger.info('Nearby ranking query completed', { 
        studentId: params.studentId,
        executionTime,
        resultCount: filteredData.nearbyStudents.length
      });

      return filteredData;
    } catch (error) {
      logger.error('Failed to get nearby ranking', { 
        studentId: params.studentId 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Gets top students data
   */
  async getTopStudents(params: TopStudentsParams, filters: QueryFilters) {
    const startTime = Date.now();
    const logger = createServerLogger({
      component: 'ApiService',
      action: 'getTopStudents',
      schoolId: filters.schoolId.toString()
    });

    // Validate access
    if (!AccessControlService.validateTopStudentsAccess(this.userContext, params)) {
      logger.warn('Access denied for top students query', { 
        role: this.userContext.role,
        limit: params.limit
      });
      throw new Error('Access denied for top students');
    }

    // Check cache first
    const cacheKey = CacheManager.generateCacheKey('topStudents', {
      ...params,
      ...filters,
      role: this.userContext.role
    });

    const cached = CacheManager.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for top students query', { 
        schoolId: filters.schoolId,
        executionTime: Date.now() - startTime
      });
      return cached;
    }

    try {
      // Execute query
      const data = await this.queryBuilder.getTopStudents(params, filters, this.userContext);
      
      // Apply field filtering
      const accessConfig = AccessControlService.getAccessConfig(this.userContext, 'top');
      const filteredData = accessConfig 
        ? {
            ...data,
            students: data.students.map(student => 
              AccessControlService.filterAllowedFields(student, accessConfig.allowedFields)
            )
          }
        : data;

      // Cache the result
      const ttl = CacheManager.getTTL('topStudents');
      CacheManager.set(cacheKey, filteredData, ttl);

      const executionTime = Date.now() - startTime;
      CacheManager.recordExecutionTime(cacheKey, executionTime);

      logger.info('Top students query completed', { 
        schoolId: filters.schoolId,
        executionTime,
        resultCount: filteredData.students.length
      });

      return filteredData;
    } catch (error) {
      logger.error('Failed to get top students', { 
        schoolId: filters.schoolId 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Gets dashboard data
   */
  async getDashboardData(filters: QueryFilters) {
    const startTime = Date.now();
    const logger = createServerLogger({
      component: 'ApiService',
      action: 'getDashboardData',
      schoolId: filters.schoolId.toString()
    });

    // Validate access - dashboard access is more permissive
    const accessLevel = this.userContext.role === 'admin' ? 'full' : 'top';
    if (!AccessControlService.validateAccess(this.userContext, accessLevel)) {
      logger.warn('Access denied for dashboard query', { 
        role: this.userContext.role 
      });
      throw new Error('Access denied for dashboard');
    }

    // Check cache first
    const cacheKey = CacheManager.generateCacheKey('dashboard', {
      ...filters,
      role: this.userContext.role
    });

    const cached = CacheManager.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for dashboard query', { 
        schoolId: filters.schoolId,
        executionTime: Date.now() - startTime
      });
      return cached;
    }

    try {
      // Execute query
      const data = await this.queryBuilder.getDashboardData(filters, this.userContext);
      
      // Apply field filtering
      const accessConfig = AccessControlService.getAccessConfig(this.userContext, accessLevel);
      const filteredData = accessConfig 
        ? {
            ...data,
            students: data.students.map(student => 
              AccessControlService.filterAllowedFields(student, accessConfig.allowedFields)
            ),
            topStudents: data.topStudents.map(student => 
              AccessControlService.filterAllowedFields(student, accessConfig.allowedFields)
            )
          }
        : data;

      // Cache the result
      const ttl = CacheManager.getTTL('dashboard');
      CacheManager.set(cacheKey, filteredData, ttl);

      const executionTime = Date.now() - startTime;
      CacheManager.recordExecutionTime(cacheKey, executionTime);

      logger.info('Dashboard query completed', { 
        schoolId: filters.schoolId,
        executionTime,
        resultCount: filteredData.students.length
      });

      return filteredData;
    } catch (error) {
      logger.error('Failed to get dashboard data', { 
        schoolId: filters.schoolId 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Invalidates cache for a specific school
   */
  invalidateSchoolCache(schoolId: number): void {
    CacheManager.invalidate(`schoolId:${schoolId}`);
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return CacheManager.getStats();
  }
} 