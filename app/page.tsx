import AuthButton from "../components/AuthButton";
import { createClient } from "@/utils/supabase/server";
import LinkTeacher from "./components/LinkTeacher";
import LinkStudent from "./components/LinkStudent";

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

      <div className="animate-in flex-1 flex flex-col opacity-0 max-w-4xl px-3">
        <div className="font-bold text-left sm:text-xl md:text-4xl">
          WELCOME TO
        </div>
        <div className="text-left max-sm:text-5xl md:text-9xl">
          PHOENIX
        </div>

        {userData.user != null && <LinkTeacher user={userData.user} />}
        {userData.user !== null && <LinkStudent user={userData.user} />}
      </div>

      <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by{" "}
          <a
            href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
        </p>
      </footer>
    </div>
  );
}
