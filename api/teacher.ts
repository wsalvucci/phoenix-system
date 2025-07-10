"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { Teacher } from "@/types/domain";
import { getPhoenixUser } from "./user";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";

export async function getOwnTeacherData(): Promise<Teacher | null> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getOwnTeacherData' });
    
    try {
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return null;
        }

        if (phoenixUser.teacherId === null) {
            logger.warn('User is not a teacher', { userId: phoenixUser.id.toString() });
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: teacherData, error: teacherDataError } = await supabase
            .from('teacher')
            .select('*')
            .eq('id', phoenixUser.teacherId)
            .single();

        if (teacherDataError !== null) {
            logger.error("Error fetching teacher data:", { teacherDataError });
            return null;
        }

        const teacher: Teacher = {
            id: teacherData.id,
            schoolId: teacherData.school_id,
            linkCode: teacherData.link_code,
            firstName: teacherData.first_name,
            lastName: teacherData.last_name,
            linkedUserId: teacherData.linked_user,
        };

        logger.info('Teacher data retrieved successfully', { 
            teacherId: teacher.id,
            schoolId: teacher.schoolId,
            teacherName: `${teacher.firstName} ${teacher.lastName}`
        });

        return teacher;
    } catch (error) {
        logger.error('Failed to get own teacher data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets teacher data using the robust user context system
 */
export async function getTeacherDataWithContext(): Promise<Teacher | null> {
    const logger = createServerLogger({ component: 'TeacherAPI', action: 'getTeacherDataWithContext' });
    
    try {
        const authClient = createClient();
        const supabase = await supabaseServiceClient();
        const userContextResolver = new UserContextResolver(authClient, supabase);
        const userContext = await userContextResolver.resolveUserContext();
        
        if (!userContext) {
            logger.warn('No user context found');
            return null;
        }

        if (userContext.role !== 'teacher' || !userContext.teacherId) {
            logger.warn('User is not a teacher', { 
                userId: userContext.userId,
                role: userContext.role 
            });
            return null;
        }

        // Get teacher data
        const { data: teacherData, error: teacherDataError } = await supabase
            .from('teacher')
            .select('*')
            .eq('id', userContext.teacherId)
            .single();

        if (teacherDataError !== null) {
            logger.error("Error fetching teacher data:", { teacherDataError });
            return null;
        }

        const teacher: Teacher = {
            id: teacherData.id,
            schoolId: teacherData.school_id,
            linkCode: teacherData.link_code,
            firstName: teacherData.first_name,
            lastName: teacherData.last_name,
            linkedUserId: teacherData.linked_user,
        };

        logger.info('Teacher data retrieved successfully using context', { 
            teacherId: teacher.id,
            schoolId: teacher.schoolId,
            teacherName: `${teacher.firstName} ${teacher.lastName}`
        });

        return teacher;
    } catch (error) {
        logger.error('Failed to get teacher data with context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}