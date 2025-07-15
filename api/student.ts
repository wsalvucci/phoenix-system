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
        
        // Get the authenticated user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
            logger.warn('No authenticated user found');
            return null;
        }

        // Get user data to check for student relationship
        const { data: userData, error: userError } = await supabase
            .from('user')
            .select('id, student_id')
            .eq('supabase_id', supabaseUser.id)
            .single();

        if (userError || !userData) {
            logger.warn('User data not found');
            return null;
        }

        // Get all students whose linkedUser field matches the current user's ID
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("*")
            .eq("linkedUser", userData.id);  // Find all students linked to this user

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        if (!studentData || studentData.length === 0) {
            logger.warn('No students found linked to current user', { 
                userId: userData.id.toString() 
            });
            return null;
        }

        // Use the first student if multiple are found
        const studentRecord = studentData[0];

        const student: Student = {
            id: studentRecord.id,
            schoolId: studentRecord.school_id,
            linkCode: studentRecord.link_code,
            firstName: studentRecord.first_name,
            lastName: studentRecord.last_name,
            birthdate: studentRecord.birthdate,
            grade: studentRecord.grade,
            gender: studentRecord.gender,
            linkedUserId: studentRecord.linkedUser,
        };

        logger.info('Student data retrieved successfully', { 
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