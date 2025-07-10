"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { AdminGroupData } from '@/types/domain';
import { createServerLogger } from '@/utils/serverLogger';

// Extended type for groups with counts
export type AdminGroupWithCountsData = AdminGroupData & {
  studentCount: number;
  teacherCount: number;
  childGroups?: AdminGroupWithCountsData[];
};

/**
 * Get all groups in a school with student and teacher counts
 */
export async function getSchoolGroupsWithCounts(schoolId: number): Promise<AdminGroupWithCountsData[]> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'getSchoolGroupsWithCounts', schoolId });
  
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

    // Get groups with student and teacher counts
    const { data: groups, error: groupsError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id
      `)
      .eq('school_id', schoolId);

    if (groupsError) {
      logger.error('Error fetching groups', { schoolId, groupsError });
      throw new Error('Failed to load groups');
    }

    // Get student counts for each group using aggregation
    const { data: studentCounts, error: studentCountsError } = await serviceClient
      .from('student_group_pair')
      .select('student_group_id')
      .in('student_group_id', groups?.map(g => g.id) || []);

    if (studentCountsError) {
      logger.error('Error fetching student counts', { schoolId, studentCountsError });
      throw new Error('Failed to load student counts');
    }

    // Get teacher counts for each group using aggregation
    const { data: teacherCounts, error: teacherCountsError } = await serviceClient
      .from('teacher_student_group_pair')
      .select('group_id')
      .in('group_id', groups?.map(g => g.id) || []);

    if (teacherCountsError) {
      logger.error('Error fetching teacher counts', { schoolId, teacherCountsError });
      throw new Error('Failed to load teacher counts');
    }

    // Create maps for quick lookup by counting occurrences
    const studentCountMap = new Map<number, number>();
    const teacherCountMap = new Map<number, number>();

    // Count students per group
    studentCounts?.forEach(pair => {
      const currentCount = studentCountMap.get(pair.student_group_id) || 0;
      studentCountMap.set(pair.student_group_id, currentCount + 1);
    });

    // Count teachers per group
    teacherCounts?.forEach(pair => {
      const currentCount = teacherCountMap.get(pair.group_id) || 0;
      teacherCountMap.set(pair.group_id, currentCount + 1);
    });

    // Transform the data to include counts
    const groupsWithCounts = groups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id,
      studentCount: studentCountMap.get(group.id) || 0,
      teacherCount: teacherCountMap.get(group.id) || 0
    })) || [];

    // Build hierarchy
    const buildHierarchy = (parentId: number | null): AdminGroupWithCountsData[] => {
      return groupsWithCounts
        .filter(group => group.parentId === parentId)
        .map(group => ({
          ...group,
          childGroups: buildHierarchy(group.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    const hierarchicalGroups = buildHierarchy(null);

    logger.info('School groups with counts retrieved successfully', { 
      schoolId, 
      groupCount: groupsWithCounts.length 
    });

    return hierarchicalGroups;
  } catch (error) {
    logger.error('Failed to load school groups with counts', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school groups with counts');
  }
}

/**
 * Get all groups in a school
 */
export async function getSchoolGroups(schoolId: number): Promise<AdminGroupData[]> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'getSchoolGroups', schoolId });
  
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

    // Get groups
    const { data: groups, error: groupsError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id
      `)
      .eq('school_id', schoolId);

    if (groupsError) {
      logger.error('Error fetching groups', { schoolId, groupsError });
      throw new Error('Failed to load groups');
    }

    const groupsData = groups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id
    })) || [];

    logger.info('School groups retrieved successfully', { 
      schoolId, 
      groupCount: groupsData.length 
    });

    return groupsData;
  } catch (error) {
    logger.error('Failed to load school groups', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school groups');
  }
}

/**
 * Create a new group
 */
export async function createGroup(schoolId: number, groupData: {
  name: string;
  parentId?: number;
}): Promise<AdminGroupData> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'createGroup', schoolId });
  
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

    // Create group
    const { data: newGroup, error: createError } = await serviceClient
      .from('student_group')
      .insert({
        name: groupData.name,
        parent_id: groupData.parentId,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newGroup) {
      logger.error('Error creating group', { schoolId, createError });
      throw new Error('Failed to create group');
    }

    const createdGroup: AdminGroupData = {
      id: newGroup.id,
      name: newGroup.name,
      parentId: newGroup.parent_id
    };

    logger.info('Group created successfully', { 
      groupId: newGroup.id, 
      schoolId,
      groupName: newGroup.name
    });

    return createdGroup;
  } catch (error) {
    logger.error('Failed to create group', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create group');
  }
} 