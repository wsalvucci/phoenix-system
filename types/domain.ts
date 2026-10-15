export type PhoenixUser = {
    id: number,
    adminId: number | null,
    teacherId: number | null,
    studentId: number | null
}

export type Admin = {
    id: number
}

export type AdminHomeDashboard = {
    id: number,
    schools: School[]
}

export type AdminSchoolDash = {
    school: {
        id: number,
        name: string,
    },
    students: {
        id: number,
        firstName: string,
        lastName: string,
        grade: number,
        totalPoints: number,
    }[],
    studentGroups: {
        id: number,
        name: string,
        parentId: number | null,
    }[],
    pointTypes: {
        id: number,
        name: string,
        color: string,
    }[],
}

export type Student = {
    id: number,
    schoolId: number,
    firstName: string,
    lastName: string,
    birthdate: string | null,
    grade: number,
    gender: string | null,
    linkedUserId: number | null,
}

export type StudentPointData = {
    student: Student,
    overallRank: number,
    rankInGrade: {
        grade: number,
        rank: number,
    },
    rankByPointType: {
        type: PointType,
        rank: number,
    }[],
    rankByStudentGroup: {
        group: StudentGroup,
        rank: number,
    }[],
    totalPoints: number,
    pointsByType: {
        type: PointType,
        points: number,
    }[],
    pointsByStudentGroup: {
        group: StudentGroup,
        points: number,
    }[],
    events: {

    }[]
}

export type Teacher = {
    id: number,
    schoolId: number,
    firstName: string,
    lastName: string,
    linkedUserId: number | null,
}

export type School = {
    id: number,
    name: string,
}

export type Class = {
    id: number,
    name: string,
    schoolId: number,
}

export type PointType = {
    id: number,
    name: string,
    schoolId: number,
    color: string,
}

export type StudentGroup = {
    id: number,
    name: string,
    schoolId: number,
}

export type PointEvent = {
    id: number,
    pointTypeId: number,
    maximumPoints: number,
}

// DASHBOARD TYPES

export type Rating = {
    letter: string,
    color: string
}

export function percentileToRating(percentile: number): Rating {
    if (percentile >= 0.97) {
        return { letter: "S+", color: "#E69500" }
    } else if (percentile >= 0.95) {
        return { letter: "S", color: "#E69500" }
    } else if (percentile >= 0.93) {
        return { letter: "S-", color: "#E69500" }
    } else if (percentile >= 0.9) {
        return { letter: "A+", color: "#0BB5D1" }
    } else if (percentile >= 0.85) {
        return { letter: "A", color: "#0BB5D1" }
    } else if (percentile >= 0.8) {
        return { letter: "A-", color: "#0BB5D1" }
    } else if (percentile >= 0.75) {
        return { letter: "B+", color: "#169A0A" }
    } else if (percentile >= 0.7) {
        return { letter: "B", color: "#169A0A" }
    } else if (percentile >= 0.65) {
        return { letter: "B-", color: "#169A0A" }
    } else if (percentile >= 0.6) {
        return { letter: "C+", color: "#C6B800" }
    } else if (percentile >= 0.55) {
        return { letter: "C", color: "#C6B800" }
    } else if (percentile >= 0.5) {
        return { letter: "C-", color: "#C6B800" }
    } else if (percentile >= 0.45) {
        return { letter: "D+", color: "#C36A06" }
    } else if (percentile >= 0.4) {
        return { letter: "D", color: "#C36A06" }
    } else if (percentile >= 0.35) {
        return { letter: "D-", color: "#C36A06" }
    } else if (percentile >= 0.25) {
        return { letter: "E", color: "#C75F56" }
    } else if (percentile >= 0.2) {
        return { letter: "E-", color: "#C75F56" }
    } else if (percentile >= 0.15) {
        return { letter: "F+", color: "#C75F56" }
    } else if (percentile >= 0.1) {
        return { letter: "F", color: "#B978B0" }
    } else {
        return { letter: "F-", color: "#B978B0" }
    }
}

export type TopScrollingDashboard = {
    timeframes: Timeframe[],
    students: {
        id: number,
        firstName: string,
        lastName: string,
        grade: number,
        totalRank: number,
        rankInGrade: {
            grade: number,
            rank: number,
        },
        totalPoints: number,
        totalRating: Rating,
        pointsByType: {
            id: number,
            name: string,
            color: string,
            points: number,
            rating: Rating
        }[],
        studentGroups: {
            id: number,
            name: string,
            rank: number
        }[],
    }[]
}

export type Timeframe = {
    id: number,
    name: string,
    startsAt: string,
    endsAt: string,
    active: boolean,
    schoolId: number,
}

export type TeacherTimeframe = {
    id: number,
    name: string,
    startsAt: string,
    endsAt: string,
    active: boolean,
}

export type DuplicateScorebookEventsInput = {
  studentGroupId: number;
  sourceTimeframeId: number;
  shiftAmount: number;
  shiftUnit: "days" | "months" | "years";
  destinationTimeframeId?: number | null;
  expectedSourceEventIds: number[];
  excludedEventIds: number[];
  requestId: string;
}

export type DuplicateScorebookEventsResult = {
  copiedCount: number;
  createdEventIds: number[];
  sourceEventIds: number[];
  excludedEventIds: number[];
  outsideDestinationCount: number;
  adjustedDates: {
    sourceEventId: number;
    sourceDate: string;
    resultingDate: string;
  }[];
  replayed: boolean;
}

// Admin API Data Types
export type AdminStudentData = {
  id: number;
  firstName: string;
  lastName: string;
  grade: number;
  birthdate?: string | null;
  gender?: string | null;
  powerschoolId?: number;
  linkCode?: string;
  groupIds?: number[];
  totalPoints?: number;
};

export type AdminTeacherData = {
  id: number;
  firstName: string;
  lastName: string;
  groupIds?: number[];
};

export type AdminGroupData = {
  id: number;
  name: string;
  parentId?: number | null;
  archived?: boolean;
};

export type AdminPointTypeData = {
  id: number;
  name: string;
  color: string;
  parentId?: number | null;
  ranked?: boolean;
};

export type AdminRankingGroupData = {
  id: number;
  name: string;
  schoolId: number;
  timeframeId: number | null;
  timeframe: {
    id: number;
    name: string;
    startsAt: string;
    endsAt: string;
  } | null;
  studentGroupIds: number[];
  studentGroups: {
    id: number;
    name: string;
    archived: boolean;
  }[];
  teacherIds: number[];
  teachers: {
    id: number;
    firstName: string;
    lastName: string;
  }[];
};

export type AdminPointGroupData = {
  id: number;
  name: string;
  color: string;
  ranked: boolean;
  parentId?: number | null;
  childGroups?: AdminPointGroupData[];
};

export type AdminTimeframeData = {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  schoolId: number;
};

export type StudentScore = {
  id: number;
  firstName: string;
  lastName: string;
  inputScore: number;
  points: number;
};

export type PointTemplate = {
  id: number;
  name: string;
  pointGroup: { color: string };
};

export type ScorebookPointEvent = {
  id: number;
  name: string;
  date: string;
  maxInput: number;
  pointTemplate: PointTemplate;
  students: StudentScore[];
};

export type ScorebookData = {
  group: {
    id: number;
    name: string;
  };
  students: {
    id: number;
    firstName: string;
    lastName: string;
  }[];
  pointTemplates: PointTemplate[];
  pointEvents: ScorebookPointEvent[];
};

// For import UI preview (row-based)
export type ImportPreviewTableRow = {
  studentName: string,
  studentId: string,
  scores: string[]
};

// For backend import (event-centric)
export type ImportedScorebook = {
  pointEventId: number,
  name: string,
  date: string,
  template: {
    type: string,
    value: number
  },
  studentPoints: {
    id: number,
    lastName: string,
    firstName: string,
    input: number,
    value: number
  }[]
}[];

export type NewScorebookData = {
  pointEvents: NewScorebookPointEvent[],
  students: {
    id: number,
    firstName: string,
    lastName: string
  }[],
  studentGroup: {
    id: number,
    name: string
  },
  pointGroups: {
    id: number,
    name: string,
    color: string
  }[]
}

export type NewScorebookPointEvent = {
  id: number;
  date: string,
  name: string,
  maxInput: number,
  conversionFormula: string | null,
  pointGroup: {
    id: number,
    name: string,
    color: string
  },
  studentPoints: {
    student: {
      id: number,
      /** Absent when the viewer is a student assistant (DATA_DISCLOSURE.md §10.7). */
      studentGroups?: {
        id: number,
        name: string
      }[],
      /** Absent when the viewer is a student assistant. */
      powerschoolId?: number,
    },
    pointData: {
      input: number,
      value: number,
      notes: string
    }
  }[]
}

export type ClassConfigurationData = {
  templates: {
    id: number;
    name: string;
    templateType: string | null;
    pointGroup: {
      id: number | null;
      name: string | null;
      color: string | null;
    } | null;
  }[];
  pointGroups: {
    id: number;
    name: string;
    color: string;
    parent_id: number | null;
    ranked: boolean;
    school_id: number;
    created_at: string;
  }[];
  templateTypes: {
    id: number;
    name: string;
  }[];
};

export type RankingGroupData = {
  id: number;
  name: string;
  studentGroups: {
    id: number;
    name: string;
  }[];
};

export type RankingGroupScorebookData = {
  id: number;
  name: string;
  studentGroups: {
    id: number;
    name: string;
  }[];
  pointEvents: {
    id: number;
    name: string;
    date: string;
    studentGroupPoints: {
      studentGroupId: number;
      value: number;
      pointId: number;
    }[];
  }[];
};

export type TeachingAssistant = {
  id: number;
  studentId: number;
  groupId: number;
  fullAccess: boolean;
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

export type TeachingAssistantPointEvent = {
  assistantId: number;
  pointEventId: number;
};

export type TeachingAssistantAssignment = {
  studentId: number;
  fullAccess: boolean;
  pointEventIds: number[];
};

export type TeachingAssistantManagementData = {
  assistants: TeachingAssistant[];
  availableStudents: {
    id: number;
    firstName: string;
    lastName: string;
  }[];
  pointEvents: {
    id: number;
    name: string;
    date: string;
    pointGroupId: number;
    pointGroup: {
      id: number;
      name: string;
      color: string;
    } | null;
  }[];
  pointGroups: {
    id: number;
    name: string;
    color: string;
  }[];
};

// STUDENT DASHBOARD TYPES

export type StudentDashboardData = {
  student: Student;
  timeframe: {
    id: number;
    name: string;
    startsAt: string;
    endsAt: string;
    active: boolean;
  };
  totalPoints: number;
  totalRank: number;
  totalOutOf: number;
  gradeRank: number;
  gradeOutOf: number;
  pointGroupRankings: PointGroupRanking[];
  pointEventRankings: PointEventRanking[];
};

export type PointGroupRanking = {
  pointGroupId: number;
  pointGroupName: string;
  pointGroupColor: string;
  points: number;
  rank: number;
  outOf: number;
  letterGrade: Rating;
};

export type PointEventRanking = {
  eventId: number;
  eventName: string;
  eventDate: string;
  maxPoints: number;
  points: number;
  rank: number;
  outOf: number;
  studentPointId: number;
  pointGroup: {
    id: number;
    name: string;
    color: string;
  };
};

export type StudentGroupWithChildren = {
  id: number;
  name: string;
  parentId: number | null;
  childGroups: Array<{ id: number; name: string }>;
};

export type SharedPointData = {
  eventId: number;
  eventName: string | null;
  eventDate: string | null;
  pointGroup: {
    id: number;
    name: string;
    color: string;
  };
  sharedPoints: Array<{
    /** Opaque per-response key; not a database id. */
    key: string;
    pointValue: number;
    sharer: {
      firstName: string;
      lastName: string;
    };
  }>;
};

export type StudentRecentEvent = {
  id: number;
  name: string;
  date: string;
  maxPoints: number;
  points: number;
  pointGroup: {
    id: number;
    name: string;
    color: string;
  };
};

export type StudentRankingData = {
  totalRank: number;
  totalOutOf: number;
  gradeRank: number;
  gradeOutOf: number;
};

export type MonthlyTrendData = {
  month: string; // Format: "YYYY-MM"
  totalPoints: number;
  rank: number;
  outOf: number;
  pointIncrease: number;
  percentageIncrease: number;
  rankChange: number; // Positive = improved rank, negative = worse rank
};

export type StudentMonthlyTrends = {
  currentMonth: MonthlyTrendData;
  previousMonth: MonthlyTrendData | null;
  trends: MonthlyTrendData[];
};
