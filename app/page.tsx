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
    <div className="app-page flex flex-1 flex-col">
      <nav className="app-header flex h-16 w-full justify-center">
        <div className="flex w-full max-w-6xl items-center justify-between px-4 text-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 font-bold tracking-[0.18em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg text-white shadow-sm">P</span>
            PHOENIX
          </div>
          {isSupabaseConnected && <AuthButton />}
        </div>
      </nav>

      <InstallPrompt />

      <main className="page-container animate-in flex flex-1 items-center py-12 sm:py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <p className="eyebrow">Student recognition and progress</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl dark:text-white">
              Every point tells a story of progress.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Phoenix gives students, families, teachers, and administrators one place to recognize achievement and follow growth.
            </p>
          </section>

          <section className="surface p-5 sm:p-6" aria-labelledby="destinations-heading">
            <div className="mb-5">
              <h2 id="destinations-heading" className="text-xl font-semibold">Where would you like to go?</h2>
              <p className="page-description">Your available dashboards appear below.</p>
            </div>
            <div className="flex flex-col gap-3">
              <StudentChip isSignedIn={isSignedIn} />
              <TeacherChip />
              <AdminChip />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
