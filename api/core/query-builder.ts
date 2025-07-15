import { SupabaseClient } from '@supabase/supabase-js';
import { QueryFilters, NearbyRankParams, TopStudentsParams, UserContext } from './types';

export class QueryBuilder {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Builds the base student points query with all necessary joins
   */
  private buildBaseStudentPointsQuery(filters: QueryFilters) {
    let query = this.supabase
      .from('student_point')
      .select(`
        point_value,
        student_id,
        point_template!inner(
          id,
          name,
          point_group_id,
          class_id
        ),
        student!inner(
          id,
          first_name,
          last_name,
          grade,
          school_id
        )
      `)
      .eq('student.school_id', filters.schoolId);

    // Add timeframe filtering if specified
    if (filters.timeframeId) {
      query = query.eq('point_template.timeframe_id', filters.timeframeId);
    }

    // Add point group filtering if specified
    if (filters.pointGroupId) {
      query = query.eq('point_template.point_group_id', filters.pointGroupId);
    }

    // Add student group filtering if specified
    if (filters.studentGroupId) {
      query = query.eq('student.student_group_pair.student_group_id', filters.studentGroupId);
    }

    // Add grade filtering if specified
    if (filters.grade) {
      query = query.eq('student.grade', filters.grade);
    }

    return query;
  }

  /**
   * Gets student points with rankings for a specific context
   */
  async getStudentPointsWithRanking(filters: QueryFilters, userContext: UserContext) {
    const baseQuery = this.buildBaseStudentPointsQuery(filters);
    
    // Add teacher access restrictions
    if (userContext.role === 'teacher' && userContext.teacherId) {
      const teacherGroups = await this.getTeacherStudentGroups(userContext.teacherId);
      if (teacherGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', teacherGroups);
      }
    }

    // Add group leader access restrictions
    if (userContext.role === 'groupLeader' && userContext.groupLeaderId) {
      const leaderGroups = await this.getGroupLeaderStudentGroups(userContext.groupLeaderId);
      if (leaderGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', leaderGroups);
      }
    }

    // Add teaching assistant access restrictions
    if (userContext.role === 'teachingAssistant' && userContext.teachingAssistantId) {
      // Teaching assistants can only see students in their assigned group
      if (userContext.assistantGroupId) {
        baseQuery.eq('student.student_group_pair.student_group_id', userContext.assistantGroupId);
      }
      // If not full access, filter by allowed point events
      if (!userContext.hasFullAccess && userContext.allowedPointEventIds) {
        baseQuery.in('point_event.id', userContext.allowedPointEventIds);
      }
    }

    const { data, error } = await baseQuery;

    if (error) {
      throw new Error(`Failed to fetch student points: ${error.message}`);
    }

    // Process and rank the data
    return this.processStudentPointsData(data, filters);
  }

  /**
   * Gets nearby ranking data for a specific student
   */
  async getNearbyRanking(params: NearbyRankParams, filters: QueryFilters, _userContext: UserContext) {
    const baseQuery = this.buildBaseStudentPointsQuery(filters);
    
    // Get the target student's rank first
    const targetStudentData = await this.getStudentRank(params.studentId, filters);
    
    if (!targetStudentData) {
      throw new Error('Target student not found or no access');
    }

    // Calculate the rank window
    const startRank = Math.max(1, targetStudentData.rank - params.rankWindow);
    const endRank = targetStudentData.rank + params.rankWindow;

    // Get all students in the rank range
    const { data, error } = await baseQuery
      .order('total_points', { ascending: false })
      .range(startRank - 1, endRank - 1); // Supabase uses 0-based indexing

    if (error) {
      throw new Error(`Failed to fetch nearby ranking: ${error.message}`);
    }

    return this.processNearbyRankingData(data, targetStudentData, params);
  }

  /**
   * Gets top students based on parameters
   */
  async getTopStudents(params: TopStudentsParams, filters: QueryFilters, userContext: UserContext) {
    const baseQuery = this.buildBaseStudentPointsQuery(filters);
    
    // Add teacher access restrictions
    if (userContext.role === 'teacher' && userContext.teacherId) {
      const teacherGroups = await this.getTeacherStudentGroups(userContext.teacherId);
      if (teacherGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', teacherGroups);
      }
    }

    // Add group leader access restrictions
    if (userContext.role === 'groupLeader' && userContext.groupLeaderId) {
      const leaderGroups = await this.getGroupLeaderStudentGroups(userContext.groupLeaderId);
      if (leaderGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', leaderGroups);
      }
    }

    // Add teaching assistant access restrictions
    if (userContext.role === 'teachingAssistant' && userContext.teachingAssistantId) {
      // Teaching assistants can only see students in their assigned group
      if (userContext.assistantGroupId) {
        baseQuery.eq('student.student_group_pair.student_group_id', userContext.assistantGroupId);
      }
      // If not full access, filter by allowed point events
      if (!userContext.hasFullAccess && userContext.allowedPointEventIds) {
        baseQuery.in('point_event.id', userContext.allowedPointEventIds);
      }
    }

    const { data, error } = await baseQuery
      .order('total_points', { ascending: false })
      .limit(params.limit);

    if (error) {
      throw new Error(`Failed to fetch top students: ${error.message}`);
    }

    return this.processTopStudentsData(data, params);
  }

  /**
   * Gets comprehensive dashboard data for a school
   */
  async getDashboardData(filters: QueryFilters, userContext: UserContext) {
    const baseQuery = this.buildBaseStudentPointsQuery(filters);
    
    // Add teacher access restrictions
    if (userContext.role === 'teacher' && userContext.teacherId) {
      const teacherGroups = await this.getTeacherStudentGroups(userContext.teacherId);
      if (teacherGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', teacherGroups);
      }
    }

    // Add group leader access restrictions
    if (userContext.role === 'groupLeader' && userContext.groupLeaderId) {
      const leaderGroups = await this.getGroupLeaderStudentGroups(userContext.groupLeaderId);
      if (leaderGroups.length > 0) {
        baseQuery.in('student.student_group_pair.student_group_id', leaderGroups);
      }
    }

    // Add teaching assistant access restrictions
    if (userContext.role === 'teachingAssistant' && userContext.teachingAssistantId) {
      // Teaching assistants can only see students in their assigned group
      if (userContext.assistantGroupId) {
        baseQuery.eq('student.student_group_pair.student_group_id', userContext.assistantGroupId);
      }
      // If not full access, filter by allowed point events
      if (!userContext.hasFullAccess && userContext.allowedPointEventIds) {
        baseQuery.in('point_event.id', userContext.allowedPointEventIds);
      }
    }

    const { data, error } = await baseQuery;

    if (error) {
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }

    return this.processDashboardData(data, filters);
  }

  /**
   * Helper method to get teacher's student groups
   */
  private async getTeacherStudentGroups(teacherId: number): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('teacher_student_group_pair')
      .select('student_group_id')
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Error fetching teacher student groups:', error);
      return [];
    }

    return data?.map(item => item.student_group_id) || [];
  }

  /**
   * Helper method to get group leader's student groups
   */
  private async getGroupLeaderStudentGroups(groupLeaderId: number): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('student_group_leaders')
      .select('group_id')
      .eq('student_id', groupLeaderId);

    if (error) {
      console.error('Error fetching group leader student groups:', error);
      return [];
    }

    return data?.map(item => item.group_id) || [];
  }

  /**
   * Helper method to get a student's rank
   */
  private async getStudentRank(studentId: number, filters: QueryFilters) {
    const baseQuery = this.buildBaseStudentPointsQuery(filters);
    
    const { data, error } = await baseQuery;

    if (error || !data) {
      return null;
    }

    // Calculate total points per student
    const studentTotals = this.calculateStudentTotals(data);
    
    // Sort by total points and find rank
    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints);

    const studentIndex = sortedStudents.findIndex(([id]) => parseInt(id) === studentId);
    
    if (studentIndex === -1) {
      return null;
    }

    return {
      studentId,
      rank: studentIndex + 1,
      totalPoints: studentTotals[studentId].totalPoints
    };
  }

  /**
   * Helper method to calculate total points per student
   */
  private calculateStudentTotals(data: unknown[]) {
    const totals: Record<number, { totalPoints: number; student: unknown }> = {};

    for (const point of data) {
      const pointData = point as { student_id: number; student: unknown; point_value?: number };
      const studentId = pointData.student_id;
      if (!totals[studentId]) {
        totals[studentId] = {
          totalPoints: 0,
          student: pointData.student
        };
      }
      totals[studentId].totalPoints += pointData.point_value || 0;
    }

    return totals;
  }

  /**
   * Helper method to process student points data
   */
  private processStudentPointsData(data: unknown[], _filters: QueryFilters) {
    const studentTotals = this.calculateStudentTotals(data);
    
    // Sort by total points and add rankings
    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(([studentId, data], index) => ({
        studentId: parseInt(studentId),
        ...data,
        rank: index + 1
      }));

    return sortedStudents;
  }

  /**
   * Helper method to process nearby ranking data
   */
  private processNearbyRankingData(data: unknown[], targetStudent: unknown, params: NearbyRankParams) {
    const studentTotals = this.calculateStudentTotals(data);
    
    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(([studentId, data], index) => ({
        studentId: parseInt(studentId),
        ...data,
        rank: index + 1
      }));

    return {
      targetStudent,
      nearbyStudents: sortedStudents,
      rankWindow: params.rankWindow
    };
  }

  /**
   * Helper method to process top students data
   */
  private processTopStudentsData(data: unknown[], params: TopStudentsParams) {
    const studentTotals = this.calculateStudentTotals(data);
    
    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .slice(0, params.limit)
      .map(([studentId, data], index) => ({
        studentId: parseInt(studentId),
        ...data,
        rank: index + 1
      }));

    return {
      students: sortedStudents,
      limit: params.limit,
      totalCount: Object.keys(studentTotals).length
    };
  }

  /**
   * Helper method to process dashboard data
   */
  private processDashboardData(data: unknown[], filters: QueryFilters) {
    const studentTotals = this.calculateStudentTotals(data);
    
    const sortedStudents = Object.entries(studentTotals)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(([studentId, data], index) => ({
        studentId: parseInt(studentId),
        ...data,
        rank: index + 1
      }));

    return {
      students: sortedStudents,
      totalStudents: sortedStudents.length,
      averagePoints: sortedStudents.reduce((sum, student) => sum + student.totalPoints, 0) / sortedStudents.length,
      topStudents: sortedStudents.slice(0, 10),
      filters
    };
  }
} 