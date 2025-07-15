import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSchoolStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
} from '@/api/admin/students';
import { 
  getSchoolTeachers,
  createTeacher
} from '@/api/admin/teachers';
import { 
  getSchoolGroups,
  getSchoolGroupsWithCounts,
  getGroupById,
  createGroup,
  updateGroup,
  archiveGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  addTeacherToGroup,
  removeTeacherFromGroup
} from '@/api/admin/groups';
import { 
  getSchoolRankingGroups,
  createRankingGroup,
  addStudentGroupToRankingGroup,
  removeStudentGroupFromRankingGroup
} from '@/api/admin/rankingGroups';
import { 
  getSchoolPointGroups,
  createPointGroup,
  updatePointGroup
} from '@/api/admin/pointGroups';
import { 
  getSchoolTimeframes,
  createTimeframe,
  updateTimeframe,
  deleteTimeframe,
  activateTimeframe
} from '@/api/admin/timeframes';

// Query Keys
export const adminQueryKeys = {
  students: (schoolId: number) => ['admin', 'students', schoolId] as const,
  student: (studentId: number) => ['admin', 'student', studentId] as const,
  teachers: (schoolId: number) => ['admin', 'teachers', schoolId] as const,
  groups: (schoolId: number) => ['admin', 'groups', schoolId] as const,
  rankingGroups: (schoolId: number) => ['admin', 'rankingGroups', schoolId] as const,
  pointGroups: (schoolId: number) => ['admin', 'pointGroups', schoolId] as const,
  timeframes: (schoolId: number) => ['admin', 'timeframes', schoolId] as const,
  pointTypes: (schoolId: number) => ['admin', 'pointTypes', schoolId] as const,
};

/**
 * Students Queries
 */
export const useSchoolStudents = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.students(schoolId),
    queryFn: () => getSchoolStudents(schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStudent = (studentId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.student(studentId),
    queryFn: () => getStudentById(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, studentData }: {
      schoolId: number;
      studentData: {
        firstName: string;
        lastName: string;
        grade: number;
        birthdate?: string;
        gender?: string;
        powerschoolId: number;
        groupIds?: number[];
      };
    }) => createStudent(schoolId, studentData),
    onSuccess: (data, { schoolId }) => {
      // Invalidate and refetch students list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students(schoolId) });
      
      // Add the new student to the cache
      queryClient.setQueryData(
        adminQueryKeys.student(data.id),
        data
      );
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentId, studentData }: {
      studentId: number;
      studentData: {
        firstName?: string;
        lastName?: string;
        grade?: number;
        birthdate?: string;
        gender?: string;
        powerschoolId?: number;
        groupIds?: number[];
      };
    }) => updateStudent(studentId, studentData),
    onSuccess: (data, { studentId }) => {
      // Update the student in cache
      queryClient.setQueryData(
        adminQueryKeys.student(studentId),
        data
      );
      
      // Invalidate students list to refresh the list
      // We need to invalidate all school student lists since we don't know which school
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (studentId: number) => deleteStudent(studentId),
    onSuccess: (_, studentId) => {
      // Remove the student from cache
      queryClient.removeQueries({ queryKey: adminQueryKeys.student(studentId) });
      
      // Invalidate students lists to refresh
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
  });
};

/**
 * Teachers Queries
 */
export const useSchoolTeachers = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.teachers(schoolId),
    queryFn: () => getSchoolTeachers(schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, teacherData }: {
      schoolId: number;
      teacherData: {
        firstName: string;
        lastName: string;
        groupIds?: number[];
      };
    }) => createTeacher(schoolId, teacherData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch teachers list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers(schoolId) });
    },
  });
};

/**
 * Groups Queries
 */
export const useSchoolGroups = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.groups(schoolId),
    queryFn: () => getSchoolGroups(schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useSchoolGroupsWithCounts = (schoolId: number, includeArchived: boolean = false) => {
  return useQuery({
    queryKey: [...adminQueryKeys.groups(schoolId), 'withCounts', includeArchived],
    queryFn: () => getSchoolGroupsWithCounts(schoolId, includeArchived),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useGroup = (schoolId: number, groupId: number) => {
  return useQuery({
    queryKey: [...adminQueryKeys.groups(schoolId), groupId],
    queryFn: () => getGroupById(schoolId, groupId),
    enabled: !!schoolId && !!groupId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAddStudentToGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId, studentId }: {
      schoolId: number;
      groupId: number;
      studentId: number;
    }) => addStudentToGroup(schoolId, groupId, studentId),
    onSuccess: (_, { schoolId, groupId }) => {
      // Invalidate the specific group and all groups lists
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.groups(schoolId), groupId] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useRemoveStudentFromGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId, studentId }: {
      schoolId: number;
      groupId: number;
      studentId: number;
    }) => removeStudentFromGroup(schoolId, groupId, studentId),
    onSuccess: (_, { schoolId, groupId }) => {
      // Invalidate the specific group and all groups lists
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.groups(schoolId), groupId] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useAddTeacherToGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId, teacherId }: {
      schoolId: number;
      groupId: number;
      teacherId: number;
    }) => addTeacherToGroup(schoolId, groupId, teacherId),
    onSuccess: (_, { schoolId, groupId }) => {
      // Invalidate the specific group and all groups lists
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.groups(schoolId), groupId] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useRemoveTeacherFromGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId, teacherId }: {
      schoolId: number;
      groupId: number;
      teacherId: number;
    }) => removeTeacherFromGroup(schoolId, groupId, teacherId),
    onSuccess: (_, { schoolId, groupId }) => {
      // Invalidate the specific group and all groups lists
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.groups(schoolId), groupId] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupData }: {
      schoolId: number;
      groupData: {
        name: string;
        parentId?: number;
      };
    }) => createGroup(schoolId, groupData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId, groupData }: {
      schoolId: number;
      groupId: number;
      groupData: {
        name?: string;
        parentId?: number | null;
      };
    }) => updateGroup(schoolId, groupId, groupData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useArchiveGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId }: {
      schoolId: number;
      groupId: number;
    }) => archiveGroup(schoolId, groupId),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupId }: {
      schoolId: number;
      groupId: number;
    }) => deleteGroup(schoolId, groupId),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(schoolId) });
    },
  });
};

/**
 * Point Types Queries
 */
export const useSchoolPointTypes = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.pointTypes(schoolId),
    queryFn: () => Promise.resolve([]), // TODO: Implement point types API
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreatePointType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, pointTypeData }: {
      schoolId: number;
      pointTypeData: {
        name: string;
        color: string;
        parentId?: number;
        ranked?: boolean;
      };
    }) => Promise.resolve({ id: 0, name: pointTypeData.name, color: pointTypeData.color, parentId: pointTypeData.parentId, ranked: pointTypeData.ranked }), // TODO: Implement point types API
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch point types list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.pointTypes(schoolId) });
    },
  });
};

/**
 * Ranking Groups Queries
 */
export const useSchoolRankingGroups = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.rankingGroups(schoolId),
    queryFn: () => getSchoolRankingGroups(schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateRankingGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupData }: {
      schoolId: number;
      groupData: {
        name: string;
      };
    }) => createRankingGroup(schoolId, groupData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch ranking groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rankingGroups(schoolId) });
    },
  });
};

export const useAddStudentGroupToRankingGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentGroupId, rankingGroupId }: {
      studentGroupId: number;
      rankingGroupId: number;
    }) => addStudentGroupToRankingGroup(studentGroupId, rankingGroupId),
    onSuccess: (_, { rankingGroupId }) => {
      // Invalidate ranking groups to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'rankingGroups'] });
    },
  });
};

export const useRemoveStudentGroupFromRankingGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentGroupId, rankingGroupId }: {
      studentGroupId: number;
      rankingGroupId: number;
    }) => removeStudentGroupFromRankingGroup(studentGroupId, rankingGroupId),
    onSuccess: (_, { rankingGroupId }) => {
      // Invalidate ranking groups to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'rankingGroups'] });
    },
  });
};

/**
 * Point Groups Queries
 */
export const useSchoolPointGroups = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.pointGroups(schoolId),
    queryFn: () => getSchoolPointGroups(schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreatePointGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, groupData }: {
      schoolId: number;
      groupData: {
        name: string;
        color: string;
        ranked: boolean;
        parentId?: number;
      };
    }) => createPointGroup(schoolId, groupData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch point groups list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.pointGroups(schoolId) });
    },
  });
};

export const useUpdatePointGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ pointGroupId, groupData }: {
      pointGroupId: number;
      groupData: {
        name?: string;
        color?: string;
        ranked?: boolean;
      };
    }) => updatePointGroup(pointGroupId, groupData),
    onSuccess: (_, { pointGroupId }) => {
      // Invalidate point groups to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'pointGroups'] });
    },
  });
};

/**
 * Timeframes Queries
 */
export const useSchoolTimeframes = (schoolId: number) => {
  return useQuery({
    queryKey: adminQueryKeys.timeframes(schoolId),
    queryFn: () => getSchoolTimeframes(schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateTimeframe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ schoolId, timeframeData }: {
      schoolId: number;
      timeframeData: {
        name: string;
        startsAt: string;
        endsAt: string;
      };
    }) => createTimeframe(schoolId, timeframeData),
    onSuccess: (_, { schoolId }) => {
      // Invalidate and refetch timeframes list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.timeframes(schoolId) });
    },
  });
};

export const useUpdateTimeframe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ timeframeId, timeframeData }: {
      timeframeId: number;
      timeframeData: {
        name?: string;
        startsAt?: string;
        endsAt?: string;
      };
    }) => updateTimeframe(timeframeId, timeframeData),
    onSuccess: (_, { timeframeId }) => {
      // Invalidate timeframes to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'timeframes'] });
    },
  });
};

export const useDeleteTimeframe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (timeframeId: number) => deleteTimeframe(timeframeId),
    onSuccess: (_, timeframeId) => {
      // Invalidate timeframes to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'timeframes'] });
    },
  });
};

export const useActivateTimeframe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (timeframeId: number) => activateTimeframe(timeframeId),
    onSuccess: (_, timeframeId) => {
      // Invalidate timeframes to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'timeframes'] });
    },
  });
}; 