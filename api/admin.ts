"use server";
import { Admin, AdminHomeDashboard, School } from "@/types/domain";
import { getPhoenixUser, getSupabaseUser } from "./user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";

export async function getOwnAdminData() : Promise<Admin | null> {
    const phoenixUser = await getPhoenixUser();

    if (phoenixUser === null) {
        return null;
    }

    if (phoenixUser.adminId === null) {
        return null;
    }

    const supabase = await supabaseServiceClient();
    const { data: adminData, error: adminDataError } = await supabase
        .from('admin')
        .select('*')
        .eq('id', phoenixUser.adminId)
        .single();

    if (adminDataError !== null) {
        console.error("Error fetching admin data:", adminDataError);
        return null;
    }

    return {
        id: adminData.id,
    };
}

export async function getAdminSchools() : Promise<School[]> {
    const adminUser = await getOwnAdminData()

    if (adminUser === null) {
        return []
    }

    const supabase = await supabaseServiceClient();
    const { data: adminSchoolData, error: adminSchoolDataError } = await supabase
        .from('admin_school_pair')
        .select('*, school (*)')
        .eq('admin_id', adminUser.id)

    if (adminSchoolDataError !== null) {
        console.error("Error fetching admin schools:", adminSchoolDataError)
        return []
    }

    return adminSchoolData?.map(pair => ({
        id: pair.school_id,
        name: pair.school?.name ?? ""
    }))
}

export async function getAdminHomeDashboard() : Promise<AdminHomeDashboard> {
    console.log("===Getting Admin Dash===")
    const user = await getSupabaseUser()
    
    if (!user) {
        throw new Error("Error getting admin home dashboard data (No user).")
    }

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase
        .from('user')
        .select('*, admin (*, admin_school_pair (*, school (*)))')
        .eq('supabase_id', user.id)
        .single()
        
    if (error) {
        throw new Error("Error fetching admin home dashboard data", {cause: error})
    }

    console.log(data)

    return {
        id: data.admin_id ?? -1,
        schools: data.admin?.admin_school_pair.map(pair => ({
            id: pair.school_id,
            name: pair.school?.name ?? ""
        })) ?? []
    }
}