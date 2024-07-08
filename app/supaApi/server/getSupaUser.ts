"use server";
import { createClient } from "@/utils/supabase/server"
import { User } from "@supabase/supabase-js";

export default async function getSupaUser(): Promise<User | null> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    return userData.user;
}