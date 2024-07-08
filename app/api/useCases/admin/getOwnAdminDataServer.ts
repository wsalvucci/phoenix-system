import { Admin } from "@/app/dataClasses";
import supabaseClient from "../../supabaseServer";
import { createClient } from "@/utils/supabase/server";

export default async function getOwnAdminData(): Promise<Admin | null> {
    const supabase = createClient();
    const { data: adminData, error: adminError } = await supabase.rpc('get_own_admin_data').maybeSingle();
    if (adminError) {
        console.error(adminError);
        return null;
    }

    if (adminData === null) return null

    return new Admin(
        adminData.id,
        new Date(adminData.created_at)
    )
}