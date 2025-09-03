export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'groupLeader' | 'teachingAssistant' | 'dashboard';

export type AccessLevel = 'full' | 'nearby' | 'top' | 'own' | 'group' | 'dashboard';

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
    maxPointGroupLimit?: number;
    allowedStudentGroups?: number[];
    allowedPointGroups?: number[];
    allowedAccessLevels?: string[];
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
  pointGroups?: {
    id: number;
    name: string;
    color: string;
    points: number;
  }[];
  studentGroups?: {
    id: number;
    name: string;
  }[];
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

export type GlobalPoints = {
    schoolId: number,
    totalStudents: number,
    timeframes: TimeframeData[],
    grades: number[],
    students: {
        id: number,
        firstName: string,
        lastName: string,
        rank: number,
        lastMonthRank: number,
        totalPoints: number,
        lastMonthPoints: number,
        grade: number,
        gradeRank: number,
        lastMonthGradeRank: number,
        pointGroups: {
            id: number,
            points: number,
            rank: number,
            lastMonthPoints: number,
            lastMonthRank: number
        }[],
        totalPointsByDay: Map<string, number>,
        pointsEarnedEachDay: Map<string, number>,
        monthToMonthChange: number,
        studentGroups: number[]
    }[],
    pointGroups: {
        id: number,
        name: string,
        color: string
    }[],
    studentGroups: {
        id: number,
        name: string,
        totalStudents: number,
        averagePoints: number,
        lastMonthAveragePoints: number,
        rawPoints: number,
        lastMonthRawPoints: number,
        pointGroups: {
            id: number,
            points: number
        }[]
    }[],
    rankingGroups: {
        id: number,
        name: string,
        studentGroups: {
            id: number,
            name: string,
            totalStudents: number,
            averagePoints: number,
            lastMonthAveragePoints: number,
            rawPoints: number,
            lastMonthRawPoints: number,
            pointGroups: {
                id: number,
                points: number
            }[]
        }[]
    }[],
    pointEvents: {
        id: number,
        name: string,
        maxPoints: number,
        date: string,
        studentGroupId: number,
        pointGroup: number,
        students: {
            id: number,
            points: number
        }[]
    }[]
}

export type TimeframeData = {
    id: number,
    name: string,
    startDate: string,
    endDate: string,
    isActive: boolean
}

export type PointEventData = {
    id: number,
    name: string,
    date: string,
    maxInput: number,
    template: {
        id: number,
        pointGroupId: number,
        conversionRule: {
            name: string,
            value: number
        }
    },
    studentGroup: {
        id: number,
        name: string,
        rankingGroups: number[],
    },
    studentPoints: {
        studentId: number,
        input: number
    }[]
}

export type RankingGroupPointEventData = {
    id: number,
    name: string,
    date: string,
    groupPoints: {
        groupId: number,
        points: number
    }[]
}

export type PointGroupData = {
    id: number,
    name: string,
    color: string
}

export type StudentGroupData = {
    id: number,
    name: string,
    students: number[]
}

export type RankingGroupData = {
    id: number,
    name: string,
    studentGroups: number[],
    timeframeStart: string | null,
    timeframeEnd: string | null,
}

export type CompiledStudentPoints = {
    id: number,
    firstName: string,
    lastName: string,
    totalPoints: number,
    lastMonthPoints: number,
    grade: number,
    pointGroups: {
        id: number,
        points: number,
        lastMonthPoints: number
    }[],
    totalPointsByDay: Map<string, number>,
    pointsEarnedEachDay: Map<string, number>,
    monthToMonthImprovement: number,
    rank: number,
    lastMonthRank: number,
    gradeRank: number,
    lastMonthGradeRank: number,
    studentGroups: number[]
} 