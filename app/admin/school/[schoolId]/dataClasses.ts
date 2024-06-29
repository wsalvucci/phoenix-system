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
    brithdate: Date;
    grade: number;
    gender: string;

    constructor(
        id: number,
        linkCode: string,
        powerSchoolId: number,
        firstName: string,
        lastName: string,
        brithdate: Date,
        grade: number,
        gender: string
    ) {
        this.id = id;
        this.linkCode = linkCode;
        this.powerSchoolId = powerSchoolId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.brithdate = brithdate;
        this.grade = grade;
        this.gender = gender;
    }
}

export class Group {
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

export class Teacher {
    id: number;
    firstName: string;
    lastName: string;

    constructor(
        id: number,
        firstName: string,
        lastName: string
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
    }
}

export class GroupData {
    id: number;
    name: string;
    parentGroup: number | null;
    childGroups: GroupData[] | null;
    teachers: Teacher[] | null;
    students: Student[] | null;

    constructor(
        id: number,
        name: string,
        parentGroup: number | null = null,
        childGroups: GroupData[] | null = null,
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