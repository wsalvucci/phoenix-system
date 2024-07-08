import { Admin } from "@/app/dataClasses";
import getAdmin from "@/app/supaApi/server/admin/getAdmin";
import getOwnUserData from "@/app/supaApi/server/getOwnUserData";
import { adminResponseToData } from "../../mappers/dataMappers";

export default async function getOwnAdminData(): Promise<Admin | null> {
    const adminData = await getAdmin();

    if (!adminData) return null;

    const userData = await getOwnUserData();

    if (!userData) return null;

    return adminResponseToData(adminData, userData);
}