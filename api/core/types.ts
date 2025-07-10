export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'groupLeader' | 'teachingAssistant';

export type AccessLevel = 'full' | 'nearby' | 'top' | 'own' | 'group';

export interface UserContext {
  userId: string; // Supabase user ID (string)
  role: UserRole;
  schoolId: number;
  studentId?: number;
  teacherId?: number;
  adminId?: number;
  groupLeaderId?: number;
  managedGroupIds?: number[];
  teachingAssistantId?: number;
  assistantGroupId?: number;
  hasFullAccess?: boolean;
  allowedPointEventIds?: number[];
}

export interface QueryFilters {
  schoolId: number;
  timeframeId?: number;
  pointGroupId?: number;
  studentGroupId?: number;
  grade?: number;
  limit?: number;
  offset?: number;
}

export interface NearbyRankParams {
  studentId: number;
  rankWindow: number; // Number of students above/below to include
  pointGroupId?: number;
  studentGroupId?: number;
}

export interface TopStudentsParams {
  limit: number;
  pointGroupId?: number;
  studentGroupId?: number;
  grade?: number;
  percentile?: number; // Top X percentile instead of absolute limit
}

export interface DataAccessConfig {
  role: UserRole;
  accessLevel: AccessLevel;
  allowedFields: string[];
  restrictions: {
    maxNearbyWindow?: number;
    maxTopLimit?: number;
    allowedStudentGroups?: number[];
    allowedPointGroups?: number[];
  };
}

export interface CachedQueryResult<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface QueryMetadata {
  queryId: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedRows: number;
  lastExecuted: number;
  executionCount: number;
  averageExecutionTime: number;
}

// Student data structure
export interface StudentData {
  studentId: number;
  totalPoints: number;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    grade: number;
    school_id: number;
  };
  rank: number;
}

// Top students response
export interface TopStudentsResponse {
  students: StudentData[];
  limit: number;
  totalCount: number;
}

// Nearby ranking response
export interface NearbyRankingResponse {
  targetStudent: StudentData;
  nearbyStudents: StudentData[];
  rankWindow: number;
}

// Dashboard response
export interface DashboardResponse {
  students: StudentData[];
  totalStudents: number;
  averagePoints: number;
  topStudents: StudentData[];
  filters: QueryFilters;
}

// Student points with ranking response
export interface StudentPointsWithRankingResponse {
  students: StudentData[];
  totalCount: number;
  averagePoints: number;
} 