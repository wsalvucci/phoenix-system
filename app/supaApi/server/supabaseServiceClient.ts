// Service-role client: bypasses RLS entirely.
//
// Deliberately NOT a "use server" module. With that directive the default export was a server action:
// a POST-able endpoint that hands back a privileged client. Server code imports this as a plain
// function, and every caller must authorize the session itself before querying.
// SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so Next never inlines it into a client bundle.
// The guard below makes an accidental client import fail loudly instead of quietly.
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

export default async function supabaseServiceClient() {
    if (typeof window !== "undefined") {
        throw new Error("supabaseServiceClient is server-only");
    }
    return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
