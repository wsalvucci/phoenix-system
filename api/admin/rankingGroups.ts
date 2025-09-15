"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { createServerLogger } from '@/utils/serverLogger';

export type AdminRankingGroupData = {
  id: number;
  name: string;
  schoolId: number;
  timeframeId: number | null;
  timeframe: {
    id: number;
    name: string;
    startsAt: string;
    endsAt: string;
  } | null;
  studentGroupIds: number[];
  studentGroups: {
    id: number;
    name: string;
    archived: boolean;
  }[];
  teacherIds: number[];
  teachers: {
    id: number;
    firstName: string;
    lastName: string;
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

    // Get ranking groups with their student group, teacher, and timeframe associations
    const { data: rankingGroups, error: rankingGroupsError } = await serviceClient
      .from('ranking_group')
      .select(`
        id,
        name,
        school_id,
        timeframe_id,
        school_timeframes (
          id,
          name,
          starts_at,
          ends_at
        ),
        ranking_group_pair (
          student_group_id,
          student_group (
            id,
            name,
            archived
          )
        ),
        teacher_ranking_group_pair (
          teacher_id,
          teacher (
            id,
            first_name,
            last_name
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
      timeframeId: group.timeframe_id,
      timeframe: group.school_timeframes ? {
        id: group.school_timeframes.id,
        name: group.school_timeframes.name,
        startsAt: group.school_timeframes.starts_at,
        endsAt: group.school_timeframes.ends_at
      } : null,
      studentGroupIds: group.ranking_group_pair?.map(pair => pair.student_group_id) || [],
      studentGroups: group.ranking_group_pair
        ?.map(pair => ({
          id: pair.student_group?.id,
          name: pair.student_group?.name,
          archived: pair.student_group?.archived
        }))
        .filter((sg): sg is { id: number; name: string; archived: boolean } => 
          sg.id !== undefined && sg.name !== undefined && sg.archived !== undefined
        ) || [],
      teacherIds: group.teacher_ranking_group_pair?.map(pair => pair.teacher_id) || [],
      teachers: group.teacher_ranking_group_pair
        ?.map(pair => ({
          id: pair.teacher?.id,
          firstName: pair.teacher?.first_name,
          lastName: pair.teacher?.last_name
        }))
        .filter((t): t is { id: number; firstName: string; lastName: string } => 
          t.id !== undefined && t.firstName !== undefined && t.lastName !== undefined
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
  timeframeId?: number | null;
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

    // If timeframeId is provided, verify it exists and belongs to the same school
    if (groupData.timeframeId !== null && groupData.timeframeId !== undefined) {
      const { data: timeframe, error: timeframeError } = await serviceClient
        .from('school_timeframes')
        .select('id, school_id')
        .eq('id', groupData.timeframeId)
        .eq('school_id', schoolId)
        .single();

      if (timeframeError || !timeframe) {
        logger.error('Timeframe not found or does not belong to school', { 
          timeframeId: groupData.timeframeId, 
          schoolId, 
          timeframeError 
        });
        throw new Error('Timeframe not found or does not belong to this school');
      }
    }

    // Create ranking group
    const { data: newRankingGroup, error: createError } = await serviceClient
      .from('ranking_group')
      .insert({
        name: groupData.name,
        school_id: schoolId,
        timeframe_id: groupData.timeframeId || null
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
      timeframeId: newRankingGroup.timeframe_id,
      timeframe: null, // Will be populated by the caller if needed
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

/**
 * Add a teacher to a ranking group
 */
export async function addTeacherToRankingGroup(
  teacherId: number, 
  rankingGroupId: number
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminRankingGroupsAPI', 
    action: 'addTeacherToRankingGroup', 
    teacherId, 
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

    // Add teacher to ranking group
    const { error: addError } = await serviceClient
      .from('teacher_ranking_group_pair')
      .insert({
        teacher_id: teacherId,
        ranking_group_id: rankingGroupId
      });

    if (addError) {
      logger.error('Error adding teacher to ranking group', { 
        teacherId, 
        rankingGroupId, 
        addError 
      });
      throw new Error('Failed to add teacher to ranking group');
    }

    logger.info('Teacher added to ranking group successfully', { 
      teacherId, 
      rankingGroupId 
    });

    return true;
  } catch (error) {
    logger.error('Failed to add teacher to ranking group', { 
      teacherId, 
      rankingGroupId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to add teacher to ranking group');
  }
}

/**
 * Remove a teacher from a ranking group
 */
export async function removeTeacherFromRankingGroup(
  teacherId: number, 
  rankingGroupId: number
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminRankingGroupsAPI', 
    action: 'removeTeacherFromRankingGroup', 
    teacherId, 
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

    // Remove teacher from ranking group
    const { error: removeError } = await serviceClient
      .from('teacher_ranking_group_pair')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('ranking_group_id', rankingGroupId);

    if (removeError) {
      logger.error('Error removing teacher from ranking group', { 
        teacherId, 
        rankingGroupId, 
        removeError 
      });
      throw new Error('Failed to remove teacher from ranking group');
    }

    logger.info('Teacher removed from ranking group successfully', { 
      teacherId, 
      rankingGroupId 
    });

    return true;
  } catch (error) {
    logger.error('Failed to remove teacher from ranking group', { 
      teacherId, 
      rankingGroupId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to remove teacher from ranking group');
  }
}

/**
 * Update the timeframe for a ranking group
 */
export async function updateRankingGroupTimeframe(
  rankingGroupId: number, 
  timeframeId: number | null
): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminRankingGroupsAPI', 
    action: 'updateRankingGroupTimeframe', 
    rankingGroupId,
    timeframeId 
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

    // Get the ranking group to verify admin access
    const { data: rankingGroup, error: rankingGroupError } = await serviceClient
      .from('ranking_group')
      .select('school_id')
      .eq('id', rankingGroupId)
      .single();

    if (rankingGroupError || !rankingGroup) {
      logger.error('Ranking group not found', { rankingGroupId, rankingGroupError });
      throw new Error('Ranking group not found');
    }

    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === rankingGroup.school_id);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId: rankingGroup.school_id 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // If timeframeId is provided, verify it exists and belongs to the same school
    if (timeframeId !== null) {
      const { data: timeframe, error: timeframeError } = await serviceClient
        .from('school_timeframes')
        .select('id, school_id')
        .eq('id', timeframeId)
        .eq('school_id', rankingGroup.school_id)
        .single();

      if (timeframeError || !timeframe) {
        logger.error('Timeframe not found or does not belong to school', { 
          timeframeId, 
          schoolId: rankingGroup.school_id, 
          timeframeError 
        });
        throw new Error('Timeframe not found or does not belong to this school');
      }
    }

    // Update the ranking group timeframe
    const { error: updateError } = await serviceClient
      .from('ranking_group')
      .update({ timeframe_id: timeframeId })
      .eq('id', rankingGroupId);

    if (updateError) {
      logger.error('Error updating ranking group timeframe', { 
        rankingGroupId, 
        timeframeId, 
        updateError 
      });
      throw new Error('Failed to update ranking group timeframe');
    }

    logger.info('Ranking group timeframe updated successfully', { 
      rankingGroupId, 
      timeframeId 
    });

    return true;
  } catch (error) {
    logger.error('Failed to update ranking group timeframe', { 
      rankingGroupId, 
      timeframeId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to update ranking group timeframe');
  }
}
