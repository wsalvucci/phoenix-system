"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { PhoenixUser } from "@/types/domain";
import { createClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";

export async function getSupabaseUser() : Promise<User | null> {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError !== null) {
        console.error("Error fetching supabase user:", userError);
        return null;
    }

    return userData.user;
}

export async function getPhoenixUser() : Promise<PhoenixUser | null> {
    const supabaseUser = await getSupabaseUser();

    if (supabaseUser === null) {
        return null;
    }

    const supabase = await supabaseServiceClient();
    const { data: phoenixUserData, error: phoenixUserDataError } = await supabase
        .from('user')
        .select('*')
        .eq('supabase_id', supabaseUser.id)
        .single();

    if (phoenixUserDataError !== null) {
        console.error("Error fetching phoenix user:", phoenixUserDataError);
        return null;
    }

    return {
        id: phoenixUserData.id,
        adminId: phoenixUserData.admin_id,
        teacherId: phoenixUserData.teacher_id,
        studentId: phoenixUserData.student_id,
    };
}