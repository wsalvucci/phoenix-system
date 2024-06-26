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