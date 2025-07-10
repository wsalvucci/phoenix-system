"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { createServerLogger } from '@/utils/serverLogger';

export type AdminRankingGroupData = {
  id: number;
  name: string;
  schoolId: number;
  studentGroupIds: number[];
  studentGroups: {
    id: number;
    name: string;
    archived: boolean;
  }[];
};

/**
 * Get all ranking groups in a school
 */
export async function getSchoolRankingGroups(schoolId: number): Promise<AdminRankingGroupData[]> {
  const logger = createServerLogger({ component: 'AdminRankingGroupsAPI', action: 'getSchoolRankingGroups', schoolId });
  
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

    // Get ranking groups with their student group associations
    const { data: rankingGroups, error: rankingGroupsError } = await serviceClient
      .from('ranking_group')
      .select(`
        id,
        name,
        school_id,
        ranking_group_pair (
          student_group_id,
          student_group (
            id,
            name,
            archived
          )
        )
      `)
      .eq('school_id', schoolId);

    if (rankingGroupsError) {
      logger.error('Error fetching ranking groups', { schoolId, rankingGroupsError });
      throw new Error('Failed to load ranking groups');
    }

    // Debug: Log raw data from database
    logger.debug('Raw ranking groups data from database', { 
      schoolId, 
      rankingGroups,
      rankingGroupsLength: rankingGroups?.length || 0
    });

    const rankingGroupsData = rankingGroups?.map(group => ({
      id: group.id,
      name: group.name,
      schoolId: group.school_id,
      studentGroupIds: group.ranking_group_pair?.map(pair => pair.student_group_id) || [],
      studentGroups: group.ranking_group_pair
        ?.map(pair => ({
          id: pair.student_group?.id,
          name: pair.student_group?.name,
          archived: pair.student_group?.archived
        }))
        .filter((sg): sg is { id: number; name: string; archived: boolean } => 
          sg.id !== undefined && sg.name !== undefined && sg.archived !== undefined
        ) || []
    })) || [];

    // Debug: Log processed data
    logger.debug('Processed ranking groups data', { 
      schoolId, 
      rankingGroupsData,
      rankingGroupsDataLength: rankingGroupsData.length
    });

    logger.info('School ranking groups retrieved successfully', { 
      schoolId, 
      rankingGroupCount: rankingGroupsData.length 
    });

    return rankingGroupsData;
  } catch (error) {
    logger.error('Failed to load school ranking groups', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school ranking groups');
  }
}

/**
 * Create a new ranking group
 */
export async function createRankingGroup(schoolId: number, groupData: {
  name: string;
}): Promise<AdminRankingGroupData> {
  const logger = createServerLogger({ component: 'AdminRankingGroupsAPI', action: 'createRankingGroup', schoolId });
  
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

    // Create ranking group
    const { data: newRankingGroup, error: createError } = await serviceClient
      .from('ranking_group')
      .insert({
        name: groupData.name,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newRankingGroup) {
      logger.error('Error creating ranking group', { schoolId, createError });
      throw new Error('Failed to create ranking group');
    }

    const createdRankingGroup: AdminRankingGroupData = {
      id: newRankingGroup.id,
      name: newRankingGroup.name,
      schoolId: newRankingGroup.school_id,
      studentGroupIds: [],
      studentGroups: []
    };

    logger.info('Ranking group created successfully', { 
      rankingGroupId: newRankingGroup.id, 
      schoolId,
      rankingGroupName: newRankingGroup.name
    });

    return createdRankingGroup;
  } catch (error) {
    logger.error('Failed to create ranking group', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create ranking group');
  }
}

/**
 * Add a student group to a ranking group
 */
export async function addStudentGroupToRankingGroup(
  studentGroupId: number, 
  rankingGroupId: number
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminRankingGroupsAPI', 
    action: 'addStudentGroupToRankingGroup', 
    studentGroupId, 
    rankingGroupId 
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

    // Add student group to ranking group
    const { error: addError } = await serviceClient
      .from('ranking_group_pair')
      .insert({
        ranking_group_id: rankingGroupId,
        student_group_id: studentGroupId
      });

    if (addError) {
      logger.error('Error adding student group to ranking group', { 
        studentGroupId, 
        rankingGroupId, 
        addError 
      });
      throw new Error('Failed to add student group to ranking group');
    }

    logger.info('Student group added to ranking group successfully', { 
      studentGroupId, 
      rankingGroupId 
    });

    return true;
  } catch (error) {
    logger.error('Failed to add student group to ranking group', { 
      studentGroupId, 
      rankingGroupId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to add student group to ranking group');
  }
}

/**
 * Remove a student group from a ranking group
 */
export async function removeStudentGroupFromRankingGroup(
  studentGroupId: number, 
  rankingGroupId: number
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminRankingGroupsAPI', 
    action: 'removeStudentGroupFromRankingGroup', 
    studentGroupId, 
    rankingGroupId 
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

    // Remove student group from ranking group
    const { error: removeError } = await serviceClient
      .from('ranking_group_pair')
      .delete()
      .eq('ranking_group_id', rankingGroupId)
      .eq('student_group_id', studentGroupId);

    if (removeError) {
      logger.error('Error removing student group from ranking group', { 
        studentGroupId, 
        rankingGroupId, 
        removeError 
      });
      throw new Error('Failed to remove student group from ranking group');
    }

    logger.info('Student group removed from ranking group successfully', { 
      studentGroupId, 
      rankingGroupId 
    });

    return true;
  } catch (error) {
    logger.error('Failed to remove student group from ranking group', { 
      studentGroupId, 
      rankingGroupId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to remove student group from ranking group');
  }
} 