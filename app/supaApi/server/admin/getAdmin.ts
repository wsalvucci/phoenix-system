"use server";
import getOwnUserData from "../getOwnUserData";
import supabaseServiceClient from "../supabaseServiceClient";
import { Database } from "@/types/supabase";

export default async function getAdmin(): Promise<Database['public']['Tables']['admin']['Row'] | null> {
    const userData = await getOwnUserData();
    if (!userData) return null;
    if (userData.admin_id === null) return null;

    const supabase = await supabaseServiceClient();

    const { data: adminData, error: adminError } = await supabase.from("admin").select("*").eq("id", userData.admin_id).single();

    if (adminError) {
        console.error(adminError);
        return null;
    }

    if (adminData === null) return null

    return adminData;
}