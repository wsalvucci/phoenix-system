"use server";
import { Database } from "@/types/supabase";
import getAdmin from "../getAdmin";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getAdminSchoolPairs(): Promise<Database['public']['Tables']['admin_school_pair']['Row'][] | null> {
    const adminData = await getAdmin();

    if (!adminData) return null;

    const supabase = await supabaseServiceClient();

    const { data: adminSchoolPairs, error: adminSchoolPairsError } = await supabase.from("admin_school_pair").select("*").eq("admin_id", adminData.id);

    if (adminSchoolPairsError) {
        console.error(adminSchoolPairsError);
        return null;
    }

    if (adminSchoolPairs === null) return null;

    return adminSchoolPairs;
}