import { SupabaseClient } from '@supabase/supabase-js';
import { createServerLogger } from '../../utils/serverLogger';

export interface AdminStudentData {
  id: number;
  firstName: string;
  lastName: string;
  grade: number;
  birthdate?: string;
  gender?: string;
  powerschoolId?: number;
  schoolId: number;
  groupIds: number[];
}

export interface AdminTeacherData {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  schoolId: number;
  groupIds: number[];
}

export interface AdminGroupData {
  id: number;
  name: string;
  parentId?: number;
  schoolId: number;
  studentCount: number;
  teacherCount: number;
  teacherIds: number[];
  childGroups?: AdminGroupData[];
}

export interface AdminPointTypeData {
  id: number;
  name: string;
  color: string;
  parentId?: number;
  schoolId: number;
  ranked: boolean;
}

export interface CreateStudentParams {
  schoolId: number;
  firstName: string;
  lastName: string;
  grade: number;
  birthdate?: string;
  gender?: string;
  powerschoolId?: number;
  groupIds?: number[];
}

export interface UpdateStudentParams {
  firstName?: string;
  lastName?: string;
  grade?: number;
  birthdate?: string;
  gender?: string;
  powerschoolId?: number;
  groupIds?: number[];
}

export interface CreateTeacherParams {
  schoolId: number;
  firstName: string;
  lastName: string;
  email?: string;
  groupIds?: number[];
}

export interface UpdateTeacherParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  groupIds?: number[];
}

export interface CreateGroupParams {
  schoolId: number;
  name: string;
  parentId?: number;
  teacherIds?: number[];
}

export interface UpdateGroupParams {
  name?: string;
  parentId?: number;
  teacherIds?: number[];
}

export class AdminQueryBuilder {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Gets all students in a school
   */
  async getSchoolStudents(schoolId: number): Promise<AdminStudentData[]> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'getSchoolStudents',
      schoolId: schoolId.toString()
    });

    try {
      const { data: students, error } = await this.supabase
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
        .eq('school_id', schoolId);

      if (error) {
        logger.error('Error fetching students', { schoolId, error });
        throw error;
      }

      return students?.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        birthdate: student.birthdate,
        gender: student.gender,
        powerschoolId: student.powerschool_id,
        schoolId: student.school_id,
        groupIds: student.student_group_pair?.map(pair => pair.student_group_id) || []
      })) || [];
    } catch (error) {
      logger.error('Failed to get school students', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets a specific student by ID
   */
  async getStudentById(studentId: number): Promise<AdminStudentData | null> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'getStudentById',
      studentId: studentId.toString()
    });

    try {
      const { data: student, error } = await this.supabase
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

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Student not found
        }
        logger.error('Error fetching student', { studentId, error });
        throw error;
      }

      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        birthdate: student.birthdate,
        gender: student.gender,
        powerschoolId: student.powerschool_id,
        schoolId: student.school_id,
        groupIds: student.student_group_pair?.map(pair => pair.student_group_id) || []
      };
    } catch (error) {
      logger.error('Failed to get student', { studentId }, error as Error);
      throw error;
    }
  }

  /**
   * Creates a new student
   */
  async createStudent(params: CreateStudentParams): Promise<AdminStudentData> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'createStudent',
      schoolId: params.schoolId.toString()
    });

    try {
      // Insert the student
      const { data: student, error: studentError } = await this.supabase
        .from('student')
        .insert({
          first_name: params.firstName,
          last_name: params.lastName,
          grade: params.grade,
          birthdate: params.birthdate,
          gender: params.gender,
          powerschool_id: params.powerschoolId,
          school_id: params.schoolId
        })
        .select()
        .single();

      if (studentError) {
        logger.error('Error creating student', { params, studentError });
        throw studentError;
      }

      // Add group associations if provided
      if (params.groupIds && params.groupIds.length > 0) {
        const groupPairs = params.groupIds.map(groupId => ({
          student_id: student.id,
          student_group_id: groupId
        }));

        const { error: groupError } = await this.supabase
          .from('student_group_pair')
          .insert(groupPairs);

        if (groupError) {
          logger.error('Error creating student group pairs', { studentId: student.id, groupError });
          // Don't throw here, the student was created successfully
        }
      }

      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        birthdate: student.birthdate,
        gender: student.gender,
        powerschoolId: student.powerschool_id,
        schoolId: student.school_id,
        groupIds: params.groupIds || []
      };
    } catch (error) {
      logger.error('Failed to create student', { params }, error as Error);
      throw error;
    }
  }

  /**
   * Updates an existing student
   */
  async updateStudent(studentId: number, params: UpdateStudentParams): Promise<AdminStudentData> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'updateStudent',
      studentId: studentId.toString()
    });

    try {
      // Update student data
      const updateData: Record<string, unknown> = {};
      if (params.firstName !== undefined) updateData.first_name = params.firstName;
      if (params.lastName !== undefined) updateData.last_name = params.lastName;
      if (params.grade !== undefined) updateData.grade = params.grade;
      if (params.birthdate !== undefined) updateData.birthdate = params.birthdate;
      if (params.gender !== undefined) updateData.gender = params.gender;
      if (params.powerschoolId !== undefined) updateData.powerschool_id = params.powerschoolId;

      const { data: student, error: studentError } = await this.supabase
        .from('student')
        .update(updateData)
        .eq('id', studentId)
        .select()
        .single();

      if (studentError) {
        logger.error('Error updating student', { studentId, params, studentError });
        throw studentError;
      }

      // Update group associations if provided
      if (params.groupIds !== undefined) {
        // Remove existing associations
        await this.supabase
          .from('student_group_pair')
          .delete()
          .eq('student_id', studentId);

        // Add new associations
        if (params.groupIds.length > 0) {
          const groupPairs = params.groupIds.map(groupId => ({
            student_id: studentId,
            student_group_id: groupId
          }));

          const { error: groupError } = await this.supabase
            .from('student_group_pair')
            .insert(groupPairs);

          if (groupError) {
            logger.error('Error updating student group pairs', { studentId, groupError });
            // Don't throw here, the student was updated successfully
          }
        }
      }

      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        grade: student.grade,
        birthdate: student.birthdate,
        gender: student.gender,
        powerschoolId: student.powerschool_id,
        schoolId: student.school_id,
        groupIds: params.groupIds || []
      };
    } catch (error) {
      logger.error('Failed to update student', { studentId, params }, error as Error);
      throw error;
    }
  }

  /**
   * Deletes a student
   */
  async deleteStudent(studentId: number): Promise<void> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'deleteStudent',
      studentId: studentId.toString()
    });

    try {
      // Delete student group pairs first
      await this.supabase
        .from('student_group_pair')
        .delete()
        .eq('student_id', studentId);

      // Delete the student
      const { error } = await this.supabase
        .from('student')
        .delete()
        .eq('id', studentId);

      if (error) {
        logger.error('Error deleting student', { studentId, error });
        throw error;
      }
    } catch (error) {
      logger.error('Failed to delete student', { studentId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all teachers in a school
   */
  async getSchoolTeachers(schoolId: number): Promise<AdminTeacherData[]> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'getSchoolTeachers',
      schoolId: schoolId.toString()
    });

    try {
      const { data: teachers, error } = await this.supabase
        .from('teacher')
        .select(`
          id,
          first_name,
          last_name,
          email,
          school_id,
          teacher_group_pair (
            student_group_id
          )
        `)
        .eq('school_id', schoolId);

      if (error) {
        logger.error('Error fetching teachers', { schoolId, error });
        throw error;
      }

      return teachers?.map(teacher => ({
        id: teacher.id,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        email: teacher.email,
        schoolId: teacher.school_id,
        groupIds: teacher.teacher_group_pair?.map(pair => pair.student_group_id) || []
      })) || [];
    } catch (error) {
      logger.error('Failed to get school teachers', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Creates a new teacher
   */
  async createTeacher(params: CreateTeacherParams): Promise<AdminTeacherData> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'createTeacher',
      schoolId: params.schoolId.toString()
    });

    try {
      // Insert the teacher
      const { data: teacher, error: teacherError } = await this.supabase
        .from('teacher')
        .insert({
          first_name: params.firstName,
          last_name: params.lastName,
          email: params.email,
          school_id: params.schoolId
        })
        .select()
        .single();

      if (teacherError) {
        logger.error('Error creating teacher', { params, teacherError });
        throw teacherError;
      }

      // Add group associations if provided
      if (params.groupIds && params.groupIds.length > 0) {
        const groupPairs = params.groupIds.map(groupId => ({
          teacher_id: teacher.id,
          student_group_id: groupId
        }));

        const { error: groupError } = await this.supabase
          .from('teacher_group_pair')
          .insert(groupPairs);

        if (groupError) {
          logger.error('Error creating teacher group pairs', { teacherId: teacher.id, groupError });
          // Don't throw here, the teacher was created successfully
        }
      }

      return {
        id: teacher.id,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        email: teacher.email,
        schoolId: teacher.school_id,
        groupIds: params.groupIds || []
      };
    } catch (error) {
      logger.error('Failed to create teacher', { params }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all student groups in a school
   */
  async getSchoolGroups(schoolId: number): Promise<AdminGroupData[]> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'getSchoolGroups',
      schoolId: schoolId.toString()
    });

    try {
      const { data: groups, error } = await this.supabase
        .from('student_group')
        .select(`
          id,
          name,
          parent_id,
          school_id,
          student_group_pair (
            student_id
          ),
          teacher_group_pair (
            teacher_id
          )
        `)
        .eq('school_id', schoolId);

      if (error) {
        logger.error('Error fetching groups', { schoolId, error });
        throw error;
      }

      return groups?.map(group => ({
        id: group.id,
        name: group.name,
        parentId: group.parent_id,
        schoolId: group.school_id,
        studentCount: group.student_group_pair?.length || 0,
        teacherCount: group.teacher_group_pair?.length || 0,
        teacherIds: group.teacher_group_pair?.map(pair => pair.teacher_id) || []
      })) || [];
    } catch (error) {
      logger.error('Failed to get school groups', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Creates a new student group
   */
  async createGroup(params: CreateGroupParams): Promise<AdminGroupData> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'createGroup',
      schoolId: params.schoolId.toString()
    });

    try {
      // Insert the group
      const { data: group, error: groupError } = await this.supabase
        .from('student_group')
        .insert({
          name: params.name,
          parent_id: params.parentId,
          school_id: params.schoolId
        })
        .select()
        .single();

      if (groupError) {
        logger.error('Error creating group', { params, groupError });
        throw groupError;
      }

      // Add teacher associations if provided
      if (params.teacherIds && params.teacherIds.length > 0) {
        const teacherPairs = params.teacherIds.map(teacherId => ({
          teacher_id: teacherId,
          student_group_id: group.id
        }));

        const { error: teacherError } = await this.supabase
          .from('teacher_group_pair')
          .insert(teacherPairs);

        if (teacherError) {
          logger.error('Error creating teacher group pairs', { groupId: group.id, teacherError });
          // Don't throw here, the group was created successfully
        }
      }

      return {
        id: group.id,
        name: group.name,
        parentId: group.parent_id,
        schoolId: group.school_id,
        studentCount: 0,
        teacherCount: params.teacherIds?.length || 0,
        teacherIds: params.teacherIds || []
      };
    } catch (error) {
      logger.error('Failed to create group', { params }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all point types in a school
   */
  async getSchoolPointTypes(schoolId: number): Promise<AdminPointTypeData[]> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'getSchoolPointTypes',
      schoolId: schoolId.toString()
    });

    try {
      const { data: pointTypes, error } = await this.supabase
        .from('point_group')
        .select(`
          id,
          name,
          color,
          parent_id,
          school_id,
          ranked
        `)
        .eq('school_id', schoolId);

      if (error) {
        logger.error('Error fetching point types', { schoolId, error });
        throw error;
      }

      return pointTypes?.map(pointType => ({
        id: pointType.id,
        name: pointType.name,
        color: pointType.color,
        parentId: pointType.parent_id,
        schoolId: pointType.school_id,
        ranked: pointType.ranked
      })) || [];
    } catch (error) {
      logger.error('Failed to get school point types', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Creates a new point type
   */
  async createPointType(
    name: string,
    color: string,
    schoolId: number,
    parentId?: number,
    ranked: boolean = false
  ): Promise<AdminPointTypeData> {
    const logger = createServerLogger({
      component: 'AdminQueryBuilder',
      action: 'createPointType',
      schoolId: schoolId.toString()
    });

    try {
      const { data: pointType, error } = await this.supabase
        .from('point_group')
        .insert({
          name,
          color,
          parent_id: parentId,
          school_id: schoolId,
          ranked
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating point type', { name, schoolId, error });
        throw error;
      }

      return {
        id: pointType.id,
        name: pointType.name,
        color: pointType.color,
        parentId: pointType.parent_id,
        schoolId: pointType.school_id,
        ranked: pointType.ranked
      };
    } catch (error) {
      logger.error('Failed to create point type', { name, schoolId }, error as Error);
      throw error;
    }
  }
} 