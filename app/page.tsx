import AuthButton from "../components/AuthButton";
import { createClient } from "@/utils/supabase/server";
import LinkTeacher from "./components/LinkTeacher";
import LinkStudent from "./components/LinkStudent";
import AdminPortal from "./components/AdminPortal";
import getOwnAdminData from "./supaApi/client/admin/getOwnAdminData";
import { getOwnStudentData } from "./supaApi/server/student/studentApi";
import getOwnTeacherData from "./supaApi/server/teacher/getOwnTeacherData";
import InstallPrompt from "./components/InstallPrompt";
import DashboardButton from "./components/DashboardButton";
import ParentButton from "./components/ParentButton";

export default async function Index() {
  const canInitSupabaseClient = () => {
    // This function is just for the interactive tutorial.
    // Feel free to remove it once you have Supabase connected.
    try {
      createClient();
      return true;
    } catch (e) {
      return false;
    }
  };

  const isSupabaseConnected = canInitSupabaseClient();

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  let adminData = null;
  let teacherData = null;
  let studentData = null;

  if (userData.user !== null) {
    adminData = await getOwnAdminData();
    teacherData = await getOwnTeacherData();
    studentData = await getOwnStudentData();
  }

  console.log(userData)

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
          <div>
            PHOENIX
          </div>
          {isSupabaseConnected && <AuthButton />}
        </div>
      </nav>

      <InstallPrompt />

      <div className="animate-in flex-1 flex flex-col opacity-0 max-w-4xl px-3">
        <div className="font-bold text-left sm:text-xl md:text-4xl">
          WELCOME TO
        </div>
        <div className="text-left max-sm:text-5xl md:text-9xl">
          PHOENIX
        </div>

        {userData.user !== null && adminData != null && <AdminPortal user={adminData} />}
        {userData.user !== null && <LinkTeacher user={teacherData} />}
        {userData.user !== null && <LinkStudent user={studentData} />}
        {userData.user !== null && <DashboardButton />}
        {userData.user !== null && <ParentButton />}
      </div>
    </div>
  );
}
