import { SupabaseClient } from '@supabase/supabase-js';
import { ApiService } from '../core/api-service';
import { UserContextResolver } from '../core/user-context';
import { createClient } from '@/utils/supabase/server';
import { QueryFilters, NearbyRankParams, TopStudentsParams, TopStudentsResponse, NearbyRankingResponse, StudentPointsWithRankingResponse } from '../core/types';
import { Timeframe } from '@/types/domain';
import { StudentData } from '../core/types';

// Simplified dashboard interface that matches our actual data structure
export interface SimpleDashboardData {
  timeframes: Timeframe[];
  students: StudentData[];
}
import { createServerLogger } from '@/utils/serverLogger';
import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';

export class DashboardService {
  private apiService?: ApiService;
  private userContextResolver: UserContextResolver;

  constructor(supabase: SupabaseClient) {
    // For the dashboard service, we'll create the resolver when needed
    // since we need both auth and db clients
    this.userContextResolver = null as any; // Will be initialized when needed
    // We'll initialize apiService after resolving user context
  }

  /**
   * Gets timeframe data for a school
   */
  async getTimeframeData(schoolId: number, timeframeId: number | null): Promise<Timeframe[]> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getTimeframeData',
      schoolId: schoolId.toString(),
      timeframeId: timeframeId?.toString() || 'active'
    });

    try {
      const supabase = await supabaseServiceClient();
      
      const timeframeQuery = supabase
        .from('school_timeframes')
        .select('*')
        .eq('school_id', schoolId);

      const { data: timeframeData, error: timeframeError } = await timeframeQuery;

      if (timeframeError) {
        logger.error('Error fetching timeframe data', { schoolId, timeframeId, timeframeError });
        throw timeframeError;
      }

      if (!timeframeData) {
        logger.warn('No timeframe data found', { schoolId, timeframeId });
        throw new Error("No timeframe found");
      }

      return timeframeData.map(timeframe => ({
        id: timeframe.id,
        name: timeframe.name,
        startsAt: timeframe.starts_at,
        endsAt: timeframe.ends_at,
        active: timeframe.active,
        schoolId: timeframe.school_id
      }));
    } catch (error) {
      logger.error('Failed to fetch timeframe data', { schoolId, timeframeId }, error as Error);
      throw error;
    }
  }

  /**
   * Checks if user has access to a school
   */
  async checkSchoolAccess(schoolId: number): Promise<boolean> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'checkSchoolAccess',
      schoolId: schoolId.toString()
    });

    try {
      const authClient = createClient();
      const supabase = await supabaseServiceClient();
      const userContextResolver = new UserContextResolver(authClient, supabase);
      return await userContextResolver.validateSchoolAccess(schoolId);
    } catch (error) {
      logger.error('Error checking school access', { schoolId }, error as Error);
      return false;
    }
  }

  /**
   * Gets top scrolling dashboard data
   */
  async getTopScrollingDashboard(
    schoolId: number,
    timeframeId: number | null
  ): Promise<SimpleDashboardData> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getTopScrollingDashboard',
      schoolId: schoolId.toString(),
      timeframeId: timeframeId?.toString() || 'active'
    });

    try {
      // Check access
      const hasAccess = await this.checkSchoolAccess(schoolId);
      if (!hasAccess) {
        logger.warn('User denied access to school dashboard', { schoolId });
        throw new Error("User does not have access to this school");
      }

      // Resolve user context
      const authClient = createClient();
      const supabase = await supabaseServiceClient();
      const userContextResolver = new UserContextResolver(authClient, supabase);
      const userContext = await userContextResolver.resolveUserContext();
      if (!userContext) {
        logger.error('Failed to resolve user context');
        throw new Error('User context not found');
      }

      // Initialize API service
      this.apiService = new ApiService(supabase, userContext);

      // Get timeframe data
      const timeframes = await this.getTimeframeData(schoolId, timeframeId);
      const activeTimeframe = timeframes.find(t => t.active) || timeframes[0];
      
      if (!activeTimeframe) {
        throw new Error('No active timeframe found');
      }

      // Build query filters
      const filters: QueryFilters = {
        schoolId,
        timeframeId: activeTimeframe.id
      };

      // Get dashboard data using the robust API service
      const dashboardData = await this.apiService.getDashboardData(filters);

      return {
        timeframes,
        students: dashboardData.students
      };
    } catch (error) {
      logger.error('Failed to get top scrolling dashboard', { schoolId, timeframeId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets top students
   */
  async getTopStudents(
    schoolId: number,
    limit: number,
    pointGroupId?: number,
    studentGroupId?: number,
    timeframeId?: number
  ): Promise<TopStudentsResponse> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getTopStudents',
      schoolId: schoolId.toString()
    });

    try {
      // Check access
      const hasAccess = await this.checkSchoolAccess(schoolId);
      if (!hasAccess) {
        logger.warn('User denied access to top students', { schoolId });
        throw new Error("User does not have access to this school");
      }

      // Resolve user context
      const authClient = createClient();
      const supabase = await supabaseServiceClient();
      const userContextResolver = new UserContextResolver(authClient, supabase);
      const userContext = await userContextResolver.resolveUserContext();
      if (!userContext) {
        logger.error('Failed to resolve user context');
        throw new Error('User context not found');
      }

      // Initialize API service
      this.apiService = new ApiService(supabase, userContext);

      // Build query filters
      const filters: QueryFilters = {
        schoolId,
        timeframeId,
        pointGroupId,
        studentGroupId
      };

      const params: TopStudentsParams = {
        limit
      };

      return await this.apiService.getTopStudents(params, filters);
    } catch (error) {
      logger.error('Failed to get top students', { schoolId, limit }, error as Error);
      throw error;
    }
  }

  /**
   * Gets nearby ranking for a student
   */
  async getNearbyRanking(
    schoolId: number,
    studentId: number,
    rankWindow: number,
    pointGroupId?: number,
    studentGroupId?: number,
    timeframeId?: number
  ): Promise<NearbyRankingResponse> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getNearbyRanking',
      schoolId: schoolId.toString(),
      studentId: studentId.toString()
    });

    try {
      // Check access
      const hasAccess = await this.checkSchoolAccess(schoolId);
      if (!hasAccess) {
        logger.warn('User denied access to nearby ranking', { schoolId });
        throw new Error("User does not have access to this school");
      }

      // Resolve user context
      const authClient = createClient();
      const supabase = await supabaseServiceClient();
      const userContextResolver = new UserContextResolver(authClient, supabase);
      const userContext = await userContextResolver.resolveUserContext();
      if (!userContext) {
        logger.error('Failed to resolve user context');
        throw new Error('User context not found');
      }

      // Initialize API service
      this.apiService = new ApiService(supabase, userContext);

      // Build query filters
      const filters: QueryFilters = {
        schoolId,
        timeframeId,
        pointGroupId,
        studentGroupId
      };

      const params: NearbyRankParams = {
        studentId,
        rankWindow,
        pointGroupId,
        studentGroupId
      };

      return await this.apiService.getNearbyRanking(params, filters);
    } catch (error) {
      logger.error('Failed to get nearby ranking', { schoolId, studentId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets student points with ranking
   */
  async getStudentPointsWithRanking(
    schoolId: number,
    timeframeId?: number,
    pointGroupId?: number,
    studentGroupId?: number,
    grade?: number,
    limit?: number,
    offset?: number,
    accessLevel: 'full' | 'nearby' | 'top' | 'own' | 'group' = 'full'
  ): Promise<StudentPointsWithRankingResponse> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getStudentPointsWithRanking',
      schoolId: schoolId.toString()
    });

    try {
      // Check access
      const hasAccess = await this.checkSchoolAccess(schoolId);
      if (!hasAccess) {
        logger.warn('User denied access to student points', { schoolId });
        throw new Error("User does not have access to this school");
      }

      // Resolve user context
      const authClient = createClient();
      const supabase = await supabaseServiceClient();
      const userContextResolver = new UserContextResolver(authClient, supabase);
      const userContext = await userContextResolver.resolveUserContext();
      if (!userContext) {
        logger.error('Failed to resolve user context');
        throw new Error('User context not found');
      }

      // Initialize API service
      this.apiService = new ApiService(supabase, userContext);

      // Build query filters
      const filters: QueryFilters = {
        schoolId,
        timeframeId,
        pointGroupId,
        studentGroupId,
        grade,
        limit,
        offset
      };

      return await this.apiService.getStudentPointsWithRanking(filters, accessLevel);
    } catch (error) {
      logger.error('Failed to get student points with ranking', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Invalidates cache for a school
   */
  invalidateSchoolCache(schoolId: number): void {
    if (this.apiService) {
      this.apiService.invalidateSchoolCache(schoolId);
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    if (this.apiService) {
      return this.apiService.getCacheStats();
    }
    return null;
  }
} 