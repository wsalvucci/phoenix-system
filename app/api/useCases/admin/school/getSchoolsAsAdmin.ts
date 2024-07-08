import supabaseClient from "@/app/api/supabaseClient";
import { School } from "@/app/dataClasses";

export default async function getSchoolsAsAdmin(): Promise<School[] | null> {
    const supabase = supabaseClient;
    const { data: schoolData, error: schoolError } = await supabase.rpc('get_schools_as_admin')

    if (schoolError) {
        console.error(schoolError);
        return null;
    }

    if (schoolData === null) return null

    return schoolData.map((school: any) => {
        return new School(
            school.id,
            school.name
        )
    })
}