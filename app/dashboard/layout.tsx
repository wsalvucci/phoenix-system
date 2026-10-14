import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCallerAccess } from "@/app/supaApi/server/staffAccess";
import { safeNextPath } from "@/lib/safeRedirect";

// Every route under /dashboard requires an authenticated staff (teacher/admin) user.
// This gate is for navigation only; the server actions behind these pages enforce
// the same rule independently (see staffAccess.ts) because they are directly POST-able.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Return to the requested screen after sign-in (same-origin paths only).
        const next = safeNextPath(headers().get("x-next-path"), "/dashboard");
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) redirect("/");

    return <>{children}</>;
}
