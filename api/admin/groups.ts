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
    const updateData: any = {};
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