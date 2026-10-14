import { SupabaseClient } from '@supabase/supabase-js';
import { ApiService } from '../core/api-service';
import { UserContextResolver } from '../core/user-context';
import { createClient } from '@/utils/supabase/server';
import { QueryFilters, NearbyRankParams, TopStudentsParams, TopStudentsResponse, NearbyRankingResponse, StudentPointsWithRankingResponse, GlobalPoints } from '../core/types';
import { Timeframe } from '@/types/domain';
import { StudentData } from '../core/types';

// Simplified dashboard interface that matches our actual data structure
export interface SimpleDashboardData {
  timeframes: Timeframe[];
  students: StudentData[];
  pointGroups?: {
    id: number;
    name: string;
    color: string;
  }[];
}
import { createServerLogger } from '@/utils/serverLogger';
import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';

export class DashboardService {
  private apiService?: ApiService;
  private userContextResolver: UserContextResolver;

  constructor(supabase: SupabaseClient) {
    // For the dashboard service, we'll create the resolver when needed
    // since we need both auth and db clients
    this.userContextResolver = null as unknown as UserContextResolver; // Will be initialized when needed
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
      const supabase = await supabaseServiceClient();
      
      // Get timeframes
      const timeframes = await this.getTimeframeData(schoolId, timeframeId);
      
      // Get the selected or active timeframe for filtering
      const selectedTimeframe = timeframeId !== null 
        ? timeframes.find(tf => tf.id === timeframeId)
        : timeframes.find(tf => tf.active);
      
      if (!selectedTimeframe) {
        logger.warn('No timeframe found for filtering', { schoolId, timeframeId });
        throw new Error('No timeframe found for filtering');
      }
      
      // Get students with their student groups
      const { data: students, error: studentsError } = await supabase
        .from('student')
        .select(`
          *,
          student_group_pair!inner(
            student_group(
              id,
              name
            )
          )
        `)
        .eq('school_id', schoolId);

      if (studentsError) {
        logger.error('Error fetching students', { schoolId, studentsError });
        throw studentsError;
      }

      // Get point groups for colors
      const { data: pointGroups, error: pointGroupsError } = await supabase
        .from('point_group')
        .select('*')
        .eq('school_id', schoolId);

      if (pointGroupsError) {
        logger.error('Error fetching point groups', { schoolId, pointGroupsError });
        throw pointGroupsError;
      }

      // Get point events with student points for point calculations
      const { data: pointEvents, error: pointEventsError } = await supabase
        .from('point_event')
        .select(`
          *,
          student_group:student_group_id(
            id,
            school_id
          ),
          student_point:student_point(
            student_id,
            point_value
          )
        `)
        .eq('student_group.school_id', schoolId)
        .gte('date', selectedTimeframe.startsAt)
        .lte('date', selectedTimeframe.endsAt);

      if (pointEventsError) {
        logger.error('Error fetching point events', { schoolId, pointEventsError });
        throw pointEventsError;
      }

      // Helper function to get raw points (no conversion rules in new system)
      const getRawPoints = (pointValue: number): number => {
        return pointValue || 0;
      };

      // Calculate points for each student
      const studentPointsMap = new Map<number, {
        id: number,
        totalPoints: number,
        pointGroups: Map<number, { points: number, color: string }>
      }>();

      // Process point events to calculate student points
      pointEvents?.forEach(pointEvent => {
        pointEvent.student_point?.forEach(studentPoint => {
          const pointsEarned = getRawPoints(studentPoint.point_value);

          let existingStudent = studentPointsMap.get(studentPoint.student_id);
          
          if (!existingStudent) {
            existingStudent = {
              id: studentPoint.student_id,
              totalPoints: 0,
              pointGroups: new Map()
            };
            studentPointsMap.set(studentPoint.student_id, existingStudent);
          }

          // Update total points
          existingStudent.totalPoints += pointsEarned;

          // Update point group points
          const pointGroupId = pointEvent.point_group_id;
          if (pointGroupId) {
            const pointGroup = pointGroups?.find(pg => pg.id === pointGroupId);
            if (pointGroup) {
              if (!existingStudent.pointGroups.has(pointGroupId)) {
                existingStudent.pointGroups.set(pointGroupId, { points: 0, color: pointGroup.color });
              }
              const pointGroupData = existingStudent.pointGroups.get(pointGroupId)!;
              pointGroupData.points += pointsEarned;
            }
          }
        });
      });

      // Convert student points map to array and calculate ranks
      const studentsWithPoints = Array.from(studentPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      // Map students to the expected format
      const mappedStudents = (students || []).map(student => {
        const studentPoints = studentsWithPoints.find(sp => sp.id === student.id);
        return {
          studentId: student.id,
          totalPoints: studentPoints?.totalPoints || 0,
          student: {
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            grade: student.grade,
            school_id: student.school_id
          },
          rank: studentPoints?.rank || studentsWithPoints.length + 1, // Default to last rank if no points
          pointGroups: studentPoints ? Array.from(studentPoints.pointGroups.entries()).map(([id, data]) => ({
            id,
            name: pointGroups?.find(pg => pg.id === id)?.name || '',
            color: data.color,
            points: data.points
          })) : [],
          studentGroups: student.student_group_pair?.map(sgp => ({
            id: sgp.student_group?.id || 0,
            name: sgp.student_group?.name || ''
          })).filter(sg => sg.id !== 0 && sg.name !== '') || []
        };
      });

      // Sort by total points (highest first)
      mappedStudents.sort((a, b) => b.totalPoints - a.totalPoints);

      // Update ranks after sorting
      mappedStudents.forEach((student, index) => {
        student.rank = index + 1;
      });

      // Limit to top 20 students for dashboard
      const top20Students = mappedStudents.slice(0, 20);

      logger.info('Top scrolling dashboard data fetched successfully', { 
        schoolId, 
        timeframeId,
        studentCount: top20Students.length,
        totalStudents: mappedStudents.length,
        studentsWithPoints: studentsWithPoints.length
      });

      return {
        timeframes: timeframes,
        students: top20Students,
        pointGroups: pointGroups?.map(pg => ({
          id: pg.id,
          name: pg.name,
          color: pg.color
        })) || []
      };
    } catch (error) {
      logger.error('Failed to get top scrolling dashboard', { schoolId, timeframeId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets global dashboard data for featured dashboard
   */
  async getGlobalDashboard(
    schoolId: number,
    timeframeId: number | null
  ): Promise<GlobalPoints | null> {
    const logger = createServerLogger({
      component: 'DashboardService',
      action: 'getGlobalDashboard',
      schoolId: schoolId.toString(),
      timeframeId: timeframeId?.toString() || 'active'
    });

    try {
      const supabase = await supabaseServiceClient();
      
      // Get timeframes
      const timeframes = await this.getTimeframeData(schoolId, timeframeId);
      
      // Get the selected or active timeframe for filtering
      const selectedTimeframe = timeframeId !== null 
        ? timeframes.find(tf => tf.id === timeframeId)
        : timeframes.find(tf => tf.active);
      
      if (!selectedTimeframe) {
        logger.warn('No timeframe found for filtering', { schoolId, timeframeId });
        throw new Error('No timeframe found for filtering');
      }
      
      // Get students with points data
      const { data: students, error: studentsError } = await supabase
        .from('student')
        .select('*')
        .eq('school_id', schoolId);

      if (studentsError) {
        logger.error('Error fetching students', { schoolId, studentsError });
        throw studentsError;
      }

      // Get point groups
      const { data: pointGroups, error: pointGroupsError } = await supabase
        .from('point_group')
        .select('*')
        .eq('school_id', schoolId);

      if (pointGroupsError) {
        logger.error('Error fetching point groups', { schoolId, pointGroupsError });
        throw pointGroupsError;
      }

      // Get student groups
      const { data: studentGroups, error: studentGroupsError } = await supabase
        .from('student_group')
        .select('*')
        .eq('school_id', schoolId);

      if (studentGroupsError) {
        logger.error('Error fetching student groups', { schoolId, studentGroupsError });
        throw studentGroupsError;
      }

      // Get student group pairs to map students to groups
      const { data: studentGroupPairs, error: studentGroupPairsError } = await supabase
        .from('student_group_pair')
        .select('*');

      if (studentGroupPairsError) {
        logger.error('Error fetching student group pairs', { schoolId, studentGroupPairsError });
        throw studentGroupPairsError;
      }

      // Get ranking groups with timeframe for overlap + archived filter
      const { data: allRankingGroups, error: rankingGroupsError } = await supabase
        .from('ranking_group')
        .select('*, school_timeframes(starts_at, ends_at)')
        .eq('school_id', schoolId);

      if (rankingGroupsError) {
        logger.error('Error fetching ranking groups', { schoolId, rankingGroupsError });
        throw rankingGroupsError;
      }

      // Filter: overlap with selected timeframe AND exclude archived (end date in past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rankingGroups = allRankingGroups?.filter(rg => {
        const startsAt = rg.school_timeframes?.starts_at;
        const endsAt = rg.school_timeframes?.ends_at;
        if (!startsAt || !endsAt) return false;
        const rgEnd = new Date(endsAt);
        if (rgEnd < today) return false; // Exclude archived
        const rgStart = new Date(startsAt);
        const selStart = new Date(selectedTimeframe.startsAt);
        const selEnd = new Date(selectedTimeframe.endsAt);
        return rgStart <= selEnd && rgEnd >= selStart; // Overlap
      }) ?? [];

      // Get ranking group pairs to map ranking groups to student groups
      const { data: rankingGroupPairs, error: rankingGroupPairsError } = await supabase
        .from('ranking_group_pair')
        .select('*');

      if (rankingGroupPairsError) {
        logger.error('Error fetching ranking group pairs', { schoolId, rankingGroupPairsError });
        throw rankingGroupPairsError;
      }

      // Get point events with student points for point calculations
      const { data: pointEvents, error: pointEventsError } = await supabase
        .from('point_event')
        .select(`
          *,
          student_group:student_group_id(
            id,
            school_id
          ),
          student_point:student_point(
            student_id,
            point_value
          )
        `)
        .eq('student_group.school_id', schoolId)
        .gte('date', selectedTimeframe.startsAt)
        .lte('date', selectedTimeframe.endsAt);

      if (pointEventsError) {
        logger.error('Error fetching point events', { schoolId, pointEventsError });
        throw pointEventsError;
      }

      // Helper function to get raw points (no conversion rules in new system)
      const getRawPoints = (pointValue: number): number => {
        return pointValue || 0;
      };

      // Calculate points for each student
      const studentPointsMap = new Map<number, {
        id: number,
        firstName: string,
        lastName: string,
        totalPoints: number,
        lastMonthPoints: number,
        grade: number,
        pointGroups: Map<number, { points: number, lastMonthPoints: number }>,
        totalPointsByDay: Map<string, number>,
        pointsEarnedEachDay: Map<string, number>,
        monthToMonthChange: number,
        rank: number,
        lastMonthRank: number,
        gradeRank: number,
        lastMonthGradeRank: number,
        studentGroups: number[]
      }>();

      // Process point events to calculate student points
      pointEvents?.forEach(pointEvent => {
        const eventDate = new Date(pointEvent.date || '');
        const isLastMonth = eventDate <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        
        pointEvent.student_point?.forEach(studentPoint => {
          const pointsEarned = getRawPoints(studentPoint.point_value);

          let existingStudent = studentPointsMap.get(studentPoint.student_id);
          
          if (!existingStudent) {
            const studentData = students?.find(s => s.id === studentPoint.student_id);
            if (!studentData) return;

            existingStudent = {
              id: studentData.id,
              firstName: studentData.first_name,
              lastName: studentData.last_name,
              totalPoints: 0,
              lastMonthPoints: 0,
              grade: studentData.grade,
              pointGroups: new Map(),
              totalPointsByDay: new Map(),
              pointsEarnedEachDay: new Map(),
              monthToMonthChange: 0,
              rank: 0,
              lastMonthRank: 0,
              gradeRank: 0,
              lastMonthGradeRank: 0,
              studentGroups: studentGroupPairs?.filter(sgp => sgp.student_id === studentData.id)
                .map(sgp => sgp.student_group_id) || []
            };
            studentPointsMap.set(studentData.id, existingStudent);
          }

          // Update total points
          existingStudent.totalPoints += pointsEarned;
          if (isLastMonth) {
            existingStudent.lastMonthPoints += pointsEarned;
          }

          // Update point group points
          const pointGroupId = pointEvent.point_group_id;
          if (pointGroupId) {
            if (!existingStudent.pointGroups.has(pointGroupId)) {
              existingStudent.pointGroups.set(pointGroupId, { points: 0, lastMonthPoints: 0 });
            }
            const pointGroup = existingStudent.pointGroups.get(pointGroupId)!;
            pointGroup.points += pointsEarned;
            if (isLastMonth) {
              pointGroup.lastMonthPoints += pointsEarned;
            }
          }

          // Update daily points
          const dateKey = pointEvent.date || '';
          existingStudent.totalPointsByDay.set(dateKey, (existingStudent.totalPointsByDay.get(dateKey) || 0) + pointsEarned);
          existingStudent.pointsEarnedEachDay.set(dateKey, (existingStudent.pointsEarnedEachDay.get(dateKey) || 0) + pointsEarned);
        });
      });

      // Convert student points map to array and calculate ranks
      const studentsWithPoints = Array.from(studentPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((student, index) => ({
          ...student,
          rank: index + 1,
          pointGroups: Array.from(student.pointGroups.entries()).map(([id, data]) => ({
            id,
            points: data.points,
            lastMonthPoints: data.lastMonthPoints,
            rank: 0, // TODO: Calculate point group rank
            lastMonthRank: 0 // TODO: Calculate last month point group rank
          }))
        }));

      // Calculate grade ranks
      const studentsByGrade = new Map<number, typeof studentsWithPoints>();
      studentsWithPoints.forEach(student => {
        if (!studentsByGrade.has(student.grade)) {
          studentsByGrade.set(student.grade, []);
        }
        studentsByGrade.get(student.grade)!.push(student);
      });

      studentsByGrade.forEach((gradeStudents, grade) => {
        gradeStudents
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .forEach((student, index) => {
            student.gradeRank = index + 1;
          });
      });
      const globalPoints: GlobalPoints = {
        schoolId,
        totalStudents: students?.length || 0,
        timeframes: timeframes.map(tf => ({
          id: tf.id,
          name: tf.name,
          startDate: tf.startsAt,
          endDate: tf.endsAt,
          isActive: tf.active
        })),
        grades: [...new Set(students?.map(s => s.grade) || [])].sort(),
        students: studentsWithPoints.slice(0, 20).map(student => ({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          rank: student.rank,
          lastMonthRank: student.lastMonthRank,
          totalPoints: student.totalPoints,
          lastMonthPoints: student.lastMonthPoints,
          grade: student.grade,
          gradeRank: student.gradeRank,
          lastMonthGradeRank: student.lastMonthGradeRank,
          pointGroups: student.pointGroups,
          totalPointsByDay: student.totalPointsByDay,
          pointsEarnedEachDay: student.pointsEarnedEachDay,
          monthToMonthChange: student.totalPoints - student.lastMonthPoints,
          studentGroups: student.studentGroups
        })),
        pointGroups: pointGroups?.map(pg => ({
          id: pg.id,
          name: pg.name,
          color: pg.color
        })) || [],
        studentGroups: studentGroups?.map(sg => ({
          id: sg.id,
          name: sg.name,
          totalStudents: studentGroupPairs?.filter(sgp => sgp.student_group_id === sg.id).length || 0,
          averagePoints: 0, // TODO: Calculate actual average
          lastMonthAveragePoints: 0, // TODO: Calculate actual last month average
          rawPoints: 0, // TODO: Calculate actual raw points
          lastMonthRawPoints: 0, // TODO: Calculate actual last month raw points
          pointGroups: pointGroups?.map(pg => ({
            id: pg.id,
            points: 0 // TODO: Calculate actual points
          })) || []
        })) || [],
        rankingGroups: rankingGroups?.map(rg => ({
          id: rg.id,
          name: rg.name,
          studentGroups: rankingGroupPairs?.filter(rgp => 
            rgp.ranking_group_id === rg.id
          ).map(rgp => {
            const studentGroup = studentGroups?.find(sg => sg.id === rgp.student_group_id);
            if (!studentGroup) return null;
            return {
              id: studentGroup.id,
              name: studentGroup.name,
              totalStudents: studentGroupPairs?.filter(sgp => sgp.student_group_id === studentGroup.id).length || 0,
              averagePoints: 0, // TODO: Calculate actual average
              lastMonthAveragePoints: 0, // TODO: Calculate actual last month average
              rawPoints: 0, // TODO: Calculate actual raw points
              lastMonthRawPoints: 0, // TODO: Calculate actual last month raw points
              pointGroups: pointGroups?.map(pg => ({
                id: pg.id,
                points: 0 // TODO: Calculate actual points
              })) || []
            };
          }).filter((item): item is NonNullable<typeof item> => item !== null) || []
        })) || [],
        pointEvents: pointEvents?.map(pe => ({
          id: pe.id,
          name: pe.name || '',
          maxPoints: pe.max_input || 0,
          date: pe.date || '',
          studentGroupId: pe.student_group_id,
          pointGroup: pe.point_group_id || 0,
          students: [] // TODO: Calculate actual student points
        })) || []
      };

      logger.info('Global dashboard data fetched successfully', { 
        schoolId, 
        timeframeId,
        studentCount: globalPoints.students.length,
        pointGroupCount: globalPoints.pointGroups.length
      });

      return globalPoints;
    } catch (error) {
      logger.error('Failed to get global dashboard', { schoolId, timeframeId }, error as Error);
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