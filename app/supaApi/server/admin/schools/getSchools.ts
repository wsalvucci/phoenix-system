"use server";
import { Database } from "@/types/supabase";
import getAdmin from "@/app/supaApi/server/admin/getAdmin";
import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "./getAdminSchoolPairs";

export default async function getSchools(): Promise<Database['public']['Tables']['school']['Row'][] | null> {
    const adminSchoolPairs = await getAdminSchoolPairs();

    if (adminSchoolPairs === null) return null;

    const schoolIds = adminSchoolPairs.map(pair => pair.school_id);

    const supabase = await supabaseServiceClient();

    const { data: schools, error: schoolsError } = await supabase.from("school").select("*").in("id", schoolIds);

    if (schoolsError) {
        console.error(schoolsError);
        return null;
    }

    if (schools === null) return null;

    return schools;
}