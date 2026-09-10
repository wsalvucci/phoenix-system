import AuthButton from "../components/AuthButton";
import { createClient } from "@/utils/supabase/server";
import InstallPrompt from "./components/InstallPrompt";
import StudentChip from "@/components/home/StudentChip";
import AdminChip from "@/components/home/AdminChip";
import TeacherChip from "@/components/home/TeacherChip";

export default async function Index() {
  const canInitSupabaseClient = () => {
    // This function is just for the interactive tutorial.
    // Feel free to remove it once you have Supabase connected.
    try {
      createClient();
      return true;
    } catch {
      return false;
    }
  };

  const isSupabaseConnected = canInitSupabaseClient();

  // Needed so StudentChip can offer the account-link prompt to signed-in
  // users who have no student linked yet, but not to signed-out visitors.
  let isSignedIn = false;
  if (isSupabaseConnected) {
    const { data: { user } } = await createClient().auth.getUser();
    isSignedIn = !!user;
  }

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
        <div className="text-left sm:text-5xl md:text-8xl">
          PHOENIX
        </div>

        <div className="flex flex-col gap-4">
          <StudentChip isSignedIn={isSignedIn} />
          <AdminChip />
          <TeacherChip />
        </div>
      </div>
    </div>
  );
}
