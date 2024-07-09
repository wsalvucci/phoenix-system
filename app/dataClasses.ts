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
    linkCode: string;
    powerSchoolId: number;
    firstName: string;
    lastName: string;
    birthdate: Date | null;
    grade: number;
    gender: string | null;

    constructor(
        id: number,
        linkCode: string,
        powerSchoolId: number,
        firstName: string,
        lastName: string,
        brithdate: Date | null,
        grade: number,
        gender: string | null
    ) {
        this.id = id;
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

export class PointTemplate {
    id: number;
    createdAt: Date;
    name: string;
    conversionRule: ConversionRule;
    templateType: TemplateType;
    pointGroup: PointGroup;
    studentGroup: StudentGroup;

    constructor(
        id: number,
        createdAt: Date,
        name: string,
        conversionRule: ConversionRule,
        templateType: TemplateType,
        pointGroup: PointGroup,
        studentGroup: StudentGroup
    ) {
        this.id = id;
        this.createdAt = createdAt;
        this.name = name;
        this.conversionRule = conversionRule;
        this.templateType = templateType;
        this.pointGroup = pointGroup;
        this.studentGroup = studentGroup;
    }
}

export class ConversionRule {
    id: number;
    createdAt: Date;
    name: string;
    value: number | null;
    formula: string | null;
    type: ConversionRuleType;

    constructor(
        id: number,
        createdAt: Date,
        name: string,
        value: number | null,
        formula: string | null,
        type: ConversionRuleType
    ) {
        this.id = id;
        this.createdAt = createdAt;
        this.name = name;
        this.value = value;
        this.formula = formula;
        this.type = type;
    }
}

export class TemplateType {
    id: number;
    createdAt: Date;
    name: string;

    constructor(
        id: number,
        createdAt: Date,
        name: string
    ) {
        this.id = id;
        this.createdAt = createdAt;
        this.name = name;
    }
}

export class ConversionRuleType {
    id: number;
    createdAt: Date;
    name: string;

    constructor(
        id: number,
        createdAt: Date,
        name: string
    ) {
        this.id = id;
        this.createdAt = createdAt;
        this.name = name;
    }
}