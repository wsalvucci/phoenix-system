import { PhoenixUser } from "@/app/dataClasses";
import supabaseClient from "../supabaseServer";
import { createClient } from "@/utils/supabase/server";

export default async function getOwnUserDataServer(): Promise<PhoenixUser | null> {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.rpc('get_user_data').maybeSingle();
    if (userError) {
        console.error(userError);
        return null;
    }

    if (userData === null) return null

    return new PhoenixUser(
        userData.id,
        new Date(userData.created_at),
        userData.first_name,
        userData.last_name,
        userData.admin_id,
        userData.teacher_id,
        userData.student_id,
        userData.supabase_id
    )
}