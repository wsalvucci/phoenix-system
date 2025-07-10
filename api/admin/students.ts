"use server";

import supabaseServiceClient from '@/app/supaApi/server/supabaseServiceClient';
import { createClient } from '@/utils/supabase/server';
import { AdminStudentData } from '@/types/domain';
import { createServerLogger } from '@/utils/serverLogger';

/**
 * Get all students in a school
 */
export async function getSchoolStudents(schoolId: number): Promise<AdminStudentData[]> {
  const logger = createServerLogger({ component: 'AdminStudentsAPI', action: 'getSchoolStudents', schoolId });
  
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

    // Get students with their group associations
    const { data: students, error: studentsError } = await serviceClient
      .from('student')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        birthdate,
        gender,
        powerschool_id,
        student_group_pair (
          student_group_id
        )
      `)
      .eq('school_id', schoolId);

    if (studentsError) {
      logger.error('Error fetching students', { schoolId, studentsError });
      throw new Error('Failed to load students');
    }

    const studentsWithGroups = students?.map(student => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      grade: student.grade,
      birthdate: student.birthdate,
      gender: student.gender,
      powerschoolId: student.powerschool_id,
      groupIds: student.student_group_pair?.map(pair => pair.student_group_id) || []
    })) || [];

    logger.info('School students retrieved successfully', { 
      schoolId, 
      studentCount: studentsWithGroups.length 
    });

    return studentsWithGroups;
  } catch (error) {
    logger.error('Failed to load school students', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load school students');
  }
}

/**
 * Get a specific student by ID
 */
export async function getStudentById(studentId: number): Promise<AdminStudentData> {
  const logger = createServerLogger({ component: 'AdminStudentsAPI', action: 'getStudentById', studentId });
  
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

    // Get student with school info
    const { data: student, error: studentError } = await serviceClient
      .from('student')
      .select(`
        id,
        first_name,
        last_name,
        grade,
        birthdate,
        gender,
        powerschool_id,
        school_id,
        student_group_pair (
          student_group_id
        )
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      logger.error('Student not found', { studentId, studentError });
      throw new Error('Student not found');
    }

    // Verify admin has access to this student's school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === student.school_id);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this student', { 
        adminId: userData.admin_id, 
        studentId,
        studentSchoolId: student.school_id
      });
      throw new Error('Access denied - admin does not have access to this student');
    }

    const studentData: AdminStudentData = {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      grade: student.grade,
      birthdate: student.birthdate,
      gender: student.gender,
      powerschoolId: student.powerschool_id,
      groupIds: student.student_group_pair?.map(pair => pair.student_group_id) || []
    };

    logger.info('Student retrieved successfully', { studentId });
    return studentData;
  } catch (error) {
    logger.error('Failed to load student', { 
      studentId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to load student');
  }
}

/**
 * Create a new student
 */
export async function createStudent(schoolId: number, studentData: {
  firstName: string;
  lastName: string;
  grade: number;
  birthdate?: string;
  gender?: string;
  powerschoolId: number;
  groupIds?: number[];
}): Promise<AdminStudentData> {
  const logger = createServerLogger({ component: 'AdminStudentsAPI', action: 'createStudent', schoolId });
  
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

    // Create student
    const { data: newStudent, error: createError } = await serviceClient
      .from('student')
      .insert({
        first_name: studentData.firstName,
        last_name: studentData.lastName,
        grade: studentData.grade,
        birthdate: studentData.birthdate,
        gender: studentData.gender,
        powerschool_id: studentData.powerschoolId,
        school_id: schoolId
      })
      .select()
      .single();

    if (createError || !newStudent) {
      logger.error('Error creating student', { schoolId, createError });
      throw new Error('Failed to create student');
    }

    // Add student to groups if specified
    if (studentData.groupIds && studentData.groupIds.length > 0) {
      const groupPairs = studentData.groupIds.map(groupId => ({
        student_id: newStudent.id,
        student_group_id: groupId
      }));

      const { error: groupError } = await serviceClient
        .from('student_group_pair')
        .insert(groupPairs);

      if (groupError) {
        logger.error('Error adding student to groups', { studentId: newStudent.id, groupError });
        // Don't throw here - student was created successfully
      }
    }

    const createdStudent: AdminStudentData = {
      id: newStudent.id,
      firstName: newStudent.first_name,
      lastName: newStudent.last_name,
      grade: newStudent.grade,
      birthdate: newStudent.birthdate,
      gender: newStudent.gender,
      powerschoolId: newStudent.powerschool_id,
      groupIds: studentData.groupIds || []
    };

    logger.info('Student created successfully', { 
      studentId: newStudent.id, 
      schoolId,
      groupCount: studentData.groupIds?.length || 0
    });

    return createdStudent;
  } catch (error) {
    logger.error('Failed to create student', { 
      schoolId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to create student');
  }
}

/**
 * Update a student
 */
export async function updateStudent(studentId: number, studentData: {
  firstName?: string;
  lastName?: string;
  grade?: number;
  birthdate?: string;
  gender?: string;
  powerschoolId?: number;
  groupIds?: number[];
}): Promise<AdminStudentData> {
  const logger = createServerLogger({ component: 'AdminStudentsAPI', action: 'updateStudent', studentId });
  
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

    // Get current student to verify access
    const { data: currentStudent, error: currentError } = await serviceClient
      .from('student')
      .select('school_id')
      .eq('id', studentId)
      .single();

    if (currentError || !currentStudent) {
      logger.error('Student not found', { studentId, currentError });
      throw new Error('Student not found');
    }

    // Verify admin has access to this student's school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === currentStudent.school_id);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this student', { 
        adminId: userData.admin_id, 
        studentId,
        studentSchoolId: currentStudent.school_id
      });
      throw new Error('Access denied - admin does not have access to this student');
    }

    // Prepare update data
    const updateData: any = {};
    if (studentData.firstName !== undefined) updateData.first_name = studentData.firstName;
    if (studentData.lastName !== undefined) updateData.last_name = studentData.lastName;
    if (studentData.grade !== undefined) updateData.grade = studentData.grade;
    if (studentData.birthdate !== undefined) updateData.birthdate = studentData.birthdate;
    if (studentData.gender !== undefined) updateData.gender = studentData.gender;
    if (studentData.powerschoolId !== undefined) updateData.powerschool_id = studentData.powerschoolId;

    // Update student
    const { data: updatedStudent, error: updateError } = await serviceClient
      .from('student')
      .update(updateData)
      .eq('id', studentId)
      .select(`
        id,
        first_name,
        last_name,
        grade,
        birthdate,
        gender,
        powerschool_id,
        student_group_pair (
          student_group_id
        )
      `)
      .single();

    if (updateError || !updatedStudent) {
      logger.error('Error updating student', { studentId, updateError });
      throw new Error('Failed to update student');
    }

    // Update group associations if specified
    if (studentData.groupIds !== undefined) {
      // Remove existing group associations
      await serviceClient
        .from('student_group_pair')
        .delete()
        .eq('student_id', studentId);

      // Add new group associations
      if (studentData.groupIds.length > 0) {
        const groupPairs = studentData.groupIds.map(groupId => ({
          student_id: studentId,
          student_group_id: groupId
        }));

        const { error: groupError } = await serviceClient
          .from('student_group_pair')
          .insert(groupPairs);

        if (groupError) {
          logger.error('Error updating student groups', { studentId, groupError });
          // Don't throw here - student was updated successfully
        }
      }
    }

    const result: AdminStudentData = {
      id: updatedStudent.id,
      firstName: updatedStudent.first_name,
      lastName: updatedStudent.last_name,
      grade: updatedStudent.grade,
      birthdate: updatedStudent.birthdate,
      gender: updatedStudent.gender,
      powerschoolId: updatedStudent.powerschool_id,
      groupIds: studentData.groupIds !== undefined 
        ? studentData.groupIds 
        : updatedStudent.student_group_pair?.map(pair => pair.student_group_id) || []
    };

    logger.info('Student updated successfully', { 
      studentId,
      groupCount: result.groupIds?.length || 0
    });

    return result;
  } catch (error) {
    logger.error('Failed to update student', { 
      studentId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to update student');
  }
}

/**
 * Delete a student
 */
export async function deleteStudent(studentId: number): Promise<void> {
  const logger = createServerLogger({ component: 'AdminStudentsAPI', action: 'deleteStudent', studentId });
  
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

    // Get current student to verify access
    const { data: currentStudent, error: currentError } = await serviceClient
      .from('student')
      .select('school_id')
      .eq('id', studentId)
      .single();

    if (currentError || !currentStudent) {
      logger.error('Student not found', { studentId, currentError });
      throw new Error('Student not found');
    }

    // Verify admin has access to this student's school
    const adminSchools = userData.admin?.admin_school_pair || [];
    const hasAccess = adminSchools.some(pair => pair.school_id === currentStudent.school_id);
    
    if (!hasAccess) {
      logger.error('Access denied - admin does not have access to this student', { 
        adminId: userData.admin_id, 
        studentId,
        studentSchoolId: currentStudent.school_id
      });
      throw new Error('Access denied - admin does not have access to this student');
    }

    // Delete student (this will cascade to related records)
    const { error: deleteError } = await serviceClient
      .from('student')
      .delete()
      .eq('id', studentId);

    if (deleteError) {
      logger.error('Error deleting student', { studentId, deleteError });
      throw new Error('Failed to delete student');
    }

    logger.info('Student deleted successfully', { studentId });
  } catch (error) {
    logger.error('Failed to delete student', { 
      studentId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, error instanceof Error ? error : undefined);
    throw new Error('Failed to delete student');
  }
} 