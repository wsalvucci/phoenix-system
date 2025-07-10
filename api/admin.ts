"use server";
import { Admin, AdminHomeDashboard, AdminSchoolDash, School } from "@/types/domain";
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

export async function checkAdminSchoolAccess(schoolId: number): Promise<boolean> {
    const user = await getSupabaseUser()

    if (!user) {
        return false
    }

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase
        .from('user')
        .select('*, admin (*, admin_school_pair (*, school (*)))')
        .eq('supabase_id', user.id)
        .eq('admin.admin_school_pair.school_id', schoolId)
        .single()
        
    if (error) {
        throw new Error("Error checking admin school access", {cause: error})
    }

    return data !== null
}

export async function getAdminSchoolDash(schoolId: number) : Promise<AdminSchoolDash> {
    const access = await checkAdminSchoolAccess(schoolId)
    if (!access) {
        throw new Error("Error getting admin school dashboard data (No access).")
    }

    const supabase = await supabaseServiceClient();
    
    // First, get the active timeframe for the school
    const { data: activeTimeframe, error: timeframeError } = await supabase
        .from('school_timeframes')
        .select('*')
        .eq('school_id', schoolId)
        .eq('active', true)
        .single()

    if (timeframeError && timeframeError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error("Error getting active timeframe", {cause: timeframeError})
    }

    // Get the main school data
    const { data: schoolData, error: schoolDataError } = await supabase
        .from('school')
        .select(`
            *,
            student (*),
            student_group (*),
            point_group (*),
            school_timeframes (*)
        `)
        .eq('id', schoolId)
        .single()

    if (schoolDataError) {
        throw new Error("Error getting admin school dashboard data", {cause: schoolDataError})
    }

    // Get filtered point events based on active timeframe
    let pointEventsQuery = supabase
        .from('point_event')
        .select(`
            *,
            student_group!inner(school_id),
            student_point!inner(*)
        `)
        .eq('student_group.school_id', schoolId)

    if (activeTimeframe) {
        pointEventsQuery = pointEventsQuery
            .gte('date', activeTimeframe.starts_at)
            .lte('date', activeTimeframe.ends_at)
    }

    const { data: pointEvents } = await pointEventsQuery

    const studentsWithPoints: {
        [studentId: number]: {
            id: number,
            studentId: number,
            totalPoints: number,
            byEvent: {
                [pointEventId: number]: {
                    points: number,
                    rank: number,
                },
            },
            byPointGroup: {
                [pointGroupId: number]: {
                    points: number,
                },
            },
        }
    } = {}

    pointEvents?.map(pointEvent => {
        pointEvent.student_point
            .sort((a, b) => b.point_value - a.point_value)
            .map((studentPoint, index) => {
                if (studentsWithPoints[studentPoint.student_id] === undefined) {
                    studentsWithPoints[studentPoint.student_id] = {
                        id: studentPoint.student_id,
                        studentId: studentPoint.student_id,
                        totalPoints: 0,
                        byEvent: {},
                        byPointGroup: {},
                    }
                }
                studentsWithPoints[studentPoint.student_id].totalPoints += studentPoint.point_value
                studentsWithPoints[studentPoint.student_id].byEvent[pointEvent.id] = {
                    points: studentPoint.point_value,
                    rank: index + 1,
                }
                studentsWithPoints[studentPoint.student_id].byPointGroup[pointEvent.point_group_id ?? -1] = {
                    points: studentPoint.point_value,
                }
            })
    })

    return {
        school: {
            id: schoolData.id,
            name: schoolData.name,
        },
        students: schoolData.student.map(student => ({
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            grade: student.grade,
            totalPoints: studentsWithPoints[student.id]?.totalPoints ?? 0,
        })),
        studentGroups: schoolData.student_group.map(group => ({
            id: group.id,
            name: group.name,
            parentId: group.parent_id,
        })),
        pointTypes: schoolData.point_group.map(type => ({
            id: type.id,
            name: type.name,
            color: type.color,
        })),
    }
}