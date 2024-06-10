"use server"

import { createClient } from "@/utils/supabase/server"

const supabase = createClient();

export async function createSchool(name: string, adminId: number) {
    let { data, error } = await supabase
        .rpc('create_school_and_pair_admin', {
            admin_id: adminId,
            school_name: name
        })
    if (error) {
        console.error("Error creating school and pairing admin", error)
        return
    }
    console.log("Successfully created school and updated admin");
}

export async function createClass(adminId: number, schoolId: number, name: string) {
    if (name.length < 3) {
        console.error("Class name too short");
        return
    }

    let { data, error } = await supabase
        .rpc('create_class_for_admin', {
            provided_admin_id: adminId,
            provided_school_id: schoolId,
            provided_class_name: name
        })
    if (error) {
        console.error("Error creating class", error)
        return
    }
    console.log("Successfully created class");
}

export async function createStudent(
    adminId: number,
    schoolId: number,
    powerschoolId: number,
    firstName: string,
    lastName: string,
    grade: number,
    birthday: Date,
    gender: string
) {

    let { data, error } = await supabase
        .rpc('create_student_for_admin', {
            provided_admin_id: adminId,
            provided_school_id: schoolId,
            provided_student_birthdate: birthday,
            provided_student_first_name: firstName,
            provided_student_gender: gender,
            provided_student_grade: grade,
            provided_student_last_name: lastName,
            provided_student_powerschool_id: powerschoolId
        })
    if (error) {
        console.error("Error creating student", error)
        return
    }
    console.log("Successfully created student");

}

export async function createTeacher(
    adminId: number,
    schoolId: number,
    firstName: string,
    lastName: string
) {

    let { data, error } = await supabase
        .rpc('create_teacher_for_admin', {
            provided_admin_id: adminId,
            provided_school_id: schoolId,
            provided_first_name: firstName,
            provided_last_name: lastName
        })
    if (error) {
        console.error("Error creating teacher", error)
        return
    }
    console.log("Successfully created teacher");
}