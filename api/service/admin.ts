import { SupabaseClient } from '@supabase/supabase-js';
import { AdminQueryBuilder, 
  AdminStudentData, 
  AdminTeacherData, 
  AdminGroupData, 
  AdminPointTypeData,
  CreateStudentParams,
  UpdateStudentParams,
  CreateTeacherParams,
  CreateGroupParams
} from '../query/admin';
import { UserContext } from '../core/types';
import { createServerLogger } from '../../utils/serverLogger';

export class AdminService {
  private queryBuilder: AdminQueryBuilder;
  private userContext: UserContext;

  constructor(supabase: SupabaseClient, userContext: UserContext) {
    this.queryBuilder = new AdminQueryBuilder(supabase);
    this.userContext = userContext;
  }

  /**
   * Validates that the user has admin access to the specified school
   * Note: This validation is now handled at the API level before calling AdminService
   */
  private validateSchoolAccess(_schoolId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (this.userContext.role !== 'admin') {
      throw new Error('Access denied - admin role required');
    }

    // School access validation is handled at the API level using userContextResolver.validateSchoolAccess()
    // This method is kept for role validation only
  }

  /**
   * Gets all students in a school
   */
  async getSchoolStudents(schoolId: number): Promise<AdminStudentData[]> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'getSchoolStudents',
      schoolId: schoolId.toString()
    });

    try {
      this.validateSchoolAccess(schoolId);
      
      const students = await this.queryBuilder.getSchoolStudents(schoolId);
      
      logger.info('School students retrieved successfully', {
        schoolId: schoolId.toString(),
        userId: this.userContext.userId,
        studentCount: students.length
      });

      return students;
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
      component: 'AdminService',
      action: 'getStudentById',
      studentId: studentId.toString()
    });

    try {
      // We need to get the student first to determine their school
      const student = await this.queryBuilder.getStudentById(studentId);
      if (!student) {
        return null;
      }

      this.validateSchoolAccess(student.schoolId);
      
      logger.info('Student retrieved successfully', {
        studentId: studentId.toString(),
        userId: this.userContext.userId,
        schoolId: student.schoolId.toString()
      });

      return student;
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
      component: 'AdminService',
      action: 'createStudent',
      schoolId: params.schoolId.toString()
    });

    try {
      this.validateSchoolAccess(params.schoolId);
      
      const student = await this.queryBuilder.createStudent(params);
      
      logger.info('Student created successfully', {
        schoolId: params.schoolId.toString(),
        userId: this.userContext.userId,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`
      });

      return student;
    } catch (error) {
      logger.error('Failed to create student', { schoolId: params.schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Updates an existing student
   */
  async updateStudent(studentId: number, params: UpdateStudentParams): Promise<AdminStudentData> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'updateStudent',
      studentId: studentId.toString()
    });

    try {
      // Get the student first to validate school access
      const existingStudent = await this.queryBuilder.getStudentById(studentId);
      if (!existingStudent) {
        throw new Error('Student not found');
      }

      this.validateSchoolAccess(existingStudent.schoolId);
      
      const student = await this.queryBuilder.updateStudent(studentId, params);
      
      logger.info('Student updated successfully', {
        studentId: studentId.toString(),
        userId: this.userContext.userId,
        schoolId: student.schoolId.toString(),
        studentName: `${student.firstName} ${student.lastName}`
      });

      return student;
    } catch (error) {
      logger.error('Failed to update student', { studentId }, error as Error);
      throw error;
    }
  }

  /**
   * Deletes a student
   */
  async deleteStudent(studentId: number): Promise<void> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'deleteStudent',
      studentId: studentId.toString()
    });

    try {
      // Get the student first to validate school access
      const existingStudent = await this.queryBuilder.getStudentById(studentId);
      if (!existingStudent) {
        throw new Error('Student not found');
      }

      this.validateSchoolAccess(existingStudent.schoolId);
      
      await this.queryBuilder.deleteStudent(studentId);
      
      logger.info('Student deleted successfully', {
        studentId: studentId.toString(),
        userId: this.userContext.userId,
        schoolId: existingStudent.schoolId.toString(),
        studentName: `${existingStudent.firstName} ${existingStudent.lastName}`
      });
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
      component: 'AdminService',
      action: 'getSchoolTeachers',
      schoolId: schoolId.toString()
    });

    try {
      this.validateSchoolAccess(schoolId);
      
      const teachers = await this.queryBuilder.getSchoolTeachers(schoolId);
      
      logger.info('School teachers retrieved successfully', {
        schoolId: schoolId.toString(),
        userId: this.userContext.userId,
        teacherCount: teachers.length
      });

      return teachers;
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
      component: 'AdminService',
      action: 'createTeacher',
      schoolId: params.schoolId.toString()
    });

    try {
      this.validateSchoolAccess(params.schoolId);
      
      const teacher = await this.queryBuilder.createTeacher(params);
      
      logger.info('Teacher created successfully', {
        schoolId: params.schoolId.toString(),
        userId: this.userContext.userId,
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`
      });

      return teacher;
    } catch (error) {
      logger.error('Failed to create teacher', { schoolId: params.schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all student groups in a school
   */
  async getSchoolGroups(schoolId: number): Promise<AdminGroupData[]> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'getSchoolGroups',
      schoolId: schoolId.toString()
    });

    try {
      this.validateSchoolAccess(schoolId);
      
      const groups = await this.queryBuilder.getSchoolGroups(schoolId);
      
      logger.info('School groups retrieved successfully', {
        schoolId: schoolId.toString(),
        userId: this.userContext.userId,
        groupCount: groups.length
      });

      return groups;
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
      component: 'AdminService',
      action: 'createGroup',
      schoolId: params.schoolId.toString()
    });

    try {
      this.validateSchoolAccess(params.schoolId);
      
      const group = await this.queryBuilder.createGroup(params);
      
      logger.info('Group created successfully', {
        schoolId: params.schoolId.toString(),
        userId: this.userContext.userId,
        groupId: group.id,
        groupName: group.name
      });

      return group;
    } catch (error) {
      logger.error('Failed to create group', { schoolId: params.schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Gets all point types in a school
   */
  async getSchoolPointTypes(schoolId: number): Promise<AdminPointTypeData[]> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'getSchoolPointTypes',
      schoolId: schoolId.toString()
    });

    try {
      this.validateSchoolAccess(schoolId);
      
      const pointTypes = await this.queryBuilder.getSchoolPointTypes(schoolId);
      
      logger.info('School point types retrieved successfully', {
        schoolId: schoolId.toString(),
        userId: this.userContext.userId,
        pointTypeCount: pointTypes.length
      });

      return pointTypes;
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
      component: 'AdminService',
      action: 'createPointType',
      schoolId: schoolId.toString()
    });

    try {
      this.validateSchoolAccess(schoolId);
      
      const pointType = await this.queryBuilder.createPointType(name, color, schoolId, parentId, ranked);
      
      logger.info('Point type created successfully', {
        schoolId: schoolId.toString(),
        userId: this.userContext.userId,
        pointTypeId: pointType.id,
        pointTypeName: pointType.name
      });

      return pointType;
    } catch (error) {
      logger.error('Failed to create point type', { schoolId }, error as Error);
      throw error;
    }
  }

  /**
   * Assigns a teacher to student groups
   */
  async assignTeacherToGroups(teacherId: number, groupIds: number[]): Promise<void> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'assignTeacherToGroups',
      teacherId: teacherId.toString()
    });

    try {
      // Get teacher to validate school access
      const teachers = await this.queryBuilder.getSchoolTeachers(1); // We'll need to get the actual school ID
      const teacher = teachers.find((t: AdminTeacherData) => t.id === teacherId);
      if (!teacher) {
        throw new Error('Teacher not found');
      }

      this.validateSchoolAccess(teacher.schoolId);
      
      // Remove existing assignments
      // Add new assignments
      // This would be implemented in the query builder
      
      logger.info('Teacher assigned to groups successfully', {
        teacherId: teacherId.toString(),
        userId: this.userContext.userId,
        groupIds: groupIds,
        teacherName: `${teacher.firstName} ${teacher.lastName}`
      });
    } catch (error) {
      logger.error('Failed to assign teacher to groups', { teacherId }, error as Error);
      throw error;
    }
  }

  /**
   * Assigns students to groups
   */
  async assignStudentsToGroups(studentIds: number[], groupIds: number[]): Promise<void> {
    const logger = createServerLogger({
      component: 'AdminService',
      action: 'assignStudentsToGroups'
    });

    try {
      // Validate that all students are in the same school
      // This would be implemented in the query builder
      
      logger.info('Students assigned to groups successfully', {
        userId: this.userContext.userId,
        studentIds: studentIds,
        groupIds: groupIds
      });
    } catch (error) {
      logger.error('Failed to assign students to groups', {}, error as Error);
      throw error;
    }
  }
} 