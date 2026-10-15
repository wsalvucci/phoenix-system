import { SupabaseClient } from '@supabase/supabase-js';
import { UserContext, UserRole } from './types';
import { createServerLogger } from '@/utils/serverLogger';

export class UserContextResolver {
  private authClient: SupabaseClient;
  private dbClient: SupabaseClient;

  /**
   * @param authClient the cookie client; used for `auth.getUser()` only.
   * @param dbClient the server-only service client. Required: under D25 (BACKEND_PLAN section 12) RLS is
   *   deny-all, so reading through the cookie client would return no rows.
   */
  constructor(authClient: SupabaseClient, dbClient: SupabaseClient) {
    this.authClient = authClient;
    this.dbClient = dbClient;
  }

  /**
   * Resolves the complete user context for API operations
   */
  async resolveUserContext(): Promise<UserContext | null> {
    const logger = createServerLogger({
      component: 'UserContextResolver',
      action: 'resolveUserContext'
    });

    try {
      logger.debug('Starting user context resolution');
      
      // Use the auth client for authentication
      const { data: { user: supabaseUser }, error: authError } = await this.authClient.auth.getUser();
      
      logger.debug('Auth getUser result', { 
        hasUser: !!supabaseUser, 
        userId: supabaseUser?.id,
        authError: authError ? authError.message : null 
      });
      
      if (authError) {
        logger.error('Error getting authenticated user', { authError });
        return null;
      }
      
      if (!supabaseUser) {
        logger.warn('No authenticated user found');
        return null;
      }

      logger.debug('Fetching user data from database', { supabaseUserId: supabaseUser.id });

      // Get user data with all relationships
      const { data: userData, error: userError } = await this.dbClient
        .from('user')
        .select(`
          id,
          admin_id,
          teacher_id,
          student_id,
          admin (
            id,
            admin_school_pair (
              school_id
            )
          ),
          teacher (
            id,
            school_id
          ),
          user_student_pair (
            student (
              id,
              school_id
            )
          )
        `)
        .eq('supabase_id', supabaseUser.id)
        .single();

      logger.debug('Database user query result', { 
        hasUserData: !!userData, 
        userId: userData?.id,
        adminId: userData?.admin_id,
        teacherId: userData?.teacher_id,
        studentId: userData?.student_id,
        userError: userError ? userError.message : null 
      });

      if (userError) {
        logger.error('Error fetching user data', { userId: supabaseUser.id }, new Error(userError.message));
        return null;
      }

      if (!userData) {
        logger.warn('User data not found', { userId: supabaseUser.id });
        return null;
      }

      // Determine user role and context
      const context = await this.determineUserContext(userData);
      
      logger.debug('User context determined', { 
        hasContext: !!context, 
        role: context?.role,
        schoolId: context?.schoolId 
      });
      
      if (!context) {
        logger.warn('Unable to determine user context', { userId: supabaseUser.id });
        return null;
      }

      logger.info('User context resolved', {
        userId: supabaseUser.id,
        role: context.role,
        schoolId: context.schoolId
      });

      return context;
    } catch (error) {
      logger.error('Error resolving user context', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, error as Error);
      return null;
    }
  }

  /**
   * Determines user context based on user data
   */
  private async determineUserContext(userData: unknown): Promise<UserContext | null> {
    const data = userData as {
      supabase_id: string;
      admin_id?: number;
      admin?: { admin_school_pair: { school_id: number }[] };
      teacher_id?: number;
      teacher?: { school_id: number };
      student_id?: number;
      user_student_pair?: { student: { school_id: number } }[];
    };

    // Check if user is an admin
    if (data.admin_id && data.admin) {
      const adminSchools = data.admin.admin_school_pair;
      if (adminSchools && adminSchools.length > 0) {
        // For now, use the first school - in the future, you might want to handle multiple schools
        return {
          userId: data.supabase_id,
          role: 'admin' as UserRole,
          schoolId: adminSchools[0].school_id,
          adminId: data.admin_id
        };
      }
    }

    // Check if user is a teacher
    if (data.teacher_id && data.teacher) {
      return {
        userId: data.supabase_id,
        role: 'teacher' as UserRole,
        schoolId: data.teacher.school_id,
        teacherId: data.teacher_id
      };
    }

    // Check if user is a student
    if (data.student_id) {
      // Get student data to find school
      const studentPair = data.user_student_pair?.[0];
      if (studentPair?.student) {
        // Check if this student is also a group leader
        const { data: leaderGroups } = await this.dbClient
          .from('student_group_leaders')
          .select('group_id')
          .eq('student_id', data.student_id);

        if (leaderGroups && leaderGroups.length > 0) {
          return {
            userId: data.supabase_id,
            role: 'groupLeader' as UserRole,
            schoolId: studentPair.student.school_id,
            studentId: data.student_id,
            groupLeaderId: data.student_id,
            managedGroupIds: leaderGroups.map(g => g.group_id)
          };
        }

        return {
          userId: data.supabase_id,
          role: 'student' as UserRole,
          schoolId: studentPair.student.school_id,
          studentId: data.student_id
        };
      }
    }

    // Check if user is a parent (has student pairs but no direct student/teacher/admin role)
    if (data.user_student_pair && data.user_student_pair.length > 0) {
      const studentPair = data.user_student_pair[0];
      if (studentPair?.student) {
        return {
          userId: data.supabase_id,
          role: 'parent' as UserRole,
          schoolId: studentPair.student.school_id
        };
      }
    }

    return null;
  }

  /**
   * Validates that a user has access to a specific school
   */
  async validateSchoolAccess(schoolId: number): Promise<boolean> {
    const context = await this.resolveUserContext();
    if (!context) {
      return false;
    }

          // Admins can access any school they're paired with
      if (context.role === 'admin') {
        const { data: adminSchools, error } = await this.dbClient
        .from('admin_school_pair')
        .select('school_id')
        .eq('admin_id', context.adminId)
        .eq('school_id', schoolId);

      if (error || !adminSchools || adminSchools.length === 0) {
        return false;
      }
      return true;
    }

    // Teachers can access their assigned school
    if (context.role === 'teacher') {
      return context.schoolId === schoolId;
    }

    // Students and parents can access their school
    if (context.role === 'student' || context.role === 'parent') {
      return context.schoolId === schoolId;
    }

    return false;
  }

  /**
   * Gets all schools a user has access to
   */
  async getUserSchools(): Promise<{ id: number; name: string }[]> {
    const context = await this.resolveUserContext();
    if (!context) {
      return [];
    }

    if (context.role === 'admin') {
              const { data: adminSchools, error } = await this.dbClient
        .from('admin_school_pair')
        .select(`
          school_id,
          school (
            id,
            name
          )
        `)
        .eq('admin_id', context.adminId);

      if (error || !adminSchools) {
        return [];
      }

      return adminSchools.map((pair: unknown) => {
        const pairData = pair as { school: { id: number; name: string } };
        return {
          id: pairData.school.id,
          name: pairData.school.name
        };
      });
    }

    // For other roles, return their single school
            const { data: school, error } = await this.dbClient
      .from('school')
      .select('id, name')
      .eq('id', context.schoolId)
      .single();

    if (error || !school) {
      return [];
    }

    return [school];
  }
} 