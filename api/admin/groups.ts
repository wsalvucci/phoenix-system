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
export async function getSchoolGroupsWithCounts(schoolId: number, includeArchived: boolean = false): Promise<AdminGroupWithCountsData[]> {
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
    let query = serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id,
        archived,
        school_id
      `)
      .eq('school_id', schoolId);
    
    // Filter out archived groups unless explicitly requested
    if (!includeArchived) {
      query = query.eq('archived', false);
    }
    
    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      logger.error('Error fetching groups', { schoolId, groupsError });
      throw new Error('Failed to load groups');
    }

    // Debug: Log the groups being returned
    logger.debug('Groups returned from database', { 
      schoolId, 
      groups,
      groupsLength: groups?.length || 0,
      includeArchived
    });

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
    const groupsWithCounts: AdminGroupWithCountsData[] = groups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id,
      archived: group.archived,
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
 * Add a student to a group
 */
export async function addStudentToGroup(schoolId: number, groupId: number, studentId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'addStudentToGroup', schoolId, groupId, studentId });
  
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

    // Verify the group belongs to the school
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select('id')
      .eq('id', groupId)
      .eq('school_id', schoolId)
      .single();

    if (groupError || !group) {
      logger.error('Group not found or does not belong to school', { groupId, schoolId });
      throw new Error('Group not found');
    }

    // Verify the student belongs to the school
    const { data: student, error: studentError } = await serviceClient
      .from('student')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      logger.error('Student not found or does not belong to school', { studentId, schoolId });
      throw new Error('Student not found');
    }

    // Check if student is already in the group
    const { data: existingPair, error: existingError } = await serviceClient
      .from('student_group_pair')
      .select('id')
      .eq('student_id', studentId)
      .eq('student_group_id', groupId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      logger.error('Error checking existing student-group pair', { existingError });
      throw new Error('Failed to check existing relationship');
    }

    if (existingPair) {
      logger.warn('Student is already in the group', { studentId, groupId });
      return; // Already exists, no need to add
    }

    // Add student to group
    const { error: insertError } = await serviceClient
      .from('student_group_pair')
      .insert([{ 
        student_id: studentId, 
        student_group_id: groupId 
      }]);

    if (insertError) {
      logger.error('Error adding student to group', { insertError });
      throw new Error('Failed to add student to group');
    }

    logger.info('Student added to group successfully', { studentId, groupId, schoolId });
  } catch (error) {
    logger.error('Failed to add student to group', { 
      studentId, 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Remove a student from a group
 */
export async function removeStudentFromGroup(schoolId: number, groupId: number, studentId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'removeStudentFromGroup', schoolId, groupId, studentId });
  
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

    // Remove student from group
    const { error: deleteError } = await serviceClient
      .from('student_group_pair')
      .delete()
      .eq('student_id', studentId)
      .eq('student_group_id', groupId);

    if (deleteError) {
      logger.error('Error removing student from group', { deleteError });
      throw new Error('Failed to remove student from group');
    }

    logger.info('Student removed from group successfully', { studentId, groupId, schoolId });
  } catch (error) {
    logger.error('Failed to remove student from group', { 
      studentId, 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Add a teacher to a group
 */
export async function addTeacherToGroup(schoolId: number, groupId: number, teacherId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'addTeacherToGroup', schoolId, groupId, teacherId });
  
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

    // Verify the group belongs to the school
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select('id')
      .eq('id', groupId)
      .eq('school_id', schoolId)
      .single();

    if (groupError || !group) {
      logger.error('Group not found or does not belong to school', { groupId, schoolId });
      throw new Error('Group not found');
    }

    // Verify the teacher belongs to the school
    const { data: teacher, error: teacherError } = await serviceClient
      .from('teacher')
      .select('id')
      .eq('id', teacherId)
      .eq('school_id', schoolId)
      .single();

    if (teacherError || !teacher) {
      logger.error('Teacher not found or does not belong to school', { teacherId, schoolId });
      throw new Error('Teacher not found');
    }

    // Check if teacher is already in the group
    const { data: existingPair, error: existingError } = await serviceClient
      .from('teacher_student_group_pair')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('group_id', groupId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      logger.error('Error checking existing teacher-group pair', { existingError });
      throw new Error('Failed to check existing relationship');
    }

    if (existingPair) {
      logger.warn('Teacher is already in the group', { teacherId, groupId });
      return; // Already exists, no need to add
    }

    // Add teacher to group
    const { error: insertError } = await serviceClient
      .from('teacher_student_group_pair')
      .insert([{ 
        teacher_id: teacherId, 
        group_id: groupId 
      }]);

    if (insertError) {
      logger.error('Error adding teacher to group', { insertError });
      throw new Error('Failed to add teacher to group');
    }

    logger.info('Teacher added to group successfully', { teacherId, groupId, schoolId });
  } catch (error) {
    logger.error('Failed to add teacher to group', { 
      teacherId, 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Remove a teacher from a group
 */
export async function removeTeacherFromGroup(schoolId: number, groupId: number, teacherId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'removeTeacherFromGroup', schoolId, groupId, teacherId });
  
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

    // Remove teacher from group
    const { error: deleteError } = await serviceClient
      .from('teacher_student_group_pair')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('group_id', groupId);

    if (deleteError) {
      logger.error('Error removing teacher from group', { deleteError });
      throw new Error('Failed to remove teacher from group');
    }

    logger.info('Teacher removed from group successfully', { teacherId, groupId, schoolId });
  } catch (error) {
    logger.error('Failed to remove teacher from group', { 
      teacherId, 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get all groups in a school
 */
export async function getSchoolGroups(schoolId: number, includeArchived: boolean = false): Promise<AdminGroupData[]> {
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
    let query = serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id,
        archived
      `)
      .eq('school_id', schoolId);
    
    // Filter out archived groups unless explicitly requested
    if (!includeArchived) {
      query = query.eq('archived', false);
    }
    
    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      logger.error('Error fetching groups', { schoolId, groupsError });
      throw new Error('Failed to load groups');
    }

    const groupsData: AdminGroupData[] = groups?.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parent_id,
      archived: group.archived
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

/**
 * Update an existing group
 */
export async function updateGroup(schoolId: number, groupId: number, groupData: {
  name?: string;
  parentId?: number | null;
}): Promise<AdminGroupData> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'updateGroup', schoolId, groupId });
  
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

    // Verify the group belongs to this school
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select('id, name, school_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      logger.error('Group not found', { groupId, groupError });
      throw new Error('Group not found');
    }

    if (group.school_id !== schoolId) {
      logger.error('Group does not belong to this school', { groupId, groupSchoolId: group.school_id, schoolId });
      throw new Error('Group does not belong to this school');
    }

    // If updating parent, verify the new parent exists and belongs to the same school
    if (groupData.parentId !== undefined) {
      if (groupData.parentId !== null) {
        const { data: parentGroup, error: parentError } = await serviceClient
          .from('student_group')
          .select('id, name, school_id')
          .eq('id', groupData.parentId)
          .single();

        if (parentError || !parentGroup) {
          logger.error('Parent group not found', { parentId: groupData.parentId, parentError });
          throw new Error('Parent group not found');
        }

        if (parentGroup.school_id !== schoolId) {
          logger.error('Parent group does not belong to this school', { 
            parentId: groupData.parentId, 
            parentSchoolId: parentGroup.school_id, 
            schoolId 
          });
          throw new Error('Parent group does not belong to this school');
        }

        // Prevent circular references - check if the new parent is a descendant of this group
        const checkCircularReference = async (parentId: number, targetId: number): Promise<boolean> => {
          if (parentId === targetId) return true;
          
          const { data: parent } = await serviceClient
            .from('student_group')
            .select('parent_id')
            .eq('id', parentId)
            .single();
          
          if (!parent || parent.parent_id === null) return false;
          return checkCircularReference(parent.parent_id, targetId);
        };

        const isCircular = await checkCircularReference(groupData.parentId, groupId);
        if (isCircular) {
          logger.error('Circular reference detected', { groupId, parentId: groupData.parentId });
          throw new Error('Cannot set parent to a descendant group (circular reference)');
        }
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (groupData.name !== undefined) updateData.name = groupData.name;
    if (groupData.parentId !== undefined) updateData.parent_id = groupData.parentId;

    // Update group
    const { data: updatedGroup, error: updateError } = await serviceClient
      .from('student_group')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError || !updatedGroup) {
      logger.error('Error updating group', { groupId, updateError });
      throw new Error('Failed to update group');
    }

    const result: AdminGroupData = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      parentId: updatedGroup.parent_id,
      archived: updatedGroup.archived
    };

    logger.info('Group updated successfully', { 
      groupId, 
      schoolId,
      groupName: updatedGroup.name,
      changes: Object.keys(updateData)
    });

    return result;
  } catch (error) {
    logger.error('Failed to update group', { 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to update group');
  }
}

/**
 * Archive a student group
 */
export async function archiveGroup(schoolId: number, groupId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'archiveGroup', schoolId, groupId });
  
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

    // Verify the group belongs to this school
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select('id, name, school_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      logger.error('Group not found', { groupId, groupError });
      throw new Error('Group not found');
    }

    if (group.school_id !== schoolId) {
      logger.error('Group does not belong to this school', { groupId, groupSchoolId: group.school_id, schoolId });
      throw new Error('Group does not belong to this school');
    }

    // Archive the group
    const { error: archiveError } = await serviceClient
      .from('student_group')
      .update({ archived: true })
      .eq('id', groupId);

    if (archiveError) {
      logger.error('Error archiving group', { groupId, archiveError });
      throw new Error('Failed to archive group');
    }

    logger.info('Group archived successfully', { 
      groupId, 
      schoolId,
      groupName: group.name
    });
  } catch (error) {
    logger.error('Failed to archive group', { 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to archive group');
  }
}

/**
 * Delete a student group
 */
export async function deleteGroup(schoolId: number, groupId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'deleteGroup', schoolId, groupId });
  
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

    // Verify the group belongs to this school
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select('id, name, school_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      logger.error('Group not found', { groupId, groupError });
      throw new Error('Group not found');
    }

    if (group.school_id !== schoolId) {
      logger.error('Group does not belong to this school', { groupId, groupSchoolId: group.school_id, schoolId });
      throw new Error('Group does not belong to this school');
    }

    // Check if group has child groups
    const { data: childGroups, error: childGroupsError } = await serviceClient
      .from('student_group')
      .select('id, name')
      .eq('parent_id', groupId);

    if (childGroupsError) {
      logger.error('Error checking child groups', { groupId, childGroupsError });
      throw new Error('Failed to check child groups');
    }

    // If group has child groups, make them top-level by setting their parent_id to null
    if (childGroups && childGroups.length > 0) {
      const { error: updateChildrenError } = await serviceClient
        .from('student_group')
        .update({ parent_id: null })
        .eq('parent_id', groupId);

      if (updateChildrenError) {
        logger.error('Error updating child groups', { groupId, updateChildrenError });
        throw new Error('Failed to update child groups');
      }

      logger.info('Child groups made top-level', { 
        groupId, 
        childGroupCount: childGroups.length,
        childGroupNames: childGroups.map(cg => cg.name)
      });
    }

    // Note: Database cascade rules will automatically handle deletion of:
    // - student_group_pair records (ON DELETE CASCADE)
    // - teacher_student_group_pair records (ON DELETE CASCADE)
    // - ranking_group_pair records (ON DELETE CASCADE)
    // - teaching_assistant records (ON DELETE CASCADE)
    // - point_event records (ON DELETE CASCADE)
    // - point_template records (ON DELETE CASCADE)

    // Delete the group
    const { error: deleteError } = await serviceClient
      .from('student_group')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      logger.error('Error deleting group', { groupId, deleteError });
      throw new Error('Failed to delete group');
    }

    logger.info('Group deleted successfully', { 
      groupId, 
      schoolId,
      groupName: group.name
    });
  } catch (error) {
    logger.error('Failed to delete group', { 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to delete group');
  }
} 

/**
 * Get a single group with detailed information including students, teachers, and child groups
 */
export async function getGroupById(schoolId: number, groupId: number): Promise<AdminGroupData & {
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    grade: number;
    powerschoolId?: number;
  }>;
  teachers: Array<{
    id: number;
    firstName: string;
    lastName: string;
  }>;
  childGroups: Array<{
    id: number;
    name: string;
    studentCount: number;
    teacherCount: number;
  }>;
  parentGroup?: {
    id: number;
    name: string;
  };
} | null> {
  const logger = createServerLogger({ component: 'AdminGroupsAPI', action: 'getGroupById', schoolId, groupId });
  
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

    // Get the group with parent information
    const { data: group, error: groupError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name,
        parent_id,
        archived,
        school_id
      `)
      .eq('id', groupId)
      .eq('school_id', schoolId)
      .single();

    if (groupError || !group) {
      logger.error('Error fetching group', { groupId, schoolId, groupError });
      throw new Error('Group not found');
    }

    // Get students in this group
    const { data: students, error: studentsError } = await serviceClient
      .from('student_group_pair')
      .select(`
        student (
          id,
          first_name,
          last_name,
          grade,
          powerschool_id
        )
      `)
      .eq('student_group_id', groupId);

    if (studentsError) {
      logger.error('Error fetching students', { groupId, studentsError });
      throw new Error('Failed to load students');
    }

    // Get teachers in this group
    const { data: teachers, error: teachersError } = await serviceClient
      .from('teacher_student_group_pair')
      .select(`
        teacher (
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', groupId);

    if (teachersError) {
      logger.error('Error fetching teachers', { groupId, teachersError });
      throw new Error('Failed to load teachers');
    }

    // Get child groups
    const { data: childGroups, error: childGroupsError } = await serviceClient
      .from('student_group')
      .select(`
        id,
        name
      `)
      .eq('parent_id', groupId);

    if (childGroupsError) {
      logger.error('Error fetching child groups', { groupId, childGroupsError });
      throw new Error('Failed to load child groups');
    }

    // Get student and teacher counts for child groups
    const childGroupIds = childGroups?.map(cg => cg.id) || [];
    const childGroupCounts = await Promise.all(
      childGroupIds.map(async (childGroupId) => {
        const [studentCountResult, teacherCountResult] = await Promise.all([
          serviceClient
            .from('student_group_pair')
            .select('student_group_id', { count: 'exact' })
            .eq('student_group_id', childGroupId),
          serviceClient
            .from('teacher_student_group_pair')
            .select('group_id', { count: 'exact' })
            .eq('group_id', childGroupId)
        ]);

        return {
          id: childGroupId,
          studentCount: studentCountResult.count || 0,
          teacherCount: teacherCountResult.count || 0
        };
      })
    );

    // Get parent group if exists
    let parentGroup = undefined;
    if (group.parent_id) {
      const { data: parent, error: parentError } = await serviceClient
        .from('student_group')
        .select(`
          id,
          name
        `)
        .eq('id', group.parent_id)
        .single();

      if (!parentError && parent) {
        parentGroup = {
          id: parent.id,
          name: parent.name
        };
      }
    }

    // Transform the data
    const result = {
      id: group.id,
      name: group.name,
      parentId: group.parent_id,
      archived: group.archived,
      students: students?.filter(s => s.student !== null).map(s => ({
        id: s.student!.id,
        firstName: s.student!.first_name,
        lastName: s.student!.last_name,
        grade: s.student!.grade,
        powerschoolId: s.student!.powerschool_id
      })) || [],
      teachers: teachers?.filter(t => t.teacher !== null).map(t => ({
        id: t.teacher!.id,
        firstName: t.teacher!.first_name,
        lastName: t.teacher!.last_name
      })) || [],
      childGroups: childGroups?.map(cg => {
        const counts = childGroupCounts.find(count => count.id === cg.id);
        return {
          id: cg.id,
          name: cg.name,
          studentCount: counts?.studentCount || 0,
          teacherCount: counts?.teacherCount || 0
        };
      }) || [],
      parentGroup
    };

    logger.info('Group details retrieved successfully', { 
      groupId, 
      schoolId,
      studentCount: result.students.length,
      teacherCount: result.teachers.length,
      childGroupCount: result.childGroups.length
    });

    return result;
  } catch (error) {
    logger.error('Failed to load group details', { 
      groupId, 
      schoolId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load group details');
  }
} 