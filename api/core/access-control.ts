import { UserContext, UserRole, AccessLevel, DataAccessConfig, NearbyRankParams, TopStudentsParams } from './types';

export class AccessControlService {
  private static readonly ACCESS_CONFIGS: Record<UserRole, DataAccessConfig[]> = {
    admin: [
      {
        role: 'admin',
        accessLevel: 'full',
        allowedFields: ['*'],
        restrictions: {}
      }
    ],
    teacher: [
      {
        role: 'teacher',
        accessLevel: 'group',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank', 'pointEvents'],
        restrictions: {
          maxTopLimit: 50,
          allowedStudentGroups: [] // Will be populated dynamically based on teacher's groups
        }
      },
      {
        role: 'teacher',
        accessLevel: 'top',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxTopLimit: 20
        }
      }
    ],
    groupLeader: [
      {
        role: 'groupLeader',
        accessLevel: 'group',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank', 'pointEvents', 'pointGroups', 'birthdate', 'gender'],
        restrictions: {
          maxTopLimit: 100,
          allowedStudentGroups: [] // Will be populated dynamically based on leader's groups
        }
      },
      {
        role: 'groupLeader',
        accessLevel: 'top',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxTopLimit: 30
        }
      }
    ],
    teachingAssistant: [
      {
        role: 'teachingAssistant',
        accessLevel: 'group',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank', 'pointEvents', 'pointGroups'],
        restrictions: {
          maxTopLimit: 50,
          allowedStudentGroups: [] // Will be populated dynamically based on assistant's group
        }
      },
      {
        role: 'teachingAssistant',
        accessLevel: 'top',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxTopLimit: 15
        }
      }
    ],
    student: [
      {
        role: 'student',
        accessLevel: 'own',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank', 'pointEvents', 'pointGroups'],
        restrictions: {}
      },
      {
        role: 'student',
        accessLevel: 'nearby',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxNearbyWindow: 5
        }
      },
      {
        role: 'student',
        accessLevel: 'top',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxTopLimit: 10
        }
      }
    ],
    parent: [
      {
        role: 'parent',
        accessLevel: 'own',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank', 'pointEvents'],
        restrictions: {}
      },
      {
        role: 'parent',
        accessLevel: 'nearby',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxNearbyWindow: 3
        }
      },
      {
        role: 'parent',
        accessLevel: 'top',
        allowedFields: ['id', 'firstName', 'lastName', 'grade', 'totalPoints', 'rank'],
        restrictions: {
          maxTopLimit: 5
        }
      }
    ]
  };

  static validateAccess(userContext: UserContext, accessLevel: AccessLevel): boolean {
    const configs = this.ACCESS_CONFIGS[userContext.role];
    return configs.some(config => config.accessLevel === accessLevel);
  }

  static getAccessConfig(userContext: UserContext, accessLevel: AccessLevel): DataAccessConfig | null {
    const configs = this.ACCESS_CONFIGS[userContext.role];
    return configs.find(config => config.accessLevel === accessLevel) || null;
  }

  static validateNearbyRankAccess(userContext: UserContext, params: NearbyRankParams): boolean {
    const config = this.getAccessConfig(userContext, 'nearby');
    if (!config) return false;

    // Students can only see nearby ranks for themselves
    if (userContext.role === 'student' && params.studentId !== userContext.studentId) {
      return false;
    }

    // Check rank window limit
    if (config.restrictions.maxNearbyWindow && params.rankWindow > config.restrictions.maxNearbyWindow) {
      return false;
    }

    return true;
  }

  static validateTopStudentsAccess(userContext: UserContext, params: TopStudentsParams): boolean {
    const config = this.getAccessConfig(userContext, 'top');
    if (!config) return false;

    // Check limit restrictions
    if (config.restrictions.maxTopLimit && params.limit > config.restrictions.maxTopLimit) {
      return false;
    }

    return true;
  }

  static getTeacherStudentGroups(_teacherId: number): Promise<number[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // This would be implemented to fetch the student groups the teacher manages
    // For now, returning empty array - will be implemented when we build the teacher-specific queries
    return Promise.resolve([]);
  }

  static getGroupLeaderStudentGroups(_groupLeaderId: number): Promise<number[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // This would be implemented to fetch the student groups the leader manages
    // For now, returning empty array - will be implemented when we build the leader-specific queries
    return Promise.resolve([]);
  }

  static getTeachingAssistantData(_assistantId: number): Promise<{
    groupId: number;
    hasFullAccess: boolean;
    allowedPointEventIds: number[];
  } | null> {
    // This would be implemented to fetch the teaching assistant's data
    // For now, returning null - will be implemented when we build the assistant-specific queries
    return Promise.resolve(null);
  }

  static filterAllowedFields<T extends Record<string, unknown>>(
    data: T,
    allowedFields: string[]
  ): Partial<T> {
    if (allowedFields.includes('*')) {
      return data;
    }

    const filtered: Partial<T> = {};
    for (const field of allowedFields) {
      if (field in data) {
        filtered[field as keyof T] = data[field] as T[keyof T];
      }
    }
    return filtered;
  }
} 