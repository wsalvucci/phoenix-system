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

        // Check if user has a student relationship (either direct or through user_student_pair)
        let studentId: number | null = null;

        // First check direct student relationship
        if (userData.student_id) {
            studentId = userData.student_id;
        } else {
            // Check user_student_pair relationship
            const { data: studentPairs } = await supabase
                .from('user_student_pair')
                .select('student_id')
                .eq('user_id', userData.id)
                .limit(1);

            if (studentPairs && studentPairs.length > 0) {
                studentId = studentPairs[0].student_id;
            }
        }

        if (!studentId) {
            logger.warn('User has no student relationship');
            return null;
        }

        // Get student data (we already verified the relationship exists through user_student_pair or user.student_id)
        const { data: studentData, error: studentError } = await supabase
            .from("student")
            .select("*")
            .eq("id", studentId)
            .single();

        if (studentError !== null) {
            logger.error("Error fetching student data:", { studentError });
            return null;
        }

        if (!studentData) {
            logger.warn('Student not found', { studentId });
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
        logger.error('Failed to get student data with context', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, error instanceof Error ? error : undefined);
        return null;
    }
}