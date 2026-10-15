"use server";

import { requireAdminOfRow } from '@/app/supaApi/server/adminScope';
import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { createServerLogger } from '@/utils/serverLogger';

export type AdminPointGroupData = {
  id: number;
  name: string;
  color: string;
  ranked: boolean;
  parentId?: number | null;
  childGroups?: AdminPointGroupData[];
};

/**
 * Get all point groups in a school
 */
export async function getSchoolPointGroups(schoolId: number): Promise<AdminPointGroupData[]> {
  const logger = createServerLogger({ component: 'AdminPointGroupsAPI', action: 'getSchoolPointGroups', schoolId });
  
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

    // Get point groups
    const { data: pointGroups, error: pointGroupsError } = await serviceClient
      .from('point_group')
      .select(`
        id,
        name,
        color,
        ranked,
        parent_id
      `)
      .eq('school_id', schoolId);

    if (pointGroupsError) {
      logger.error('Error fetching point groups', { schoolId, pointGroupsError });
      throw new Error('Failed to load point groups');
    }

    const pointGroupsData = pointGroups?.map(group => ({
      id: group.id,
      name: group.name,
      color: group.color,
      ranked: group.ranked,
      parentId: group.parent_id
    })) || [];

    // Build hierarchy
    const buildHierarchy = (parentId: number | null): AdminPointGroupData[] => {
      return pointGroupsData
        .filter(group => group.parentId === parentId)
        .map(group => ({
          ...group,
          childGroups: buildHierarchy(group.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    const hierarchicalPointGroups = buildHierarchy(null);

    logger.info('School point groups retrieved successfully', { 
      schoolId, 
      pointGroupCount: pointGroupsData.length 
    });

    return hierarchicalPointGroups;
  } catch (error) {
    logger.error('Failed to load school point groups', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school point groups');
  }
}

/**
 * Create a new point group
 */
export async function createPointGroup(schoolId: number, groupData: {
  name: string;
  color: string;
  ranked: boolean;
  parentId?: number;
}): Promise<AdminPointGroupData> {
  const logger = createServerLogger({ component: 'AdminPointGroupsAPI', action: 'createPointGroup', schoolId });
  
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

    // Create point group
    const { data: newPointGroup, error: createError } = await serviceClient
      .from('point_group')
      .insert({
        name: groupData.name,
        color: groupData.color,
        ranked: groupData.ranked,
        parent_id: groupData.parentId,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newPointGroup) {
      logger.error('Error creating point group', { schoolId, createError });
      throw new Error('Failed to create point group');
    }

    const createdPointGroup: AdminPointGroupData = {
      id: newPointGroup.id,
      name: newPointGroup.name,
      color: newPointGroup.color,
      ranked: newPointGroup.ranked,
      parentId: newPointGroup.parent_id
    };

    logger.info('Point group created successfully', { 
      pointGroupId: newPointGroup.id, 
      schoolId,
      pointGroupName: newPointGroup.name
    });

    return createdPointGroup;
  } catch (error) {
    logger.error('Failed to create point group', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create point group');
  }
}

/**
 * Update a point group
 */
export async function updatePointGroup(
  pointGroupId: number, 
  groupData: {
    name?: string;
    color?: string;
    ranked?: boolean;
  }
): Promise<AdminPointGroupData> {
  const logger = createServerLogger({ 
    component: 'AdminPointGroupsAPI', 
    action: 'updatePointGroup', 
    pointGroupId 
  });
  
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
    
    // Verify admin access
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

    // Authorize against the school that owns the row(s), not just 'is some admin'
    await requireAdminOfRow('point_group', pointGroupId);

    // Update point group
    const { data: updatedPointGroup, error: updateError } = await serviceClient
      .from('point_group')
      .update({
        name: groupData.name,
        color: groupData.color,
        ranked: groupData.ranked
      })
      .eq('id', pointGroupId)
      .select()
      .single();

    if (updateError || !updatedPointGroup) {
      logger.error('Error updating point group', { pointGroupId, updateError });
      throw new Error('Failed to update point group');
    }

    const result: AdminPointGroupData = {
      id: updatedPointGroup.id,
      name: updatedPointGroup.name,
      color: updatedPointGroup.color,
      ranked: updatedPointGroup.ranked,
      parentId: updatedPointGroup.parent_id
    };

    logger.info('Point group updated successfully', { 
      pointGroupId, 
      pointGroupName: updatedPointGroup.name
    });

    return result;
  } catch (error) {
    logger.error('Failed to update point group', { 
      pointGroupId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to update point group');
  }
} 