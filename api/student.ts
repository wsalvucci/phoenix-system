"use server";
import { Student } from "@/types/domain";
import { getPhoenixUser } from "./user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import { UserContextResolver } from "./core/user-context";
import { createServerLogger } from "@/utils/serverLogger";

export async function getOwnStudentData(): Promise<Student | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getOwnStudentData' });
    
    try {
        const phoenixUser = await getPhoenixUser();

        if (phoenixUser === null) {
            logger.warn('No Phoenix user found');
            return null;
        }

        if (phoenixUser.studentId === null) {
            logger.warn('User is not a student', { userId: phoenixUser.id.toString() });
            return null;
        }

        const supabase = await supabaseServiceClient();
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("*")
            .eq("linkedUser", phoenixUser.id)
            .single();

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        const student: Student = {
            id: studentData.id,
            schoolId: studentData.school_id,
            linkCode: studentData.link_code,
            firstName: studentData.first_name,
            lastName: studentData.last_name,
            birthdate: studentData.birthdate,
            grade: studentData.grade,
            gender: studentData.gender,
            linkedUserId: studentData.linkedUser,
        };

        logger.info('Student data retrieved successfully', { 
            studentId: student.id,
            schoolId: student.schoolId,
            studentName: `${student.firstName} ${student.lastName}`
        });

        return student;
    } catch (error) {
        logger.error('Failed to get own student data', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}

/**
 * Gets student data using the robust user context system
 */
export async function getStudentDataWithContext(): Promise<Student | null> {
    const logger = createServerLogger({ component: 'StudentAPI', action: 'getStudentDataWithContext' });
    
    try {
        const authClient = createClient();
        const supabase = await supabaseServiceClient();
        const userContextResolver = new UserContextResolver(authClient, supabase);
        const userContext = await userContextResolver.resolveUserContext();
        
        if (!userContext) {
            logger.warn('No user context found');
            return null;
        }

        if (userContext.role !== 'student' || !userContext.studentId) {
            logger.warn('User is not a student', { 
                userId: userContext.userId,
                role: userContext.role 
            });
            return null;
        }

        // Get student data
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("*")
            .eq("id", userContext.studentId)
            .single();

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        const student: Student = {
            id: studentData.id,
            schoolId: studentData.school_id,
            linkCode: studentData.link_code,
            firstName: studentData.first_name,
            lastName: studentData.last_name,
            birthdate: studentData.birthdate,
            grade: studentData.grade,
            gender: studentData.gender,
            linkedUserId: studentData.linkedUser,
        };

        logger.info('Student data retrieved successfully using context', { 
            studentId: student.id,
            schoolId: student.schoolId,
            studentName: `${student.firstName} ${student.lastName}`
        });

        return student;
    } catch (error) {
        logger.error('Failed to get student data with context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}