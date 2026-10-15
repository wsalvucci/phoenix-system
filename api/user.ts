"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { PhoenixUser } from "@/types/domain";

import { User } from "@supabase/supabase-js";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";

export async function getSupabaseUser(): Promise<User | null> {
    const logger = createServerLogger({ component: 'UserAPI', action: 'getSupabaseUser' });
    
    try {
        // Use cookie-based client for authentication
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError !== null) {
            logger.error("Error fetching supabase user:", { userError });
            return null;
        }

        logger.debug('Supabase user retrieved successfully', { 
            hasUser: !!userData.user,
            userId: userData.user?.id 
        });

        return userData.user;
    } catch (error) {
        logger.error('Failed to get Supabase user', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

export async function getPhoenixUser(): Promise<PhoenixUser | null> {
    const logger = createServerLogger({ component: 'UserAPI', action: 'getPhoenixUser' });
    
    try {
        const supabaseUser = await getSupabaseUser();

        if (supabaseUser === null) {
            logger.warn('No Supabase user found');
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: phoenixUserData, error: phoenixUserDataError } = await supabase
            .from('user')
            .select('*')
            .eq('supabase_id', supabaseUser.id)
            .single();

        if (phoenixUserDataError !== null) {
            logger.error("Error fetching phoenix user:", { phoenixUserDataError });
            return null;
        }

        const phoenixUser: PhoenixUser = {
            id: phoenixUserData.id,
            adminId: phoenixUserData.admin_id,
            teacherId: phoenixUserData.teacher_id,
            studentId: phoenixUserData.student_id,
        };

        logger.info('Phoenix user retrieved successfully', { 
            userId: phoenixUser.id.toString(),
            hasAdminId: !!phoenixUser.adminId,
            hasTeacherId: !!phoenixUser.teacherId,
            hasStudentId: !!phoenixUser.studentId
        });

        return phoenixUser;
    } catch (error) {
        logger.error('Failed to get Phoenix user', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets the complete user context using the robust system
 */
export async function getUserContext() {
    const logger = createServerLogger({ component: 'UserAPI', action: 'getUserContext' });
    
    try {
        // Use cookie-based client for auth, service client for database
        const authClient = createClient();
        const dbClient = await supabaseServiceClient();
        const userContextResolver = new UserContextResolver(authClient, dbClient);
        const userContext = await userContextResolver.resolveUserContext();
        
        if (!userContext) {
            logger.warn('No user context found');
            return null;
        }

        logger.info('User context resolved successfully', {
            userId: userContext.userId,
            role: userContext.role,
            schoolId: userContext.schoolId
        });

        return userContext;
    } catch (error) {
        logger.error('Failed to get user context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Validates that a user has access to a specific school
 */
export async function validateSchoolAccess(schoolId: number): Promise<boolean> {
    const logger = createServerLogger({ 
        component: 'UserAPI', 
        action: 'validateSchoolAccess',
        schoolId: schoolId.toString()
    });
    
    try {
        // Use cookie-based client for auth, service client for database
        const authClient = createClient();
        const dbClient = await supabaseServiceClient();
        const userContextResolver = new UserContextResolver(authClient, dbClient);
        const hasAccess = await userContextResolver.validateSchoolAccess(schoolId);
        
        logger.info('School access validation completed', { 
            schoolId, 
            hasAccess 
        });

        return hasAccess;
    } catch (error) {
        logger.error('Failed to validate school access', { 
            schoolId,
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return false;
    }
}

export type MyRoles = { admin: boolean; teacher: boolean; student: boolean; parent: boolean };

/**
 * Which roles the signed-in caller holds, from their own records only. Lets the home page call just the
 * loaders that apply instead of calling every loader and swallowing the 500s from the ones that do not.
 */
export async function getMyRoles(): Promise<MyRoles> {
    const none: MyRoles = { admin: false, teacher: false, student: false, parent: false };
    const supabaseUser = await getSupabaseUser();
    if (supabaseUser === null) return none;

    const supabase = await supabaseServiceClient();
    const { data: me } = await supabase
        .from('user')
        .select('id, admin_id')
        .eq('supabase_id', supabaseUser.id)
        .maybeSingle();
    if (!me) return none;

    const [teacher, student, parent] = await Promise.all([
        supabase.from('teacher').select('id', { count: 'exact', head: true }).eq('linked_user', me.id),
        supabase.from('student').select('id', { count: 'exact', head: true }).eq('linkedUser', me.id),
        supabase.from('user_student_pair').select('student_id', { count: 'exact', head: true }).eq('user_id', me.id),
    ]);
    return {
        admin: me.admin_id !== null,
        teacher: (teacher.count ?? 0) > 0,
        student: (student.count ?? 0) > 0,
        parent: (parent.count ?? 0) > 0,
    };
}