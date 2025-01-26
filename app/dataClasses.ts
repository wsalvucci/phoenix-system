import { Database } from "@/types/supabase";
import Color from "color";
import { DateTime } from "luxon";

export class StudentGroup {
        id: number;
        name: string;
        parentGroup: number | null;
        childGroups: StudentGroup[] | null;
        teachers: Teacher[] | null;
        students: Student[] | null;

        constructor(
                id: number,
                name: string,
                parentGroup: number | null = null,
                childGroups: StudentGroup[] | null = null,
                teachers: Teacher[] | null = null,
                students: Student[] | null = null
        ) {
                this.id = id;
                this.name = name;
                this.parentGroup = parentGroup;
                this.childGroups = childGroups;
                this.teachers = teachers;
                this.students = students;
        }
}

export class School {
        id: number;
        name: string;

        constructor(
                id: number,
                name: string
        ) {
                this.id = id;
                this.name = name;
        }
}

export class Student {
        id: number;
        schoolId: number;
        linkCode: string;
        powerSchoolId: number;
        firstName: string;
        lastName: string;
        birthdate: Date | null;
        grade: number;
        gender: string | null;

        constructor(
                id: number,
                schoolId: number,
                linkCode: string,
                powerSchoolId: number,
                firstName: string,
                lastName: string,
                brithdate: Date | null,
                grade: number,
                gender: string | null
        ) {
                this.id = id;
                this.schoolId = schoolId;
                this.linkCode = linkCode;
                this.powerSchoolId = powerSchoolId;
                this.firstName = firstName;
                this.lastName = lastName;
                this.birthdate = brithdate;
                this.grade = grade;
                this.gender = gender;
        }
}

export class PointGroup {
        id: number;
        name: string;
        parentGroup: number | null;
        childGroups: PointGroup[] | null;
        ranked: boolean;
        color: string;

        constructor(
                id: number,
                name: string,
                parentGroup: number | null = null,
                childGroups: PointGroup[] | null = null,
                ranked: boolean,
                color: string
        ) {
                this.id = id;
                this.name = name;
                this.parentGroup = parentGroup;
                this.childGroups = childGroups;
                this.ranked = ranked;
                this.color = color;
        }
}

export class PhoenixUser {
        id: number;
        createdAt: Date;
        firstName: string | null;
        lastName: string | null;
        adminId: number | null;
        studentId: number | null;
        supabaseId: string;
        linkedAdmins: Admin[] | null;
        linkedTeachers: Teacher[] | null;
        linkedStudents: Student[] | null;

        constructor(
                id: number,
                createdAt: Date,
                firstName: string | null,
                lastName: string | null,
                adminId: number | null,
                studentId: number | null,
                supabaseId: string,
                linkedAdmin: Admin[] | null = null,
                linkedTeacher: Teacher[] | null = null,
                linkedStudent: Student[] | null = null
        ) {
                this.id = id;
                this.createdAt = createdAt;
                this.firstName = firstName;
                this.lastName = lastName;
                this.adminId = adminId;
                this.studentId = studentId;
                this.supabaseId = supabaseId;
                this.linkedAdmins = linkedAdmin;
                this.linkedTeachers = linkedTeacher;
                this.linkedStudents = linkedStudent;
        }
}

export class Admin {
        id: number;
        createdAt: Date;
        phoenixUser: PhoenixUser;

        constructor(
                id: number,
                createdAt: Date,
                phoenixUser: PhoenixUser
        ) {
                this.id = id;
                this.createdAt = createdAt;
                this.phoenixUser = phoenixUser;
        }
}

export class AdminSchoolPair {
        adminId: number;
        schoolId: number;

        constructor(
                adminId: number,
                schoolId: number
        ) {
                this.adminId = adminId;
                this.schoolId = schoolId;
        }
}

export class Teacher {
        id: number;
        createdAt: Date;
        firstName: string;
        lastName: string;
        linkCode: string;
        linkedUserId: number | null;
        linkedUser: PhoenixUser | null;
        schoolId: number;

        constructor(
                id: number,
                createdAt: Date,
                firstName: string,
                lastName: string,
                linkCode: string,
                linkedUserId: number | null,
                linkedUser: PhoenixUser | null,
                schoolId: number
        ) {
                this.id = id;
                this.createdAt = createdAt;
                this.firstName = firstName;
                this.lastName = lastName;
                this.linkCode = linkCode;
                this.linkedUserId = linkedUserId;
                this.linkedUser = linkedUser;
                this.schoolId = schoolId;
        }
}

export class RankingGroup {
        id: number;
        name: string;
        groups: StudentGroup[];

        constructor(
                id: number,
                name: string,
                groups: StudentGroup[]
        ) {
                this.id = id;
                this.name = name;
                this.groups = groups;
        }
}

export class ClassConfigurationData {
        templates: TemplateConfigurationResponse[];
        pointGroups: Database['public']['Tables']['point_group']['Row'][];
        templateTypes: Database['public']['Tables']['point_template_type']['Row'][];
        conversionRuleTypes: Database['public']['Tables']['point_conversion_rule_type']['Row'][]

        constructor(
                templates: TemplateConfigurationResponse[],
                pointGroups: Database['public']['Tables']['point_group']['Row'][],
                templateTypes: Database['public']['Tables']['point_template_type']['Row'][],
                conversionRuleTypes: Database['public']['Tables']['point_conversion_rule_type']['Row'][]
        ) {
                this.templates = templates;
                this.pointGroups = pointGroups;
                this.templateTypes = templateTypes;
                this.conversionRuleTypes = conversionRuleTypes;
        }
}

export class TemplateConfigurationResponse {
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

        constructor(
                id: number,
                name: string,
                templateType: string,
                pointGroup: {
                        id: number;
                        name: string;
                        color: string;
                },
                conversionRuleType: string,
                conversionRuleValue: number,
                conversionRuleTarget: number,
                conversionRuleFormula: string
        ) {
                this.id = id;
                this.name = name;
                this.templateType = templateType;
                this.pointGroup = pointGroup;
                this.conversionRuleType = conversionRuleType;
                this.conversionRuleValue = conversionRuleValue;
                this.conversionRuleTarget = conversionRuleTarget;
                this.conversionRuleFormula = conversionRuleFormula
        }
}

export type NewScorebookData = {
        pointTemplates: {
                id: number,
                name: string
        }[],
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
        template: {
                id: number,
                name: string,
                conversionRuleType: string,
                conversionRuleValue: number,
                conversionRuleTarget: number,
                pointGroup: {
                        id: number,
                        name: string,
                        color: string
                }
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

export class ScorebookData {
        pointTemplates: Database['public']['Tables']['point_template']['Row'][];
        pointEvents: ScorebookPointEvent[];
        students: Array<Database['public']['Tables']['student']['Row'] | null>;
        studentGroup: Database['public']['Tables']['student_group']['Row'];
        pointGroups: Database['public']['Tables']['point_group']['Row'][] | null;

        constructor(
                pointTemplates: Database['public']['Tables']['point_template']['Row'][],
                pointEvents: ScorebookPointEvent[],
                students: Array<Database['public']['Tables']['student']['Row'] | null>,
                studentGroup: Database['public']['Tables']['student_group']['Row'],
                pointGroups: Database['public']['Tables']['point_group']['Row'][] | null = null
        ) {
                this.pointTemplates = pointTemplates;
                this.pointEvents = pointEvents;
                this.students = students;
                this.studentGroup = studentGroup;
                this.pointGroups = pointGroups;
        }
}

export class ScorebookPointEvent {
        id: number;
        date: string | null;
        name: string | null;
        student_group_id: number;
        template_id: number;
        maxInput: number | null;
        linkedTemplateData: {
                id: number | undefined;
                name: string | undefined;
                conversionRuleType: Database['public']['Tables']['point_conversion_rule_type']['Row'] | null;
                pointGroup: Database['public']['Tables']['point_group']['Row'] | null;
                conversionRuleValue: number | null;
                conversionRuleTarget: number | null;
        };
        studentPoints: {
                studentData: Database['public']['Tables']['student']['Row'];
                pointData: Database['public']['Tables']['student_point']['Row']
        }[] | null;

        constructor(
                id: number,
                date: string | null,
                name: string | null,
                student_group_id: number,
                template_id: number,
                maxInput: number | null,
                linkedTemplateData: {
                        id: number | undefined;
                        name: string | undefined;
                        conversionRuleType: Database['public']['Tables']['point_conversion_rule_type']['Row'] | null;
                        pointGroup: Database['public']['Tables']['point_group']['Row'] | null;
                        conversionRuleValue: number | null;
                        conversionRuleTarget: number | null;
                },
                studentPoints: {
                        studentData: Database['public']['Tables']['student']['Row'];
                        pointData: Database['public']['Tables']['student_point']['Row']
                }[] | null = null,
        ) {
                this.id = id;
                this.name = name;
                this.date = date;
                this.student_group_id = student_group_id;
                this.template_id = template_id;
                this.maxInput = maxInput;
                this.linkedTemplateData = linkedTemplateData;
                this.studentPoints = studentPoints;
        }
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


export type StudentRankData =
        {
                points: {
                        value: number;
                        date: string;
                        pointEvent: {
                                id: number;
                                name: string;
                                date: string;
                                maxInput: number;
                                studentGroup: {
                                        id: number;
                                        name: string;
                                }
                                pointTemplate: {
                                        id: number;
                                        name: string;
                                        pointGroup: {
                                                id: number;
                                                name: string;
                                                color: string;
                                        };
                                        pointConversionRule: {
                                                pointConversionRuleType: {
                                                        id: number;
                                                        name: string;
                                                };
                                                ruleValue: number;
                                        };
                                }
                        }
                }[]
                ranks: {
                        totalPoints: number;
                        totalRank: number;
                        pointGroupRanks: {
                                pointGroup: {
                                        id: number;
                                        name: string;
                                        color: string;
                                }
                                totalPoints: number;
                                rank: number;
                        }[];
                        studentGroupRanks: {
                                studentGroup: {
                                        id: number;
                                        name: string;
                                }
                                totalPoints: number;
                                rank: number;
                        }[];
                        gradeRank: {
                                grade: number;
                                rank: number;
                        };
                }
        }

export type AdminDashboardData = {
        school: {
                id: number,
                name: string
        },
        teachers: {
                id: number,
                name: string
        }[],
        students: {
                id: number,
                name: string,
                grade: number,
                totalPoints: number
        }[],
        studentGroups: {
                id: number,
                name: string,
                parentId: number | null,
                pointEvents: {
                        id: number,
                        pointGroupId: number,
                        name: string,
                        date: string,
                        studentPoints: {
                                studentId: number,
                                value: number,
                                input: number
                        }[]
                }[]
        }[],
        pointGroups: {
                id: number,
                name: string,
                color: string
        }[],
        rankingGroups: {
                id: number,
                name: string
        }[]
}

export type AdminStudentDashboardData = {
        student: {
                id: number,
                name: string,
                grade: number,
                totalPoints: number,
                rank: number,
                outOf: number,
                rankByPointGroup: {
                        groupId: number,
                        name: string,
                        color: string,
                        points: number,
                        rank: number,
                        outOf: number
                }[],
                rankByGrade: {
                        grade: number,
                        rank: number,
                        outOf: number
                },
                rankByRankingGroup: {
                        groupId: number,
                        name: string,
                        rank: number,
                        outOf: number
                }[]
        },
        pointEvents: {
                id: number,
                name: string,
                date: string,
                pointGroup: {
                        id: number,
                        name: string,
                        color: string
                },
                pointTemplate: {
                        id: number,
                        name: string,
                        conversionRuleType: {
                                id: number,
                                name: string
                        },
                        conversionRuleValue: number
                },
                maxInput: number,
                pointsEarned: {
                        input: number,
                        value: number
                }
        }[],
}

export type FeaturedDashboardData =
        {
                timeframes: {
                        id: number,
                        name: string,
                        startsAt: string,
                        endsAt: string,
                        active: boolean
                }[],
                totalPoints: number,
                totalPointsByGroup: {
                        id: number,
                        name: string,
                        color: string,
                        points: number
                }[]
                topOverall: {
                        id: number;
                        firstName: string;
                        lastName: string;
                        totalPoints: number;
                        grade: number;
                        byPointGroup: {
                                id: number;
                                name: string;
                                color: string;
                                totalPoints: number;
                        }[];
                }[];
                topByPointGroup: {
                        id: number;
                        name: string;
                        color: string;
                        students: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                grade: number;
                                byPointGroup: {
                                        id: number;
                                        name: string;
                                        color: string;
                                        totalPoints: number;
                                }[];
                        }[];
                }[];
                topByGrade: {
                        grade: number;
                        students: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                grade: number;
                                byPointGroup: {
                                        id: number;
                                        name: string;
                                        color: string;
                                        totalPoints: number;
                                }[];
                        }[];
                        byPointGroup: {
                                id: number;
                                name: string;
                                color: string;
                                students: {
                                        id: number;
                                        firstName: string;
                                        lastName: string;
                                        totalPoints: number;
                                        grade: number;
                                        byPointGroup: {
                                                id: number;
                                                name: string;
                                                color: string;
                                                totalPoints: number;
                                        }[];
                                }[];
                        }[];
                }[];
                studentGroups: {
                        id: number;
                        name: string;
                        students: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                grade: number;
                                byPointGroup: {
                                        id: number;
                                        name: string;
                                        color: string;
                                        totalPoints: number;
                                }[];
                        }[];
                        rankingGroups: {
                                id: number,
                                name: string
                        }[];
                }[]
        }

export type MobileDashboardData =
        {
                schoolData: {
                        id: number;
                        name: string;
                };
                topStudents: {
                        topOverall: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                        }[];
                        byGrade: {
                                grade: number;
                                topStudents: {
                                        id: number;
                                        firstName: string;
                                        lastName: string;
                                        totalPoints: number;
                                }[];
                        }[];
                        studentData: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                grade: number;
                                rank: number;
                        } | null;
                };
                rankingGroups: {
                        id: number;
                        name: string;
                        topGroups: {
                                id: number;
                                name: string;
                                totalPoints: number;
                        }[];
                        studentGroup: {
                                id: number;
                                name: string;
                                totalPoints: number;
                        } | null;
                }[];
        }

export type GlobalDashboardData =
        {
                schoolData: {
                        id: number;
                        name: string;
                };
                totals: {
                        allTime: TimedTotalPointData;
                        thisMonth: TimedTotalPointData;
                        thisWeek: TimedTotalPointData;
                        today: TimedTotalPointData;
                };
                rankingGroups: {
                        id: number;
                        name: string;
                        studentGroups: {
                                id: number;
                                name: string;
                                averagePoints: number;
                                groupPoints: number;
                                students: {
                                        id: number;
                                        firstName: string;
                                        lastName: string;
                                        totalPoints: number;
                                }[];
                        }[];
                }[];
                topStudents: {
                        topOverall: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                        }[];
                        topTrending: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                lastWeekTotalPoints: number;
                        }[];
                        topImproved: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                lastWeekTotalPoints: number;
                                percentAboveAverage: number;
                        }[];
                        topByPointGroup: {
                                id: number;
                                name: string;
                                color: string;
                                topStudents: {
                                        id: number;
                                        firstName: string;
                                        lastName: string;
                                        totalPoints: number;
                                }[];
                        }[];
                        topByGrade: {
                                grade: number;
                                topStudents: {
                                        id: number;
                                        firstName: string;
                                        lastName: string;
                                        totalPoints: number;
                                }[];
                        }[];
                        studentData: {
                                id: number;
                                firstName: string;
                                lastName: string;
                                totalPoints: number;
                                grade: number;
                                rank: number;
                        } | null;
                };
                pointEvents: {
                        id: number;
                        name: string;
                        date: string;
                        pointGroup: {
                                id: number;
                                name: string;
                                color: string;
                        };
                        pointTemplate: {
                                id: number;
                                conversionRuleValue: number;
                                conversionRuleType: {
                                        id: number;
                                        name: string;
                                }
                        }
                        maxInput: number;
                }[]
        }

export type TimedTotalPointData = {
        totalPoints: number;
        totalPointsByPointGroup: {
                id: number;
                name: string;
                totalPoints: number;
                color: string;
        }[];
        totalPointsByStudentGroup: {
                id: number;
                name: string;
                totalPoints: number;
                totalStudents: number;
        }[];
}

export const rankToColor = (rank: number) => {
        if (rank === 1) {
                return Color("#FFD700");
        } else if (rank === 2) {
                return Color("#C0C0C0");
        } else if (rank === 3) {
                return Color("#CD7F32");
        } else if (rank === 4) {
                return Color("#800080");
        } else if (rank === 5) {
                return Color("#008080");
        } else if (rank <= 10) {
                return Color("#DC143C");
        } else if (rank <= 20) {
                return Color("#40D13B")
        } else {
                return Color("#FFFFFF");
        }
}

export const rankToBackgroundColor = (rank: number) => {
        if (rank > 20) {
                return Color("#000000")
        } else {
                return rankToColor(rank)
        }
}

export const rankToTextGradient = (rank: number) => {
        if (rank === 1) {
                `from-`
        } else if (rank === 2) {
        } else if (rank === 3) {
        } else if (rank === 4) {
        } else if (rank === 5) {
        } else if (rank <= 10) {
        } else if (rank <= 20) {
        } else {
        }
}

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
}

export type RankingGroupData = {
        id: number;
        name: string;
        studentGroups: {
                id: number;
                name: string;
        }[];
}

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

export type SchoolTimeframe = {
        id: number,
        createdAt: string,
        startsAt: string,
        endsAt: string,
        name: string,
        active: boolean
}

export const customMetalStyle = (colorOverlay: string) => ({
        backgroundImage: metalTextStyle(colorOverlay),
        backgroundSize: 'cover',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        //WebkitTextStroke: 'thin ' + Color(colorOverlay).lighten(0.75).alpha(0.5).toString()
})

export const metalTextStyle = (colorOverlay: string): string => `
                    linear-gradient(180deg,
                    ${Color(colorOverlay).lighten(0.75).alpha(0.75).rgb()},
                    ${Color(colorOverlay).lighten(0.75).alpha(0.75).rgb()}),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`

export const metalStyle = (colorOverlay: string): string => `
                    linear-gradient(180deg,
                    ${Color(colorOverlay).darken(0.75).alpha(0.75).rgb()},
                    ${Color(colorOverlay).darken(0.75).alpha(0.75).rgb()}),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`


export const brightMetalStyle = (colorOverlay: string): string => `
                    linear-gradient(180deg,
                    ${Color(colorOverlay).lighten(0.25).alpha(0.33).rgb()},
                    ${Color(colorOverlay).lighten(0.25).alpha(0.33).rgb()}),
                    url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`

export const metalStyleGradient = (colors: { color: string, percent: number }[]): string => {
        let gradient = 'linear-gradient(90deg,';
        for (let i = 0; i < colors.length; i++) {
                gradient += `${Color(colors[i].color).darken(0.75).alpha(0.75).rgb()} ${colors[i].percent}%`
                if (i < colors.length - 1) {
                        gradient += ','
                }
        }
        gradient += `),url('https://cdn.midjourney.com/4e5b065b-2f7d-4141-a869-b14aebbc3b5b/0_0.png')`
        return gradient;
}

export const backgroundGradient = (colors: { color: string, percent: number }[]): string => {
        let gradient = 'linear-gradient(90deg,';
        for (let i = 0; i < colors.length; i++) {
                gradient += `${Color(colors[i].color).rgb()} ${colors[i].percent}%`
                if (i < colors.length - 1) {
                        gradient += ','
                }
        }
        gradient += `)`
        return gradient;
}

export const metalTextShadow = `1px 1px 2px rgba(0, 0, 0, 1),
-1px -1px 2px rgba(255, 255, 255, 0.2),
2px 2px 4px rgba(0, 0, 0, 1),
-2px -2px 4px rgba(255, 255, 255, 0.3)`

export const numberToOrdinal = (n: number) => {
        if (n === 0) return "0";
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
