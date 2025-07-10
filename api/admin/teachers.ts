"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { AdminTeacherData } from '@/types/domain';
import { createServerLogger } from '@/utils/serverLogger';

/**
 * Get all teachers in a school
 */
export async function getSchoolTeachers(schoolId: number): Promise<AdminTeacherData[]> {
  const logger = createServerLogger({ component: 'AdminTeachersAPI', action: 'getSchoolTeachers', schoolId });
  
  try {
    // Get current user from regular client
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Verify admin access to school
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id,
        admin (
          admin_school_pair (
            school_id
          )
        )
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    if (userError || !userData || !userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === schoolId);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // Get teachers with their group associations
    const { data: teachers, error: teachersError } = await serviceClient
      .from('teacher')
      .select(`
        id,
        first_name,
        last_name,
        link_code,
        linked_user,
        teacher_student_group_pair (
          group_id
        )
      `)
      .eq('school_id', schoolId);

    if (teachersError) {
      logger.error('Error fetching teachers', { schoolId, teachersError });
      throw new Error('Failed to load teachers');
    }

    const teachersWithGroups = teachers?.map(teacher => ({
      id: teacher.id,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      groupIds: teacher.teacher_student_group_pair?.map(pair => pair.group_id) || []
    })) || [];

    logger.info('School teachers retrieved successfully', { 
      schoolId, 
      teacherCount: teachersWithGroups.length 
    });

    return teachersWithGroups;
  } catch (error) {
    logger.error('Failed to load school teachers', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school teachers');
  }
}

/**
 * Create a new teacher
 */
export async function createTeacher(schoolId: number, teacherData: {
  firstName: string;
  lastName: string;
  groupIds?: number[];
}): Promise<AdminTeacherData> {
  const logger = createServerLogger({ component: 'AdminTeachersAPI', action: 'createTeacher', schoolId });
  
  try {
    // Get current user from regular client
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      logger.error('User not authenticated', { authError });
      throw new Error('User not authenticated');
    }

    // Use service client for database operations
    const serviceClient = await supabaseServiceClient();
    
    // Verify admin access to school
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select(`
        id,
        admin_id,
        admin (
          admin_school_pair (
            school_id
          )
        )
      `)
      .eq('supabase_id', supabaseUser.id)
      .single();

    if (userError || !userData || !userData.admin_id) {
      logger.error('User is not an admin', { userId: supabaseUser.id });
      throw new Error('Access denied - admin role required');
    }

    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === schoolId);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // Generate a unique link code
    const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create teacher
    const { data: newTeacher, error: createError } = await serviceClient
      .from('teacher')
      .insert({
        first_name: teacherData.firstName,
        last_name: teacherData.lastName,
        link_code: linkCode,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newTeacher) {
      logger.error('Error creating teacher', { schoolId, createError });
      throw new Error('Failed to create teacher');
    }

    // Add teacher to groups if specified
    if (teacherData.groupIds && teacherData.groupIds.length > 0) {
      const groupPairs = teacherData.groupIds.map(groupId => ({
        teacher_id: newTeacher.id,
        group_id: groupId
      }));

      const { error: groupError } = await serviceClient
        .from('teacher_student_group_pair')
        .insert(groupPairs);

      if (groupError) {
        logger.error('Error adding teacher to groups', { teacherId: newTeacher.id, groupError });
        // Don't throw here - teacher was created successfully
      }
    }

    const createdTeacher: AdminTeacherData = {
      id: newTeacher.id,
      firstName: newTeacher.first_name,
      lastName: newTeacher.last_name,
      groupIds: teacherData.groupIds || []
    };

    logger.info('Teacher created successfully', { 
      teacherId: newTeacher.id, 
      schoolId,
      groupCount: teacherData.groupIds?.length || 0
    });

    return createdTeacher;
  } catch (error) {
    logger.error('Failed to create teacher', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create teacher');
  }
} 