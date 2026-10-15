"use server";

import { requireAdminOfRow } from '@/app/supaApi/server/adminScope';
import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { createServerLogger } from '@/utils/serverLogger';

export type AdminTimeframeData = {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  schoolId: number;
};

/**
 * Get all timeframes in a school
 */
export async function getSchoolTimeframes(schoolId: number): Promise<AdminTimeframeData[]> {
  const logger = createServerLogger({ component: 'AdminTimeframesAPI', action: 'getSchoolTimeframes', schoolId });
  
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

    // Get timeframes
    const { data: timeframes, error: timeframesError } = await serviceClient
      .from('school_timeframes')
      .select(`
        id,
        name,
        starts_at,
        ends_at,
        active
      `)
      .eq('school_id', schoolId)
      .order('starts_at', { ascending: false });

    if (timeframesError) {
      logger.error('Error fetching timeframes', { schoolId, timeframesError });
      throw new Error('Failed to load timeframes');
    }

    const timeframesData = timeframes?.map(timeframe => ({
      id: timeframe.id,
      name: timeframe.name,
      startsAt: timeframe.starts_at,
      endsAt: timeframe.ends_at,
      active: timeframe.active,
      schoolId: schoolId
    })) || [];

    logger.info('School timeframes retrieved successfully', { 
      schoolId, 
      timeframeCount: timeframesData.length 
    });

    return timeframesData;
  } catch (error) {
    logger.error('Failed to load school timeframes', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school timeframes');
  }
}

/**
 * Create a new timeframe
 */
export async function createTimeframe(schoolId: number, timeframeData: {
  name: string;
  startsAt: string;
  endsAt: string;
}): Promise<AdminTimeframeData> {
  const logger = createServerLogger({ component: 'AdminTimeframesAPI', action: 'createTimeframe', schoolId });
  
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

    // Create timeframe
    const { data: newTimeframe, error: createError } = await serviceClient
      .from('school_timeframes')
      .insert({
        name: timeframeData.name,
        starts_at: timeframeData.startsAt,
        ends_at: timeframeData.endsAt,
        active: false,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newTimeframe) {
      logger.error('Error creating timeframe', { schoolId, createError });
      throw new Error('Failed to create timeframe');
    }

    const createdTimeframe: AdminTimeframeData = {
      id: newTimeframe.id,
      name: newTimeframe.name,
      startsAt: newTimeframe.starts_at,
      endsAt: newTimeframe.ends_at,
      active: newTimeframe.active,
      schoolId: newTimeframe.school_id
    };

    logger.info('Timeframe created successfully', { 
      timeframeId: newTimeframe.id, 
      schoolId,
      timeframeName: newTimeframe.name
    });

    return createdTimeframe;
  } catch (error) {
    logger.error('Failed to create timeframe', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create timeframe');
  }
}

/**
 * Update a timeframe
 */
export async function updateTimeframe(
  timeframeId: number, 
  timeframeData: {
    name?: string;
    startsAt?: string;
    endsAt?: string;
  }
): Promise<AdminTimeframeData> {
  const logger = createServerLogger({ 
    component: 'AdminTimeframesAPI', 
    action: 'updateTimeframe', 
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

    // Authorize against the school that owns the row(s), not just 'is some admin'
    await requireAdminOfRow('school_timeframes', timeframeId);

    // Update timeframe
    const { data: updatedTimeframe, error: updateError } = await serviceClient
      .from('school_timeframes')
      .update({
        name: timeframeData.name,
        starts_at: timeframeData.startsAt,
        ends_at: timeframeData.endsAt
      })
      .eq('id', timeframeId)
      .select()
      .single();

    if (updateError || !updatedTimeframe) {
      logger.error('Error updating timeframe', { timeframeId, updateError });
      throw new Error('Failed to update timeframe');
    }

    const result: AdminTimeframeData = {
      id: updatedTimeframe.id,
      name: updatedTimeframe.name,
      startsAt: updatedTimeframe.starts_at,
      endsAt: updatedTimeframe.ends_at,
      active: updatedTimeframe.active,
      schoolId: updatedTimeframe.school_id
    };

    logger.info('Timeframe updated successfully', { 
      timeframeId, 
      timeframeName: updatedTimeframe.name
    });

    return result;
  } catch (error) {
    logger.error('Failed to update timeframe', { 
      timeframeId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to update timeframe');
  }
}

/**
 * Delete a timeframe
 */
export async function deleteTimeframe(timeframeId: number): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminTimeframesAPI', 
    action: 'deleteTimeframe', 
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

    // Authorize against the school that owns the row(s), not just 'is some admin'
    await requireAdminOfRow('school_timeframes', timeframeId);

    // Delete timeframe
    const { error: deleteError } = await serviceClient
      .from('school_timeframes')
      .delete()
      .eq('id', timeframeId);

    if (deleteError) {
      logger.error('Error deleting timeframe', { timeframeId, deleteError });
      throw new Error('Failed to delete timeframe');
    }

    logger.info('Timeframe deleted successfully', { timeframeId });

    return true;
  } catch (error) {
    logger.error('Failed to delete timeframe', { 
      timeframeId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to delete timeframe');
  }
}

/**
 * Activate a timeframe (deactivates all others)
 */
export async function activateTimeframe(timeframeId: number): Promise<boolean> {
  const logger = createServerLogger({ 
    component: 'AdminTimeframesAPI', 
    action: 'activateTimeframe', 
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

    // Get the timeframe to get the school ID
    const { data: timeframe, error: timeframeError } = await serviceClient
      .from('school_timeframes')
      .select('school_id')
      .eq('id', timeframeId)
      .single();

    if (timeframeError || !timeframe) {
      logger.error('Error fetching timeframe', { timeframeId, timeframeError });
      throw new Error('Failed to fetch timeframe');
    }

    // Verify admin access to school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === timeframe.school_id);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this school', { 
        adminId: userData.admin_id, 
        schoolId: timeframe.school_id 
      });
      throw new Error('Access denied - admin does not have access to this school');
    }

    // Deactivate all timeframes in the school
    const { error: deactivateError } = await serviceClient
      .from('school_timeframes')
      .update({ active: false })
      .eq('school_id', timeframe.school_id);

    if (deactivateError) {
      logger.error('Error deactivating timeframes', { schoolId: timeframe.school_id, deactivateError });
      throw new Error('Failed to deactivate timeframes');
    }

    // Activate the specified timeframe
    const { error: activateError } = await serviceClient
      .from('school_timeframes')
      .update({ active: true })
      .eq('id', timeframeId);

    if (activateError) {
      logger.error('Error activating timeframe', { timeframeId, activateError });
      throw new Error('Failed to activate timeframe');
    }

    logger.info('Timeframe activated successfully', { timeframeId });

    return true;
  } catch (error) {
    logger.error('Failed to activate timeframe', { 
      timeframeId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to activate timeframe');
  }
} 