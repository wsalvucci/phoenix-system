import AuthButton from "../components/AuthButton";
import { createClient } from "@/utils/supabase/server";
import InstallPrompt from "./components/InstallPrompt";
import Link from "next/link";
import HomeRoles from "@/components/home/HomeRoles";

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

  // Signed-in users get their role destinations; signed-out visitors get sign-in.
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

          {isSignedIn ? (
            <section className="surface p-5 sm:p-6" aria-labelledby="destinations-heading">
              <h2 id="destinations-heading" className="mb-5 text-xl font-semibold">Where would you like to go?</h2>
              <HomeRoles />
            </section>
          ) : (
            <section className="surface p-5 sm:p-6" aria-labelledby="welcome-heading">
              <h2 id="welcome-heading" className="text-xl font-semibold">Have you used Phoenix before?</h2>
              <div className="mt-5 flex flex-col gap-3">
                <Link href="/login" className="button-primary min-h-[44px]">Sign in</Link>
                <Link href="/login" className="inline-flex min-h-[44px] items-center justify-center text-sm underline">Create an account</Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
