import { School } from "@/app/dataClasses";
import { schoolResponseToData } from "@/app/supaApi/mappers/dataMappers";
import getSchools from "@/app/supaApi/server/admin/schools/getSchools";

export async function getSchoolsAsAdmin(): Promise<School[] | null> {
    const adminData = await getSchools();

    if (!adminData) return null;

    return adminData.map(school =>
        schoolResponseToData(school)
    )
}