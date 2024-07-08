"use server";
import { Database } from "@/types/supabase";
import getSupaUser from "./getSupaUser";
import supabaseServiceClient from "./supabaseServiceClient";

export default async function getOwnUserData(): Promise<Database['public']['Tables']['user']['Row'] | null> {
    const supaUser = await getSupaUser();
    if (!supaUser) return null;

    const supabase = await supabaseServiceClient();

    const { data: phoenixUserData, error: phoenixUserError } = await supabase.from("user").select("*").eq("supabase_id", supaUser.id).single();

    if (phoenixUserError) {
        console.error(phoenixUserError);
        return null;
    }

    if (phoenixUserData === null) return null

    return phoenixUserData;
}