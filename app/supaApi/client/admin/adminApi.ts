import { AdminStudentData, AdminTeacherData, AdminGroupData, AdminPointTypeData } from '@/types/domain';

// Base API URL - adjust based on your Next.js API routes
const API_BASE = '/api/admin';

/**
 * Admin Students API
 */
export const adminStudentsApi = {
  // Get all students in a school
  getSchoolStudents: async (schoolId: number): Promise<AdminStudentData[]> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/students`);
    if (!response.ok) {
      throw new Error(`Failed to fetch students: ${response.statusText}`);
    }
    const data = await response.json();
    return data.students;
  },

  // Get a specific student by ID
  getStudentById: async (studentId: number): Promise<AdminStudentData> => {
    const response = await fetch(`${API_BASE}/students/${studentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch student: ${response.statusText}`);
    }
    const data = await response.json();
    return data.student;
  },

  // Create a new student
  createStudent: async (schoolId: number, studentData: {
    firstName: string;
    lastName: string;
    grade: number;
    birthdate?: string;
    gender?: string;
    powerschoolId: number;
    groupIds?: number[];
  }): Promise<AdminStudentData> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create student: ${response.statusText}`);
    }
    const data = await response.json();
    return data.student;
  },

  // Update a student
  updateStudent: async (studentId: number, studentData: {
    firstName?: string;
    lastName?: string;
    grade?: number;
    birthdate?: string;
    gender?: string;
    powerschoolId?: number;
    groupIds?: number[];
  }): Promise<AdminStudentData> => {
    const response = await fetch(`${API_BASE}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    if (!response.ok) {
      throw new Error(`Failed to update student: ${response.statusText}`);
    }
    const data = await response.json();
    return data.student;
  },

  // Delete a student
  deleteStudent: async (studentId: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/students/${studentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete student: ${response.statusText}`);
    }
  },
};

/**
 * Admin Teachers API
 */
export const adminTeachersApi = {
  // Get all teachers in a school
  getSchoolTeachers: async (schoolId: number): Promise<AdminTeacherData[]> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/teachers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch teachers: ${response.statusText}`);
    }
    const data = await response.json();
    return data.teachers;
  },

  // Create a new teacher
  createTeacher: async (schoolId: number, teacherData: {
    firstName: string;
    lastName: string;
    groupIds?: number[];
  }): Promise<AdminTeacherData> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teacherData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create teacher: ${response.statusText}`);
    }
    const data = await response.json();
    return data.teacher;
  },
};

/**
 * Admin Groups API
 */
export const adminGroupsApi = {
  // Get all groups in a school
  getSchoolGroups: async (schoolId: number): Promise<AdminGroupData[]> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/groups`);
    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`);
    }
    const data = await response.json();
    return data.groups;
  },

  // Create a new group
  createGroup: async (schoolId: number, groupData: {
    name: string;
    parentId?: number;
  }): Promise<AdminGroupData> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create group: ${response.statusText}`);
    }
    const data = await response.json();
    return data.group;
  },
};

/**
 * Admin Point Types API
 */
export const adminPointTypesApi = {
  // Get all point types in a school
  getSchoolPointTypes: async (schoolId: number): Promise<AdminPointTypeData[]> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/point-types`);
    if (!response.ok) {
      throw new Error(`Failed to fetch point types: ${response.statusText}`);
    }
    const data = await response.json();
    return data.pointTypes;
  },

  // Create a new point type
  createPointType: async (schoolId: number, pointTypeData: {
    name: string;
    color: string;
    parentId?: number;
    ranked?: boolean;
  }): Promise<AdminPointTypeData> => {
    const response = await fetch(`${API_BASE}/schools/${schoolId}/point-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pointTypeData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create point type: ${response.statusText}`);
    }
    const data = await response.json();
    return data.pointType;
  },
}; 