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
    linkCode: string,
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
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
        }[],
    },
    rankByPointType: {
        type: PointType,
        rank: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
        }[],
    }[],
    rankByStudentGroup: {
        group: StudentGroup,
        rank: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
        }[],
    }[],
    totalPoints: number,
    pointsByType: {
        type: PointType,
        points: number,
    }[],
    pointsByStudentGroup: {
        group: StudentGroup,
        points: number,
        nearbyStudents: {
            studentId: number,
            firstName: string,
            lastName: string,
            points: number,
        }[],
    }[],
    events: {

    }[]
}

export type Teacher = {
    id: number,
    schoolId: number,
    linkCode: string,
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
        return { letter: "S+", color: "#FFA700" }
    } else if (percentile >= 0.95) {
        return { letter: "S", color: "#FFA700" }
    } else if (percentile >= 0.93) {
        return { letter: "S-", color: "#FFA700" }
    } else if (percentile >= 0.9) {
        return { letter: "A+", color: "#0CD4F2" }
    } else if (percentile >= 0.85) {
        return { letter: "A", color: "#0CD4F2" }
    } else if (percentile >= 0.8) {
        return { letter: "A-", color: "#0CD4F2" }
    } else if (percentile >= 0.75) {
        return { letter: "B+", color: "#1BF20C" }
    } else if (percentile >= 0.7) {
        return { letter: "B", color: "#1BF20C" }
    } else if (percentile >= 0.65) {
        return { letter: "B-", color: "#1BF20C" }
    } else if (percentile >= 0.6) {
        return { letter: "C+", color: "#F2EB0C" }
    } else if (percentile >= 0.55) {
        return { letter: "C", color: "#F2EB0C" }
    } else if (percentile >= 0.5) {
        return { letter: "C-", color: "#F2EB0C" }
    } else if (percentile >= 0.45) {
        return { letter: "D+", color: "#F2920C" }
    } else if (percentile >= 0.4) {
        return { letter: "D", color: "#F2920C" }
    } else if (percentile >= 0.35) {
        return { letter: "D-", color: "#F2920C" }
    } else if (percentile >= 0.25) {
        return { letter: "E", color: "#F49A92" }
    } else if (percentile >= 0.2) {
        return { letter: "E-", color: "#F49A92" }
    } else if (percentile >= 0.15) {
        return { letter: "F+", color: "#F49A92" }
    } else if (percentile >= 0.1) {
        return { letter: "F", color: "#F4DBF1" }
    } else {
        return { letter: "F-", color: "#F4DBF1" }
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

// Admin API Data Types
export type AdminStudentData = {
  id: number;
  firstName: string;
  lastName: string;
  grade: number;
  birthdate?: string | null;
  gender?: string | null;
  powerschoolId?: number;
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
  studentGroupIds: number[];
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
  conversionRule: string; // or a more specific type if you have one
  conversionRuleValue: number;
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

export type ImportedScorebook = {
  pointEventId: number,
  name: string,
  date: string,
  template: {
    type: string,
    value: number
  }
  studentPoints: {
    id: number,
    lastName: string,
    firstName: string,
    input: number,
    value: number
  }[]
}[]

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
  pointGroup: {
    id: number,
    name: string,
    color: string
  },
  studentPoints: {
    student: {
      id: number,
      studentGroups: {
        id: number,
        name: string
      }[],
      powerschoolId: number,
    },
    pointData: {
      input: number,
      value: number,
      notes: string
    }
  }[]
}

export enum PointConversionRuleType {
  ADD = 'add',
  SUBTRACT = 'subtract',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  FORMULA = 'formula',
  DIRECT = 'direct'
}

export function stringToRuleType(ruleType: string): PointConversionRuleType {
  switch (ruleType.toLowerCase()) {
    case 'add':
      return PointConversionRuleType.ADD;
    case 'subtract':
      return PointConversionRuleType.SUBTRACT;
    case 'multiply':
      return PointConversionRuleType.MULTIPLY;
    case 'divide':
      return PointConversionRuleType.DIVIDE;
    case 'formula':
      return PointConversionRuleType.FORMULA;
    case 'direct':
      return PointConversionRuleType.DIRECT;
    default:
      return PointConversionRuleType.DIRECT;
  }
}

export function ruleTypeAndValueToFormula(ruleType: PointConversionRuleType, value: number, input: number, formula: string | null): string {
  switch (ruleType) {
    case PointConversionRuleType.ADD:
      return `${input} + ${value}`;
    case PointConversionRuleType.SUBTRACT:
      return `${input} - ${value}`;
    case PointConversionRuleType.MULTIPLY:
      return `${input} * ${value}`;
    case PointConversionRuleType.DIVIDE:
      return `${input} / ${value}`;
    case PointConversionRuleType.FORMULA:
      if (!formula) return '';
      return formula.replace('a', input.toString()).replace('b', value.toString());
    case PointConversionRuleType.DIRECT:
      return '';
  }
}

export function convertPointUsingRuleType(
  ruleType: PointConversionRuleType,
  value: number,
  input: number,
  formula: string | null = null
): number {
  switch (ruleType) {
    case PointConversionRuleType.ADD:
      return Number(input) + Number(value);
    case PointConversionRuleType.SUBTRACT:
      return Number(input) - Number(value);
    case PointConversionRuleType.MULTIPLY:
      return Number(input) * Number(value);
    case PointConversionRuleType.DIVIDE:
      return Number(input) / Number(value);
    case PointConversionRuleType.FORMULA:
      if (!formula) return input;
      return eval(formula);
    case PointConversionRuleType.DIRECT:
      return input;
  }
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
    conversionRuleType: string | null;
    conversionRuleValue: number | null;
    conversionRuleTarget: number | null;
    conversionRuleFormula: string | null;
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
  conversionRuleTypes: {
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