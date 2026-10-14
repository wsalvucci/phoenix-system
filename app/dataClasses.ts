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
                },
                maxInput: number,
                pointsEarned: {
                        input: number,
                        value: number
                },
                rank: number,
                outOf: number
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

