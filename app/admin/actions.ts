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