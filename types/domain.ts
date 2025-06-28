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